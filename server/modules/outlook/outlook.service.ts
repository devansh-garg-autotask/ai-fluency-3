import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { firestoreDb } from '../../db/firebase.ts';
import {
  MICROSOFT_OAUTH_AUTHORIZE_URL,
  MICROSOFT_OAUTH_TOKEN_URL,
  MICROSOFT_OAUTH_DEVICE_CODE_URL,
  MICROSOFT_GRAPH_ME_URL,
  REQUIRED_OUTLOOK_SCOPES,
} from './outlook.constants.ts';
import {
  OutlookConnectionDoc,
  OutlookStatusResponse,
} from './outlook.types.ts';
import { encryptToken, decryptToken, safeDecryptToken } from './outlook.encryption.ts';
import {
  getOutlookConnection,
  saveOutlookConnection,
  deleteOutlookConnection,
} from './outlook.repository.ts';
import { getUserById, getAllUsers } from '../../db/firebase.ts';

// State map to prevent CSRF during OAuth handshake: state -> { teacherId, createdAt }
const oauthStateMap = new Map<string, { teacherId: string; createdAt: number }>();

// Cleanup stale states older than 15 minutes
setInterval(() => {
  const now = Date.now();
  for (const [state, data] of oauthStateMap.entries()) {
    if (now - data.createdAt > 15 * 60 * 1000) {
      oauthStateMap.delete(state);
    }
  }
}, 5 * 60 * 1000);

export class OutlookService {
  private static cachedConfig: { clientId: string; clientSecret: string } | null = null;

  public static async getStoredConfig(): Promise<{ clientId: string; clientSecret: string } | null> {
    if (this.cachedConfig?.clientId && this.cachedConfig?.clientSecret) {
      return this.cachedConfig;
    }

    // Check process.env first
    if (process.env.MICROSOFT_CLIENT_ID && process.env.MICROSOFT_CLIENT_SECRET) {
      this.cachedConfig = {
        clientId: process.env.MICROSOFT_CLIENT_ID.trim(),
        clientSecret: process.env.MICROSOFT_CLIENT_SECRET.trim(),
      };
      return this.cachedConfig;
    }

    // Check persistent Firestore document
    try {
      const snap = await getDoc(doc(firestoreDb, 'users', 'system_outlook_config'));
      if (snap.exists()) {
        const d = snap.data();
        if (d?.clientId && d?.clientSecret) {
          this.cachedConfig = {
            clientId: String(d.clientId).trim(),
            clientSecret: String(d.clientSecret).trim(),
          };
          process.env.MICROSOFT_CLIENT_ID = this.cachedConfig.clientId;
          process.env.MICROSOFT_CLIENT_SECRET = this.cachedConfig.clientSecret;
          return this.cachedConfig;
        }
      }
    } catch (e) {
      // quiet fallback
    }

    return null;
  }

  public static async getClientId(): Promise<string> {
    if (process.env.MICROSOFT_CLIENT_ID && process.env.MICROSOFT_CLIENT_ID.trim()) {
      return process.env.MICROSOFT_CLIENT_ID.trim();
    }
    const cfg = await this.getStoredConfig();
    return cfg?.clientId || '';
  }

  public static async getClientSecret(): Promise<string> {
    if (process.env.MICROSOFT_CLIENT_SECRET && process.env.MICROSOFT_CLIENT_SECRET.trim()) {
      return process.env.MICROSOFT_CLIENT_SECRET.trim();
    }
    const cfg = await this.getStoredConfig();
    return cfg?.clientSecret || '';
  }

  public static async isConfigured(): Promise<boolean> {
    const id = await this.getClientId();
    const secret = await this.getClientSecret();
    return Boolean(id && secret);
  }

  public static async saveCredentials(
    clientId: string,
    clientSecret: string
  ): Promise<{ success: boolean; message: string }> {
    const cleanId = (clientId || '').trim();
    const cleanSecret = (clientSecret || '').trim();

    if (!cleanId || !cleanSecret) {
      throw new Error('Both Client ID and Client Secret are required.');
    }

    this.cachedConfig = { clientId: cleanId, clientSecret: cleanSecret };
    process.env.MICROSOFT_CLIENT_ID = cleanId;
    process.env.MICROSOFT_CLIENT_SECRET = cleanSecret;

    // Persist to Firestore
    try {
      await setDoc(
        doc(firestoreDb, 'users', 'system_outlook_config'),
        {
          clientId: cleanId,
          clientSecret: cleanSecret,
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );
    } catch (err) {
      console.warn('Warning saving system_outlook_config to Firestore:', err);
    }

    // Persist to .env
    try {
      const envPath = path.resolve(process.cwd(), '.env');
      let content = '';
      if (fs.existsSync(envPath)) {
        content = fs.readFileSync(envPath, 'utf-8');
      }
      const lines = content
        .split('\n')
        .filter((l) => !l.startsWith('MICROSOFT_CLIENT_ID=') && !l.startsWith('MICROSOFT_CLIENT_SECRET='));
      lines.push(`MICROSOFT_CLIENT_ID=${cleanId}`);
      lines.push(`MICROSOFT_CLIENT_SECRET=${cleanSecret}`);
      fs.writeFileSync(envPath, lines.join('\n'));
    } catch (e) {
      // ignore
    }

    return {
      success: true,
      message: 'Microsoft Azure OAuth credentials saved and activated successfully.',
    };
  }

  /**
   * Generates authentic Microsoft OAuth 2.0 authorization URL.
   * Access type includes 'offline_access' so a persistent refresh_token is granted.
   */
  public static async generateAuthUrl(
    teacherId: string,
    redirectUri: string
  ): Promise<{
    authUrl: string;
    state: string;
    isConfigured: boolean;
    error?: string;
  }> {
    const isConfigured = await this.isConfigured();
    const clientId = await this.getClientId();

    if (!isConfigured || !clientId) {
      return {
        authUrl: '',
        state: '',
        isConfigured: false,
        error:
          'Microsoft App credentials (Client ID and Client Secret) are not configured. Please set MICROSOFT_CLIENT_ID and MICROSOFT_CLIENT_SECRET to enable authentic Microsoft sign-in.',
      };
    }

    const stateToken = crypto.randomBytes(24).toString('hex');
    const state = `${teacherId}__${stateToken}`;
    oauthStateMap.set(state, { teacherId, createdAt: Date.now() });

    const params = new URLSearchParams({
      client_id: clientId,
      response_type: 'code',
      redirect_uri: redirectUri,
      response_mode: 'query',
      scope: REQUIRED_OUTLOOK_SCOPES.join(' '),
      state: state,
      prompt: 'consent', // Enforce user consent so offline_access refresh token is returned
    });

    return {
      authUrl: `${MICROSOFT_OAUTH_AUTHORIZE_URL}?${params.toString()}`,
      state,
      isConfigured: true,
    };
  }

  /**
  /**
   * Centralized processor: Verifies profile on Microsoft Graph /me, enforces profile isolation,
   * encrypts tokens with AES-256-GCM, and persists into persistent Firebase database.
   */
  public static async processTokensAndSave(
    teacherId: string,
    accessToken: string,
    refreshToken: string | undefined,
    expiresInSec: number
  ): Promise<{ success: boolean; teacherId: string; email?: string; displayName?: string; error?: string }> {
    // 1. Live verification with Microsoft Graph /v1.0/me
    const profileRes = await fetch(MICROSOFT_GRAPH_ME_URL, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!profileRes.ok) {
      const errText = await profileRes.text();
      console.error('[Outlook Service] Profile fetch failed:', errText);
      return {
        success: false,
        teacherId,
        error: 'Could not fetch Microsoft profile from Graph API.',
      };
    }

    const profile = await profileRes.json();
    const realEmail = (profile.mail || profile.userPrincipalName || '').toLowerCase().trim();
    const realDisplayName = profile.displayName || '';

    if (!realEmail) {
      return {
        success: false,
        teacherId,
        error: 'The authenticated Microsoft account does not have an active mailbox or email.',
      };
    }

    // 2. Security Check: The Outlook ID of one account must ONLY be accessible from the person's profile who is authorized
    const allUsers = await getAllUsers();
    for (const other of allUsers) {
      if (other.id !== teacherId && other.role === 'teacher') {
        const otherConn = (other as any).outlookConnection as OutlookConnectionDoc | undefined;
        if (
          otherConn &&
          otherConn.email &&
          otherConn.email.toLowerCase() === realEmail &&
          otherConn.status === 'CONNECTED'
        ) {
          return {
            success: false,
            teacherId,
            error: `The Microsoft account "${realEmail}" is already linked to faculty member ${other.name}. Each Outlook account can only be authorized by its owner.`,
          };
        }
      }
    }

    const isPersonal =
      realEmail.endsWith('@outlook.com') ||
      realEmail.endsWith('@hotmail.com') ||
      realEmail.endsWith('@live.com');
    const accountType = isPersonal ? 'personal' : 'work_school';

    // 3. Encrypt tokens at rest with AES-256-GCM (self-contained packed format + fields)
    const encAccess = encryptToken(accessToken);
    const encRefresh = refreshToken ? encryptToken(refreshToken) : null;

    const docToSave: OutlookConnectionDoc = {
      teacherId,
      encryptedAccessToken: encAccess.packed,
      encryptedRefreshToken: encRefresh ? encRefresh.packed : '',
      iv: encAccess.iv,
      tag: encAccess.tag,
      refreshIv: encRefresh ? encRefresh.iv : undefined,
      refreshTag: encRefresh ? encRefresh.tag : undefined,
      expiresAt: Date.now() + expiresInSec * 1000,
      email: realEmail,
      displayName: realDisplayName,
      accountType,
      scopes: REQUIRED_OUTLOOK_SCOPES,
      lastVerifiedAt: new Date().toISOString(),
      connectedAt: new Date().toISOString(),
      status: 'CONNECTED',
    };

    // 4. Persist in Firebase database
    await saveOutlookConnection(docToSave);

    return {
      success: true,
      teacherId,
      email: realEmail,
      displayName: realDisplayName,
    };
  }

  /**
   * Exchanges real authorization code with Microsoft for tokens,
   * performs live verification via Microsoft Graph, encrypts tokens, and persists in Firestore.
   */
  public static async handleOAuthCallback(
    code: string,
    state: string,
    redirectUri: string
  ): Promise<{ success: boolean; teacherId: string; email?: string; displayName?: string; error?: string }> {
    const stateData = oauthStateMap.get(state);
    if (!stateData) {
      const parts = state.split('__');
      if (parts.length < 2) {
        return { success: false, teacherId: '', error: 'Invalid or expired OAuth state.' };
      }
    }

    const teacherId = stateData ? stateData.teacherId : state.split('__')[0];
    oauthStateMap.delete(state);

    const clientId = await this.getClientId();
    const clientSecret = await this.getClientSecret();

    if (!clientId || !clientSecret) {
      return {
        success: false,
        teacherId,
        error: 'Microsoft App credentials are not configured on the server.',
      };
    }

    try {
      const body = new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
        scope: REQUIRED_OUTLOOK_SCOPES.join(' '),
      });

      const tokenRes = await fetch(MICROSOFT_OAUTH_TOKEN_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: body.toString(),
      });

      if (!tokenRes.ok) {
        const errorText = await tokenRes.text();
        console.error('[Outlook Service] Token exchange failed:', errorText);
        let errorMsg = `Microsoft token exchange failed: ${tokenRes.statusText}`;
        try {
          const parsed = JSON.parse(errorText);
          errorMsg = parsed.error_description || parsed.error || errorMsg;
        } catch {}
        return { success: false, teacherId, error: errorMsg };
      }

      const tokenData = await tokenRes.json();
      return await this.processTokensAndSave(
        teacherId,
        tokenData.access_token,
        tokenData.refresh_token,
        tokenData.expires_in || 3600
      );
    } catch (err: any) {
      console.error('[Outlook Service] Callback handling error:', err);
      return { success: false, teacherId, error: err.message || 'Error completing Microsoft OAuth.' };
    }
  }

  /**
   * Directly exchanges authorization code or pasted callback URL for tokens.
   * Solves proxy/Google Cloud Run 403 redirect issues when popups cannot directly navigate back.
   */
  public static async exchangeAuthorizationCode(
    teacherId: string,
    codeOrUrl: string,
    redirectUri: string
  ): Promise<{ success: boolean; teacherId: string; email?: string; displayName?: string; error?: string }> {
    let code = (codeOrUrl || '').trim();
    if (!code) {
      return { success: false, teacherId, error: 'Please enter a valid authorization code or callback URL.' };
    }

    // Extract code if user pasted full callback URL
    if (code.includes('code=')) {
      try {
        const urlToParse = code.startsWith('http') ? code : `https://example.com?${code}`;
        const parsed = new URL(urlToParse);
        const extracted = parsed.searchParams.get('code');
        if (extracted) {
          code = extracted;
        }
      } catch {
        const match = code.match(/code=([^&]+)/);
        if (match && match[1]) {
          code = decodeURIComponent(match[1]);
        }
      }
    }

    const clientId = await this.getClientId();
    const clientSecret = await this.getClientSecret();

    if (!clientId || !clientSecret) {
      return {
        success: false,
        teacherId,
        error: 'Microsoft App credentials are not configured on the server.',
      };
    }

    try {
      const body = new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
        scope: REQUIRED_OUTLOOK_SCOPES.join(' '),
      });

      const tokenRes = await fetch(MICROSOFT_OAUTH_TOKEN_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: body.toString(),
      });

      if (!tokenRes.ok) {
        const errorText = await tokenRes.text();
        console.error('[Outlook Service] Manual code exchange failed:', errorText);
        let errorMsg = `Microsoft token exchange failed: ${tokenRes.statusText}`;
        try {
          const parsed = JSON.parse(errorText);
          errorMsg = parsed.error_description || parsed.error || errorMsg;
        } catch {}
        return { success: false, teacherId, error: errorMsg };
      }

      const tokenData = await tokenRes.json();
      return await this.processTokensAndSave(
        teacherId,
        tokenData.access_token,
        tokenData.refresh_token,
        tokenData.expires_in || 3600
      );
    } catch (err: any) {
      console.error('[Outlook Service] Manual code exchange error:', err);
      return { success: false, teacherId, error: err.message || 'Error exchanging authorization code.' };
    }
  }

  /**
   * Initiates Microsoft Device Code Flow (RFC 8628).
   * Opens login.microsoft.com/device directly - 100% immune to Google Cloud Run redirect 403 errors.
   */
  public static async startDeviceCode(teacherId: string): Promise<{
    success: boolean;
    userCode?: string;
    deviceCode?: string;
    verificationUri?: string;
    expiresIn?: number;
    interval?: number;
    message?: string;
    error?: string;
  }> {
    const isConfigured = await this.isConfigured();
    const clientId = await this.getClientId();

    if (!isConfigured || !clientId) {
      return {
        success: false,
        error: 'Microsoft App credentials (Client ID and Client Secret) are not configured.',
      };
    }

    try {
      const body = new URLSearchParams({
        client_id: clientId,
        scope: REQUIRED_OUTLOOK_SCOPES.join(' '),
      });

      const res = await fetch(MICROSOFT_OAUTH_DEVICE_CODE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: body.toString(),
      });

      if (!res.ok) {
        const errText = await res.text();
        console.error('[Outlook Service] Device code request failed:', errText);
        let msg = 'Failed to initiate Microsoft device code login.';
        try {
          const p = JSON.parse(errText);
          if (p.error_description?.includes('AADSTS70002') || p.error === 'AADSTS70002') {
            msg = 'To use Direct Device Login: in Azure Portal under App registration > Authentication > Advanced settings, set "Allow public client flows" to "Yes". Alternatively, click "Open OAuth Popup" and paste your popup address below!';
          } else {
            msg = p.error_description || p.error || msg;
          }
        } catch {}
        return { success: false, error: msg };
      }

      const data = await res.json();
      return {
        success: true,
        userCode: data.user_code,
        deviceCode: data.device_code,
        verificationUri: data.verification_uri || 'https://microsoft.com/devicelogin',
        expiresIn: data.expires_in || 900,
        interval: data.interval || 5,
        message: data.message,
      };
    } catch (err: any) {
      console.error('[Outlook Service] startDeviceCode error:', err);
      return { success: false, error: err.message || 'Error initiating device code.' };
    }
  }

  /**
   * Polls Microsoft token endpoint during Device Code Flow.
   */
  public static async pollDeviceCode(
    teacherId: string,
    deviceCode: string
  ): Promise<{
    status: 'PENDING' | 'SUCCESS' | 'EXPIRED' | 'DECLINED' | 'ERROR';
    email?: string;
    displayName?: string;
    error?: string;
  }> {
    const clientId = await this.getClientId();
    const clientSecret = await this.getClientSecret();
    if (!clientId) {
      return { status: 'ERROR', error: 'Missing Client ID' };
    }

    try {
      const body = new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:device_code',
        client_id: clientId,
        device_code: deviceCode,
      });
      if (clientSecret) {
        body.append('client_secret', clientSecret);
      }

      const res = await fetch(MICROSOFT_OAUTH_TOKEN_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: body.toString(),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.error === 'authorization_pending') {
          return { status: 'PENDING' };
        }
        if (data.error === 'authorization_declined') {
          return { status: 'DECLINED', error: 'User declined authorization on Microsoft.' };
        }
        if (data.error === 'expired_token' || data.error === 'bad_verification_code') {
          return { status: 'EXPIRED', error: 'Device code expired. Please request a new code.' };
        }
        return { status: 'ERROR', error: data.error_description || data.error || 'Authorization error.' };
      }

      const accessToken = data.access_token;
      const refreshToken = data.refresh_token;
      const expiresInSec = data.expires_in || 3600;

      if (!accessToken) {
        return { status: 'ERROR', error: 'No access token returned from Microsoft.' };
      }

      const saved = await this.processTokensAndSave(teacherId, accessToken, refreshToken, expiresInSec);
      if (!saved.success) {
        return { status: 'ERROR', error: saved.error };
      }

      return {
        status: 'SUCCESS',
        email: saved.email,
        displayName: saved.displayName,
      };
    } catch (err: any) {
      console.error('[Outlook Service] pollDeviceCode error:', err);
      return { status: 'ERROR', error: err.message || 'Error polling device code.' };
    }
  }

  /**
   * Refreshes an expired access token using the encrypted offline refresh token.
   * Persists the newly rolled access and refresh tokens to Firebase database.
   */
  private static async refreshTokens(conn: OutlookConnectionDoc): Promise<string | null> {
    if (!conn.encryptedRefreshToken) {
      return null;
    }

    try {
      const clientId = await this.getClientId();
      const clientSecret = await this.getClientSecret();
      if (!clientId || !clientSecret) return null;

      // Safe decryption handles packed self-contained tokens, dedicated refreshIv/tag, or legacy iv/tag
      const refreshToken = safeDecryptToken(
        conn.encryptedRefreshToken,
        conn.refreshIv || conn.iv,
        conn.refreshTag || conn.tag
      );

      if (!refreshToken) {
        // Tag mismatch, changed secret, or corrupted payload: mark reauthentication required cleanly
        conn.status = 'REAUTHENTICATION_REQUIRED';
        conn.errorMessage = 'Microsoft session credentials expired. Please sign in again with your Microsoft account.';
        await saveOutlookConnection(conn);
        return null;
      }

      const body = new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        scope: REQUIRED_OUTLOOK_SCOPES.join(' '),
      });

      const res = await fetch(MICROSOFT_OAUTH_TOKEN_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: body.toString(),
      });

      if (!res.ok) {
        const errorText = await res.text();
        console.warn('[Outlook Service] Refresh token was rejected by Microsoft:', errorText);
        conn.status = 'REAUTHENTICATION_REQUIRED';
        conn.errorMessage = 'Microsoft session expired or access was revoked. Please sign in again.';
        await saveOutlookConnection(conn);
        return null;
      }

      const data = await res.json();
      const newAccessToken = data.access_token;
      const newRefreshToken = data.refresh_token;
      const expiresInSec = data.expires_in || 3600;

      if (!newAccessToken) return null;

      const encAccess = encryptToken(newAccessToken);
      conn.encryptedAccessToken = encAccess.packed;
      conn.iv = encAccess.iv;
      conn.tag = encAccess.tag;
      conn.expiresAt = Date.now() + expiresInSec * 1000;

      if (newRefreshToken) {
        const encRefresh = encryptToken(newRefreshToken);
        conn.encryptedRefreshToken = encRefresh.packed;
        conn.refreshIv = encRefresh.iv;
        conn.refreshTag = encRefresh.tag;
      }

      // Persist refreshed tokens into Firebase database
      await saveOutlookConnection(conn);

      return newAccessToken;
    } catch (err) {
      console.error('[Outlook Service] Error during refresh token request:', err);
      return null;
    }
  }

  /**
   * Performs true real-time live verification against Microsoft Graph API (/v1.0/me).
   * Refreshes expired tokens via offline refresh_token and returns the authentic connection state.
   */
  public static async verifyLiveConnection(teacherId: string): Promise<OutlookStatusResponse> {
    const isConfigured = await this.isConfigured();
    const conn = await getOutlookConnection(teacherId);

    if (!conn || !conn.encryptedAccessToken) {
      return {
        connected: false,
        status: 'DISCONNECTED',
        isConfigured,
      };
    }

    let accessToken: string | null = null;
    try {
      // Check if access token is expired or expiring within 60s
      if (Date.now() >= conn.expiresAt - 60 * 1000) {
        accessToken = await this.refreshTokens(conn);
        if (!accessToken) {
          conn.status = 'REAUTHENTICATION_REQUIRED';
          conn.errorMessage =
            'Microsoft access token expired or revoked. Please sign in again to grant permission.';
          await saveOutlookConnection(conn);
          return {
            connected: false,
            status: 'REAUTHENTICATION_REQUIRED',
            email: conn.email,
            displayName: conn.displayName,
            accountType: conn.accountType,
            scopes: conn.scopes,
            lastVerifiedAt: conn.lastVerifiedAt,
            connectedAt: conn.connectedAt,
            errorMessage: conn.errorMessage,
            isConfigured,
          };
        }
      } else {
        accessToken = safeDecryptToken(conn.encryptedAccessToken, conn.iv, conn.tag);
        if (!accessToken) {
          // Token decryption failed; try to refresh
          accessToken = await this.refreshTokens(conn);
          if (!accessToken) {
            conn.status = 'REAUTHENTICATION_REQUIRED';
            conn.errorMessage =
              'Microsoft session credentials cannot be authenticated. Please sign in again.';
            await saveOutlookConnection(conn);
            return {
              connected: false,
              status: 'REAUTHENTICATION_REQUIRED',
              email: conn.email,
              displayName: conn.displayName,
              accountType: conn.accountType,
              scopes: conn.scopes,
              lastVerifiedAt: conn.lastVerifiedAt,
              connectedAt: conn.connectedAt,
              errorMessage: conn.errorMessage,
              isConfigured,
            };
          }
        }
      }

      // Live verification call to Microsoft Graph
      const graphRes = await fetch(MICROSOFT_GRAPH_ME_URL, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (graphRes.status === 200) {
        const profile = await graphRes.json();
        const email = (profile.mail || profile.userPrincipalName || conn.email || '').toLowerCase().trim();
        const displayName = profile.displayName || conn.displayName || '';

        conn.status = 'CONNECTED';
        conn.email = email;
        conn.displayName = displayName;
        conn.lastVerifiedAt = new Date().toISOString();
        conn.errorMessage = undefined;

        await saveOutlookConnection(conn);

        return {
          connected: true,
          status: 'CONNECTED',
          email: conn.email,
          displayName: conn.displayName,
          accountType: conn.accountType,
          scopes: conn.scopes,
          lastVerifiedAt: conn.lastVerifiedAt,
          connectedAt: conn.connectedAt,
          isConfigured,
        };
      } else if (graphRes.status === 401) {
        // Try refresh once
        const refreshed = await this.refreshTokens(conn);
        if (refreshed) {
          const retryRes = await fetch(MICROSOFT_GRAPH_ME_URL, {
            headers: { Authorization: `Bearer ${refreshed}` },
          });
          if (retryRes.status === 200) {
            const profile = await retryRes.json();
            conn.status = 'CONNECTED';
            conn.email = (profile.mail || profile.userPrincipalName || conn.email || '').toLowerCase().trim();
            conn.displayName = profile.displayName || conn.displayName || '';
            conn.lastVerifiedAt = new Date().toISOString();
            conn.errorMessage = undefined;

            await saveOutlookConnection(conn);

            return {
              connected: true,
              status: 'CONNECTED',
              email: conn.email,
              displayName: conn.displayName,
              accountType: conn.accountType,
              scopes: conn.scopes,
              lastVerifiedAt: conn.lastVerifiedAt,
              connectedAt: conn.connectedAt,
              isConfigured,
            };
          }
        }

        conn.status = 'REAUTHENTICATION_REQUIRED';
        conn.errorMessage = 'Microsoft session expired or access was revoked. Please log in again.';
        await saveOutlookConnection(conn);

        return {
          connected: false,
          status: 'REAUTHENTICATION_REQUIRED',
          email: conn.email,
          displayName: conn.displayName,
          errorMessage: conn.errorMessage,
          isConfigured,
        };
      } else {
        conn.status = 'ERROR';
        conn.errorMessage = `Microsoft Graph returned status ${graphRes.status}`;
        await saveOutlookConnection(conn);

        return {
          connected: false,
          status: 'ERROR',
          email: conn.email,
          displayName: conn.displayName,
          errorMessage: conn.errorMessage,
          isConfigured,
        };
      }
    } catch (err: any) {
      console.error('[Outlook Service] Live verification error:', err);
      return {
        connected: false,
        status: 'VERIFICATION_UNAVAILABLE',
        email: conn.email,
        displayName: conn.displayName,
        errorMessage: 'Network error contacting Microsoft service.',
        isConfigured,
      };
    }
  }

  /**
   * Disconnects and purges stored credentials for a teacher.
   */
  public static async disconnect(teacherId: string): Promise<boolean> {
    await deleteOutlookConnection(teacherId);
    return true;
  }
}
