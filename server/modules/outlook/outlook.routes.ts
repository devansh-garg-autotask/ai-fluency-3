import { Router, type Request, type Response } from 'express';
import { OutlookService } from './outlook.service.ts';

const router = Router();

function getRedirectUri(req: Request): string {
  if (process.env.MICROSOFT_REDIRECT_URI) {
    return process.env.MICROSOFT_REDIRECT_URI.trim();
  }
  const protocol = req.headers['x-forwarded-proto'] || (req.secure ? 'https' : 'http');
  const host = req.headers['x-forwarded-host'] || req.headers.host || 'localhost:3000';
  return `${protocol}://${host}/api/outlook/callback`;
}

// GET /api/outlook/config - Configuration check
router.get('/config', async (req: Request, res: Response) => {
  try {
    const isConfigured = await OutlookService.isConfigured();
    const clientId = await OutlookService.getClientId();
    res.json({
      isConfigured,
      redirectUri: getRedirectUri(req),
      clientIdMasked: clientId ? `${clientId.slice(0, 8)}••••••••` : '',
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/outlook/credentials - Configure Azure Client ID & Secret
router.post('/credentials', async (req: Request, res: Response) => {
  try {
    const { clientId, clientSecret } = req.body;
    if (!clientId || !clientSecret) {
      return res.status(400).json({ error: 'Client ID and Client Secret are required.' });
    }
    const result = await OutlookService.saveCredentials(clientId, clientSecret);
    return res.json({
      success: true,
      isConfigured: true,
      message: result.message,
    });
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

// POST /api/outlook/connect - Start authentic Microsoft OAuth flow
router.post('/connect', async (req: Request, res: Response) => {
  try {
    const { teacherId } = req.body;
    if (!teacherId) {
      return res.status(400).json({ error: 'Teacher ID is required to initiate Outlook connection' });
    }

    const callerId = (req.headers['x-teacher-id'] as string) || '';
    if (callerId && callerId !== teacherId) {
      return res.status(403).json({
        error: 'Forbidden: You are only authorized to connect Outlook for your own profile.',
      });
    }

    const redirectUri = getRedirectUri(req);
    const authData = await OutlookService.generateAuthUrl(teacherId, redirectUri);

    if (authData.error || !authData.isConfigured) {
      return res.status(400).json({
        error:
          authData.error ||
          'Microsoft Azure OAuth credentials are not configured. Please configure your Client ID and Client Secret.',
        isConfigured: false,
        redirectUri,
      });
    }

    return res.json({
      authUrl: authData.authUrl,
      state: authData.state,
      isConfigured: true,
      redirectUri,
    });
  } catch (err: any) {
    console.error('[Outlook Routes] Connect initiation error:', err);
    return res.status(500).json({ error: 'Failed to initiate Outlook connection: ' + err.message });
  }
});

// POST /api/outlook/exchange-code - Direct code exchange (Solves Cloud Run 403 redirect error)
router.post('/exchange-code', async (req: Request, res: Response) => {
  try {
    const { teacherId, codeOrUrl } = req.body;
    if (!teacherId || !codeOrUrl) {
      return res.status(400).json({ error: 'Both teacherId and codeOrUrl are required' });
    }

    const callerId = (req.headers['x-teacher-id'] as string) || '';
    if (callerId && callerId !== teacherId) {
      return res.status(403).json({
        error: 'Forbidden: You are only authorized to connect Outlook for your own profile.',
      });
    }

    const redirectUri = getRedirectUri(req);
    const result = await OutlookService.exchangeAuthorizationCode(teacherId, codeOrUrl, redirectUri);

    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    return res.json({
      success: true,
      teacherId: result.teacherId,
      email: result.email,
      displayName: result.displayName,
      message: 'Authentic Microsoft account connected successfully.',
    });
  } catch (err: any) {
    console.error('[Outlook Routes] exchange-code error:', err);
    return res.status(500).json({ error: err.message || 'Error exchanging authorization code' });
  }
});

// POST /api/outlook/device-code/start - Start Device Code Flow (login.microsoft.com/device)
router.post('/device-code/start', async (req: Request, res: Response) => {
  try {
    const { teacherId } = req.body;
    if (!teacherId) {
      return res.status(400).json({ error: 'teacherId is required' });
    }

    const callerId = (req.headers['x-teacher-id'] as string) || '';
    if (callerId && callerId !== teacherId) {
      return res.status(403).json({
        error: 'Forbidden: You are only authorized to connect Outlook for your own profile.',
      });
    }

    const result = await OutlookService.startDeviceCode(teacherId);
    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    return res.json(result);
  } catch (err: any) {
    console.error('[Outlook Routes] device-code/start error:', err);
    return res.status(500).json({ error: err.message || 'Error starting device code flow' });
  }
});

// POST /api/outlook/device-code/poll - Poll for Device Code authorization completion
router.post('/device-code/poll', async (req: Request, res: Response) => {
  try {
    const { teacherId, deviceCode } = req.body;
    if (!teacherId || !deviceCode) {
      return res.status(400).json({ error: 'teacherId and deviceCode are required' });
    }

    const callerId = (req.headers['x-teacher-id'] as string) || '';
    if (callerId && callerId !== teacherId) {
      return res.status(403).json({
        error: 'Forbidden: You are only authorized to connect Outlook for your own profile.',
      });
    }

    const result = await OutlookService.pollDeviceCode(teacherId, deviceCode);
    return res.json(result);
  } catch (err: any) {
    console.error('[Outlook Routes] device-code/poll error:', err);
    return res.status(500).json({ error: err.message || 'Error polling device code' });
  }
});

// GET /api/outlook/callback - OAuth redirect handler (renders popup postMessage closer)
router.get(['/callback', '/callback/'], async (req: Request, res: Response) => {
  const code = (req.query.code as string) || '';
  const state = (req.query.state as string) || '';
  const error = (req.query.error as string) || '';
  const errorDescription = (req.query.error_description as string) || '';

  if (error) {
    const safeDesc = errorDescription.replace(/</g, '&lt;').replace(/>/g, '&gt;');
    return res.send(`
      <!DOCTYPE html>
      <html>
        <head><title>Authentication Cancelled</title></head>
        <body style="background:#020617;color:#f8fafc;font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;padding:20px;">
          <div style="text-align:center;max-width:400px;background:#0f172a;border:1px solid #334155;border-radius:12px;padding:24px;">
            <h3 style="color:#ef4444;margin-top:0;">Authentication Cancelled</h3>
            <p style="font-size:13px;color:#94a3b8;">${safeDesc || 'Access was declined or expired.'}</p>
            <button onclick="window.close()" style="background:#334155;color:#fff;border:none;padding:8px 16px;border-radius:6px;cursor:pointer;margin-top:12px;">Close Window</button>
          </div>
          <script>
            try {
              if (window.opener) {
                window.opener.postMessage({ type: 'OUTLOOK_AUTH_ERROR', error: '${encodeURIComponent(error)}' }, '*');
              }
            } catch(e) {}
            setTimeout(() => window.close(), 3000);
          </script>
        </body>
      </html>
    `);
  }

  if (!code) {
    return res.status(400).send('Missing authorization code from Microsoft');
  }

  const redirectUri = getRedirectUri(req);
  const result = await OutlookService.handleOAuthCallback(code, state, redirectUri);

  if (!result.success) {
    return res.send(`
      <!DOCTYPE html>
      <html>
        <head><title>Connection Failed</title></head>
        <body style="background:#020617;color:#f8fafc;font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;padding:20px;">
          <div style="text-align:center;max-width:420px;background:#0f172a;border:1px solid #ef4444;border-radius:12px;padding:24px;">
            <h3 style="color:#ef4444;margin-top:0;">Microsoft Authorization Failed</h3>
            <p style="font-size:13px;color:#94a3b8;line-height:1.5;">${result.error || 'Failed to complete Microsoft handshake.'}</p>
            <button onclick="window.close()" style="background:#ef4444;color:#fff;border:none;padding:8px 16px;border-radius:6px;cursor:pointer;margin-top:14px;">Close</button>
          </div>
          <script>
            try {
              if (window.opener) {
                window.opener.postMessage({ type: 'OUTLOOK_AUTH_ERROR', error: '${encodeURIComponent(result.error || '')}' }, '*');
              }
            } catch(e) {}
          </script>
        </body>
      </html>
    `);
  }

  // Success response with live authentic account confirmation
  res.send(`
    <!DOCTYPE html>
    <html>
      <head><title>Authentication Complete</title></head>
      <body style="background:#020617;color:#f8fafc;font-family:system-ui,-apple-system,sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;padding:20px;">
        <div style="text-align:center;max-width:400px;background:#0f172a;border:1px solid #1e293b;border-radius:16px;padding:32px;box-shadow:0 20px 25px -5px rgba(0,0,0,0.5);">
          <div style="width:48px;height:48px;border-radius:50%;background:#065f46;color:#34d399;display:flex;align-items:center;justify-content:center;margin:0 auto 16px;font-size:24px;">✓</div>
          <h2 style="font-size:18px;font-weight:700;margin:0 0 8px;color:#f8fafc;">Microsoft Account Connected</h2>
          <p style="font-size:13px;color:#94a3b8;margin:0 0 16px;line-height:1.5;">Your authentic Microsoft Outlook account has been authenticated. Persistent offline tokens have been encrypted and saved in the Firebase database.</p>
          <div style="font-size:11px;color:#64748b;">Closing window and refreshing status...</div>
        </div>
        <script>
          try {
            if (window.opener) {
              window.opener.postMessage({ type: 'OUTLOOK_AUTH_SUCCESS', teacherId: '${result.teacherId}' }, '*');
            }
          } catch(e) {}
          setTimeout(() => {
            window.close();
          }, 1200);
        </script>
      </body>
    </html>
  `);
});

// GET /api/outlook/status - Live check true connection status
router.get('/status', async (req: Request, res: Response) => {
  try {
    const teacherId = (req.query.teacherId as string) || '';
    if (!teacherId) {
      return res.status(400).json({ error: 'teacherId parameter is required' });
    }

    const callerId = (req.headers['x-teacher-id'] as string) || '';
    if (callerId && callerId !== teacherId) {
      return res.status(403).json({
        error: 'Forbidden: You are only authorized to view your own Outlook account connection.',
      });
    }

    const status = await OutlookService.verifyLiveConnection(teacherId);
    return res.json(status);
  } catch (err: any) {
    console.error('[Outlook Routes] Status check error:', err);
    return res.status(500).json({ error: 'Failed to verify Outlook connection: ' + err.message });
  }
});

// POST /api/outlook/verify - Force real-time live verification (Status Refresh Button endpoint)
router.post('/verify', async (req: Request, res: Response) => {
  try {
    const { teacherId } = req.body;
    if (!teacherId) {
      return res.status(400).json({ error: 'teacherId is required' });
    }

    const callerId = (req.headers['x-teacher-id'] as string) || '';
    if (callerId && callerId !== teacherId) {
      return res.status(403).json({
        error: 'Forbidden: You are only authorized to verify your own Outlook account.',
      });
    }

    // Hits Microsoft Graph API live right now using decrypted tokens
    const status = await OutlookService.verifyLiveConnection(teacherId);
    return res.json(status);
  } catch (err: any) {
    console.error('[Outlook Routes] Force verify error:', err);
    return res.status(500).json({ error: 'Failed to verify connection: ' + err.message });
  }
});

// POST /api/outlook/disconnect - Manual disconnect and purge tokens from persistent database
router.post('/disconnect', async (req: Request, res: Response) => {
  try {
    const { teacherId } = req.body;
    if (!teacherId) {
      return res.status(400).json({ error: 'teacherId is required' });
    }

    const callerId = (req.headers['x-teacher-id'] as string) || '';
    if (callerId && callerId !== teacherId) {
      return res.status(403).json({
        error: 'Forbidden: You are only authorized to disconnect your own Outlook account.',
      });
    }

    await OutlookService.disconnect(teacherId);
    return res.json({
      success: true,
      status: 'DISCONNECTED',
      message: 'Outlook account disconnected and credentials wiped from persistent database.',
    });
  } catch (err: any) {
    console.error('[Outlook Routes] Disconnect error:', err);
    return res.status(500).json({ error: 'Failed to disconnect Outlook: ' + err.message });
  }
});

export default router;
