import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../../context/AuthContext.tsx';
import {
  Mail,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  RefreshCw,
  Unlink,
  ExternalLink,
  Shield,
  Key,
  Clock,
  UserCheck,
  AlertCircle,
  Lock,
  Database,
  Settings,
  X,
  Copy,
  Check,
  Laptop,
  ArrowRight,
  Globe,
  Sparkles,
} from 'lucide-react';
import {
  OutlookConnectionStatus,
  OutlookStatusResponse,
  getOutlookConfig,
  getOutlookStatus,
  verifyOutlookConnection,
  initiateOutlookConnect,
  saveOutlookCredentials,
  disconnectOutlook,
  exchangeOutlookCode,
  startDeviceCode,
  pollDeviceCode,
} from '../../services/outlookApi.ts';

export const OutlookIntegrationModule: React.FC = () => {
  const { user } = useAuth();
  const [status, setStatus] = useState<OutlookConnectionStatus>('CHECKING');
  const [connectionData, setConnectionData] = useState<OutlookStatusResponse | null>(null);
  const [isConfigured, setIsConfigured] = useState<boolean>(false);
  const [redirectUri, setRedirectUri] = useState<string>('');
  const [clientIdMasked, setClientIdMasked] = useState<string>('');

  const [isVerifying, setIsVerifying] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [showDisconnectModal, setShowDisconnectModal] = useState(false);

  // Device Code Flow state (microsoft.com/devicelogin) - Immune to Cloud Run redirect 403
  const [showDeviceModal, setShowDeviceModal] = useState(false);
  const [deviceLoginData, setDeviceLoginData] = useState<{
    userCode: string;
    deviceCode: string;
    verificationUri: string;
  } | null>(null);
  const [isStartingDevice, setIsStartingDevice] = useState(false);
  const [isPollingDevice, setIsPollingDevice] = useState(false);
  const [deviceCopied, setDeviceCopied] = useState(false);
  const devicePollTimerRef = useRef<any>(null);

  // Manual callback URL / code paste fallback state
  const [pastedCodeOrUrl, setPastedCodeOrUrl] = useState('');
  const [isExchangingCode, setIsExchangingCode] = useState(false);
  const [exchangeError, setExchangeError] = useState<string | null>(null);
  const [showManualPaste, setShowManualPaste] = useState(false);

  // Configuration form state
  const [cfgClientId, setCfgClientId] = useState('');
  const [cfgClientSecret, setCfgClientSecret] = useState('');
  const [isSavingCfg, setIsSavingCfg] = useState(false);
  const [cfgError, setCfgError] = useState<string | null>(null);
  const [copiedRedirect, setCopiedRedirect] = useState(false);

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  const popupRef = useRef<Window | null>(null);
  const popupCheckIntervalRef = useRef<any>(null);

  const teacherId = user?.id || '';

  // Load configuration and true status
  const loadConfig = useCallback(async () => {
    try {
      const cfg = await getOutlookConfig();
      setIsConfigured(cfg.isConfigured);
      setRedirectUri(cfg.redirectUri);
      if (cfg.clientIdMasked) setClientIdMasked(cfg.clientIdMasked);
    } catch (e) {
      console.warn('Failed to load outlook config:', e);
    }
  }, []);

  // Perform live verification against Microsoft Graph API
  const performCheck = useCallback(async (showIndicator = false) => {
    if (!teacherId) return;
    if (showIndicator) setIsVerifying(true);
    setErrorMessage(null);

    try {
      const data = await getOutlookStatus(teacherId);
      setConnectionData(data);
      setStatus(data.status);
      setIsConfigured(data.isConfigured);
    } catch (err: any) {
      console.error('Failed to verify Outlook connection:', err);
      setStatus('ERROR');
      setErrorMessage(err.message || 'Unable to contact Microsoft verification service.');
    } finally {
      if (showIndicator) setIsVerifying(false);
    }
  }, [teacherId]);

  // Initial load
  useEffect(() => {
    loadConfig();
    performCheck(false);
  }, [loadConfig, performCheck]);

  // Listen for OAuth popup completion postMessage from Microsoft callback
  useEffect(() => {
    const handleMessage = async (event: MessageEvent) => {
      if (event.data?.type === 'OUTLOOK_AUTH_SUCCESS') {
        if (popupRef.current && !popupRef.current.closed) {
          popupRef.current.close();
        }
        if (popupCheckIntervalRef.current) {
          clearInterval(popupCheckIntervalRef.current);
        }
        setIsConnecting(false);
        setSuccessNotice('Authentic Microsoft account connected! Offline tokens saved in persistent Firebase database.');
        setTimeout(() => setSuccessNotice(null), 7000);

        setStatus('CHECKING');
        await performCheck(true);
      } else if (event.data?.type === 'OUTLOOK_AUTH_ERROR') {
        setIsConnecting(false);
        setErrorMessage(decodeURIComponent(event.data.error || 'Microsoft authentication was cancelled or failed.'));
        if (popupCheckIntervalRef.current) {
          clearInterval(popupCheckIntervalRef.current);
        }
      }
    };

    window.addEventListener('message', handleMessage);
    return () => {
      window.removeEventListener('message', handleMessage);
      if (popupCheckIntervalRef.current) {
        clearInterval(popupCheckIntervalRef.current);
      }
    };
  }, [performCheck]);

  // Handle authentic Microsoft OAuth Login (opens real Microsoft login page)
  const handleMicrosoftLogin = async () => {
    if (!teacherId) return;
    setIsConnecting(true);
    setErrorMessage(null);
    setSuccessNotice(null);

    try {
      const authData = await initiateOutlookConnect(teacherId);

      if (!authData.authUrl) {
        throw new Error('Authentication URL was not generated. Please check Azure credentials.');
      }

      // Open real Microsoft login directly in popup
      const width = 600;
      const height = 750;
      const left = window.screenX + (window.outerWidth - width) / 2;
      const top = window.screenY + (window.outerHeight - height) / 2;

      const popup = window.open(
        authData.authUrl,
        'microsoft_oauth_popup',
        `width=${width},height=${height},left=${left},top=${top},status=no,resizable=yes,scrollbars=yes`
      );

      popupRef.current = popup;

      if (!popup || popup.closed || typeof popup.closed === 'undefined') {
        setIsConnecting(false);
        setErrorMessage('Browser popup was blocked. Please click "Allow popups" in your browser address bar and try again.');
        return;
      }

      popupCheckIntervalRef.current = setInterval(() => {
        if (popup.closed) {
          clearInterval(popupCheckIntervalRef.current);
          setIsConnecting(false);
        }
      }, 1000);
    } catch (err: any) {
      setIsConnecting(false);
      setErrorMessage(err.message || 'Failed to initiate Microsoft sign-in.');
    }
  };

  // Start Device Code Flow (Zero redirect, 100% immune to Google 403 errors)
  const handleStartDeviceLogin = async () => {
    if (!teacherId) return;
    setIsStartingDevice(true);
    setErrorMessage(null);
    setSuccessNotice(null);

    try {
      const data = await startDeviceCode(teacherId);
      setDeviceLoginData({
        userCode: data.userCode,
        deviceCode: data.deviceCode,
        verificationUri: data.verificationUri,
      });
      setShowDeviceModal(true);
      setIsPollingDevice(true);

      if (devicePollTimerRef.current) clearInterval(devicePollTimerRef.current);
      devicePollTimerRef.current = setInterval(async () => {
        try {
          const pollRes = await pollDeviceCode(teacherId, data.deviceCode);
          if (pollRes.status === 'SUCCESS') {
            clearInterval(devicePollTimerRef.current);
            setIsPollingDevice(false);
            setShowDeviceModal(false);
            setSuccessNotice(`Connected to authentic Microsoft account (${pollRes.email || 'Verified'})! Tokens stored securely.`);
            setTimeout(() => setSuccessNotice(null), 6000);
            await performCheck(true);
          } else if (pollRes.status === 'EXPIRED' || pollRes.status === 'DECLINED' || pollRes.status === 'ERROR') {
            clearInterval(devicePollTimerRef.current);
            setIsPollingDevice(false);
            setErrorMessage(pollRes.error || 'Device login expired or was declined. Please try again.');
          }
        } catch {
          // Ignore transient network errors during poll
        }
      }, 4000);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to start Microsoft device login.');
    } finally {
      setIsStartingDevice(false);
    }
  };

  const handleCloseDeviceModal = () => {
    if (devicePollTimerRef.current) {
      clearInterval(devicePollTimerRef.current);
    }
    setIsPollingDevice(false);
    setShowDeviceModal(false);
    setDeviceLoginData(null);
  };

  const copyDeviceCode = () => {
    if (!deviceLoginData?.userCode) return;
    navigator.clipboard.writeText(deviceLoginData.userCode);
    setDeviceCopied(true);
    setTimeout(() => setDeviceCopied(false), 2500);
  };

  // Manual callback URL / authorization code exchange handler
  const handleManualCodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pastedCodeOrUrl.trim() || !teacherId) return;

    setIsExchangingCode(true);
    setExchangeError(null);

    try {
      const res = await exchangeOutlookCode(teacherId, pastedCodeOrUrl.trim());
      setPastedCodeOrUrl('');
      setShowManualPaste(false);
      setSuccessNotice(`Connected to authentic Microsoft account (${res.email || 'Verified'})!`);
      setTimeout(() => setSuccessNotice(null), 6000);
      await performCheck(true);
    } catch (err: any) {
      setExchangeError(err.message || 'Failed to exchange authorization code.');
    } finally {
      setIsExchangingCode(false);
    }
  };

  // Status Refresh Button: hits Microsoft Graph API live right now to get true connection state
  const handleStatusRefresh = async () => {
    if (!teacherId) return;
    setIsVerifying(true);
    setErrorMessage(null);
    setSuccessNotice(null);

    try {
      const result = await verifyOutlookConnection(teacherId);
      setConnectionData(result);
      setStatus(result.status);
      setIsConfigured(result.isConfigured);

      if (result.status === 'CONNECTED') {
        setSuccessNotice(`Live connection confirmed from Microsoft Graph API (${result.email}).`);
        setTimeout(() => setSuccessNotice(null), 5000);
      } else if (result.status === 'REAUTHENTICATION_REQUIRED') {
        setErrorMessage('Microsoft session expired or access was revoked. Please log in again to grant permission.');
      } else if (result.status === 'DISCONNECTED') {
        setSuccessNotice('Confirmed: Account is currently disconnected.');
        setTimeout(() => setSuccessNotice(null), 4000);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Live status check failed.');
      setStatus('ERROR');
    } finally {
      setIsVerifying(false);
    }
  };

  // Handle Disconnect & Purge Tokens
  const handleConfirmDisconnect = async () => {
    if (!teacherId) return;
    setIsDisconnecting(true);
    try {
      await disconnectOutlook(teacherId);
      setStatus('DISCONNECTED');
      setConnectionData(null);
      setShowDisconnectModal(false);
      setSuccessNotice('Outlook account successfully disconnected and tokens purged from database.');
      setTimeout(() => setSuccessNotice(null), 5000);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to disconnect account');
    } finally {
      setIsDisconnecting(false);
    }
  };

  // Save Azure App Credentials
  const handleSaveCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cfgClientId.trim() || !cfgClientSecret.trim()) {
      setCfgError('Both Application (Client) ID and Client Secret are required.');
      return;
    }

    setIsSavingCfg(true);
    setCfgError(null);

    try {
      const res = await saveOutlookCredentials(cfgClientId.trim(), cfgClientSecret.trim());
      setIsConfigured(true);
      setShowConfigModal(false);
      setCfgClientId('');
      setCfgClientSecret('');
      setSuccessNotice(res.message || 'Microsoft credentials saved successfully.');
      setTimeout(() => setSuccessNotice(null), 5000);
      await loadConfig();
    } catch (err: any) {
      setCfgError(err.message || 'Failed to save Azure credentials.');
    } finally {
      setIsSavingCfg(false);
    }
  };

  const copyRedirectUri = () => {
    if (!redirectUri) return;
    navigator.clipboard.writeText(redirectUri);
    setCopiedRedirect(true);
    setTimeout(() => setCopiedRedirect(false), 2500);
  };

  const formatTimeAgo = (isoString?: string) => {
    if (!isoString) return 'Never';
    const date = new Date(isoString);
    const diffSec = Math.floor((Date.now() - date.getTime()) / 1000);
    if (diffSec < 15) return 'Just now';
    if (diffSec < 60) return `${diffSec} seconds ago`;
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin} min${diffMin > 1 ? 's' : ''} ago`;
    const diffHour = Math.floor(diffMin / 60);
    return `${diffHour} hour${diffHour > 1 ? 's' : ''} ago`;
  };

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border border-slate-800 rounded-2xl p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center space-x-3.5">
            <div className="w-12 h-12 rounded-2xl bg-sky-950/80 border border-sky-800/60 text-sky-400 flex items-center justify-center shadow-lg shadow-sky-950/40 shrink-0">
              <Mail className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2.5">
                <h3 className="text-lg font-bold text-white tracking-tight">
                  Microsoft Outlook Live Integration
                </h3>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Authentic Microsoft 365 OAuth 2.0 with offline persistent tokens and live Microsoft Graph verification.
              </p>
            </div>
          </div>

          {/* Real-time Status Badge & Status Refresh Button */}
          <div className="flex items-center space-x-3">
            {/* Status Refresh Button */}
            <button
              onClick={handleStatusRefresh}
              disabled={isVerifying}
              className="px-3.5 py-1.5 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold flex items-center space-x-2 transition-all cursor-pointer disabled:opacity-50 shadow-sm"
              title="Click to query Microsoft Graph API live right now"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isVerifying ? 'animate-spin text-indigo-400' : 'text-slate-400'}`} />
              <span>{isVerifying ? 'Verifying Live...' : 'Refresh Status'}</span>
            </button>

            {/* True Status Badge */}
            {status === 'CHECKING' && (
              <div className="flex items-center space-x-2 px-3.5 py-1.5 rounded-xl bg-slate-900 border border-indigo-500/40 text-indigo-300 text-xs font-semibold shadow-inner">
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-indigo-400" />
                <span>Checking Status...</span>
              </div>
            )}

            {status === 'CONNECTED' && (
              <div className="flex items-center space-x-2 px-3.5 py-1.5 rounded-xl bg-emerald-950/70 border border-emerald-600/60 text-emerald-300 text-xs font-semibold shadow-inner">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>CONNECTED (LIVE)</span>
              </div>
            )}

            {status === 'DISCONNECTED' && (
              <div className="flex items-center space-x-2 px-3.5 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 text-xs font-semibold">
                <span className="w-2 h-2 rounded-full bg-slate-500" />
                <span>DISCONNECTED</span>
              </div>
            )}

            {status === 'REAUTHENTICATION_REQUIRED' && (
              <div className="flex items-center space-x-2 px-3.5 py-1.5 rounded-xl bg-amber-950/80 border border-amber-600/60 text-amber-300 text-xs font-semibold">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                <span>REAUTH REQUIRED</span>
              </div>
            )}

            {status === 'ERROR' && (
              <div className="flex items-center space-x-2 px-3.5 py-1.5 rounded-xl bg-rose-950/80 border border-rose-600/60 text-rose-300 text-xs font-semibold">
                <XCircle className="w-3.5 h-3.5 text-rose-400" />
                <span>CONNECTION ERROR</span>
              </div>
            )}

            {status === 'VERIFICATION_UNAVAILABLE' && (
              <div className="flex items-center space-x-2 px-3.5 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-slate-300 text-xs font-semibold">
                <AlertCircle className="w-3.5 h-3.5 text-slate-400" />
                <span>VERIFICATION UNAVAILABLE</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Security & Access Isolation Banner */}
      <div className="bg-slate-900/40 border border-slate-800/80 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center space-x-2.5 text-slate-300">
          <div className="p-1.5 rounded-lg bg-indigo-950/80 text-indigo-400 border border-indigo-800/40 shrink-0">
            <Lock className="w-4 h-4" />
          </div>
          <div>
            <span className="font-semibold text-slate-200 block">Strict Profile Authorization</span>
            <span className="text-[11px] text-slate-400">
              The Outlook ID of one account is only accessible from the profile authorized to access it ({user?.name}). Cross-account access is strictly blocked.
            </span>
          </div>
        </div>
        <div className="flex items-center space-x-3 shrink-0">
          <div className="flex items-center space-x-1.5 text-emerald-400 font-mono text-[11px] bg-emerald-950/40 px-2.5 py-1 rounded-lg border border-emerald-800/40">
            <Database className="w-3.5 h-3.5" />
            <span>Persistent Firebase DB</span>
          </div>
          <button
            onClick={() => {
              setCfgError(null);
              setShowConfigModal(true);
            }}
            className="flex items-center space-x-1.5 text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-800 px-2.5 py-1 rounded-lg border border-slate-700 text-[11px] transition-colors cursor-pointer"
          >
            <Settings className="w-3.5 h-3.5 text-indigo-400" />
            <span>Azure Credentials</span>
          </button>
        </div>
      </div>

      {/* Notifications */}
      {successNotice && (
        <div className="p-3.5 rounded-xl bg-emerald-950/50 border border-emerald-800/60 flex items-center space-x-2.5 text-xs text-emerald-300">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{successNotice}</span>
        </div>
      )}

      {errorMessage && (
        <div className="p-3.5 rounded-xl bg-rose-950/50 border border-rose-800/60 flex items-center space-x-2.5 text-xs text-rose-300">
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Main Content Area */}
      {status === 'CONNECTED' ? (
        /* CONNECTED: Show live authentic profile and live controls */
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 space-y-6 shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-5 border-b border-slate-800 gap-4">
            <div>
              <h4 className="text-sm font-bold text-slate-100 flex items-center space-x-2">
                <UserCheck className="w-4 h-4 text-emerald-400" />
                <span>Authentic Microsoft Session (Verified Live)</span>
              </h4>
              <p className="text-xs text-slate-400 mt-0.5">
                Authenticated directly via Microsoft identity platform with offline access persistence.
              </p>
            </div>

            <div className="flex items-center space-x-2.5">
              <button
                onClick={handleStatusRefresh}
                disabled={isVerifying}
                className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold flex items-center space-x-2 transition-all cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isVerifying ? 'animate-spin text-indigo-400' : ''}`} />
                <span>{isVerifying ? 'Verifying...' : 'Verify Live Now'}</span>
              </button>

              <button
                onClick={() => setShowDisconnectModal(true)}
                className="px-3.5 py-2 rounded-xl bg-rose-950/60 hover:bg-rose-900/80 text-rose-300 border border-rose-800/60 text-xs font-semibold flex items-center space-x-2 transition-all cursor-pointer"
              >
                <Unlink className="w-3.5 h-3.5" />
                <span>Disconnect</span>
              </button>
            </div>
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
            <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800 space-y-1">
              <span className="text-slate-400 block text-[11px] uppercase tracking-wider font-semibold flex items-center space-x-1">
                <Lock className="w-3 h-3 text-indigo-400" />
                <span>Authentic Microsoft Email</span>
              </span>
              <span className="text-slate-100 font-mono font-bold text-sm truncate block" title={connectionData?.email}>
                {connectionData?.email || 'Authenticated User'}
              </span>
              <span className="text-[11px] text-slate-400 block">
                {connectionData?.displayName || user?.name}
              </span>
            </div>

            <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800 space-y-1">
              <span className="text-slate-400 block text-[11px] uppercase tracking-wider font-semibold">
                Account Classification
              </span>
              <span className="text-indigo-300 font-semibold text-sm block">
                {connectionData?.accountType === 'work_school'
                  ? 'Work / School (Microsoft Entra ID)'
                  : 'Personal Microsoft Account'}
              </span>
              <span className="text-[11px] text-slate-400 block">
                Offline refresh token enabled
              </span>
            </div>

            <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800 space-y-1">
              <span className="text-slate-400 block text-[11px] uppercase tracking-wider font-semibold flex items-center space-x-1">
                <Clock className="w-3 h-3 text-slate-400" />
                <span>Live Verification</span>
              </span>
              <span className="text-emerald-400 font-semibold text-sm block">
                {formatTimeAgo(connectionData?.lastVerifiedAt)}
              </span>
              <span className="text-[10px] text-slate-400 font-mono block">
                {connectionData?.lastVerifiedAt
                  ? new Date(connectionData.lastVerifiedAt).toLocaleTimeString()
                  : '—'}
              </span>
            </div>

            <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800 space-y-1">
              <span className="text-slate-400 block text-[11px] uppercase tracking-wider font-semibold flex items-center space-x-1">
                <Shield className="w-3 h-3 text-emerald-400" />
                <span>Persistent Storage</span>
              </span>
              <span className="text-emerald-300 font-mono font-semibold text-xs block">
                AES-256-GCM Encrypted
              </span>
              <span className="text-[11px] text-slate-400 block">
                Saved in Firebase Database
              </span>
            </div>
          </div>

          {/* Scopes */}
          <div className="bg-slate-950/50 p-4 rounded-xl border border-slate-800 space-y-3">
            <h5 className="text-xs font-semibold text-slate-300 flex items-center space-x-2">
              <Key className="w-3.5 h-3.5 text-indigo-400" />
              <span>Granted Delegated Microsoft Graph Permissions</span>
            </h5>
            <div className="flex flex-wrap gap-2">
              {[
                'offline_access',
                'User.Read',
                'Mail.Read',
                'Mail.ReadWrite',
                'Mail.Send',
                'openid',
                'profile',
                'email',
              ].map((scope) => (
                <span
                  key={scope}
                  className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-[11px] font-mono text-indigo-300 flex items-center space-x-1.5"
                >
                  <CheckCircle2 className="w-2.5 h-2.5 text-emerald-400" />
                  <span>{scope}</span>
                </span>
              ))}
            </div>
          </div>
        </div>
      ) : (
        /* DISCONNECTED OR REAUTH: Direct login to authentic Microsoft Account */
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-8 space-y-6 shadow-xl max-w-3xl">
          <div className="space-y-2">
            <h4 className="text-base font-bold text-slate-100 flex items-center space-x-2">
              <Mail className="w-5 h-5 text-indigo-400" />
              <span>Sign In with Authentic Microsoft Account</span>
            </h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Connect your authentic Microsoft account. You will log in directly on Microsoft's secure login screen and grant permission. The access type is <span className="text-indigo-300 font-semibold">offline</span> so the connection remains persistent via encrypted refresh tokens saved directly in the Firebase database.
            </p>
          </div>

          {status === 'REAUTHENTICATION_REQUIRED' && (
            <div className="p-4 rounded-xl bg-amber-950/50 border border-amber-800/60 text-xs text-amber-300 space-y-1">
              <div className="font-semibold flex items-center space-x-1.5">
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                <span>Microsoft Session Expired</span>
              </div>
              <p className="text-amber-300/80">
                Your Microsoft access was revoked or expired. Please sign in below to grant fresh offline permissions.
              </p>
            </div>
          )}

          {/* Action Box */}
          <div className="p-6 rounded-xl bg-slate-950 border border-slate-800 space-y-6">
            {isConfigured ? (
              <div className="space-y-6">
                {/* Method 1: Device Code Flow (Recommended) */}
                <div className="p-5 rounded-xl bg-gradient-to-r from-indigo-950/40 via-slate-900 to-indigo-950/30 border border-indigo-700/40 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-semibold text-[10px] tracking-wide uppercase border border-emerald-500/30">
                          Recommended • 100% Reliable
                        </span>
                        <h5 className="text-sm font-bold text-white flex items-center space-x-1.5">
                          <Laptop className="w-4 h-4 text-indigo-400" />
                          <span>Direct Microsoft Device Login</span>
                        </h5>
                      </div>
                      <p className="text-xs text-slate-300 leading-relaxed">
                        Sign in on official <span className="font-mono text-indigo-300">microsoft.com/devicelogin</span> with a 1-time code. <span className="text-emerald-300 font-medium">Bypasses all Google Cloud 403 redirect errors completely</span>.
                      </p>
                    </div>

                    <button
                      onClick={handleStartDeviceLogin}
                      disabled={isStartingDevice}
                      className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center justify-center space-x-2 shadow-lg shadow-indigo-600/30 transition-all cursor-pointer disabled:opacity-50 shrink-0"
                    >
                      {isStartingDevice ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin text-white" />
                          <span>Generating Code...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4 text-indigo-200" />
                          <span>Connect with Device Login</span>
                          <ArrowRight className="w-3.5 h-3.5 text-indigo-200" />
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Method 2: Standard Popup Flow with 403 Fallback */}
                <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-0.5">
                      <span className="text-xs font-semibold text-slate-300 block">
                        Standard Microsoft OAuth Popup Flow
                      </span>
                      <span className="text-[11px] text-slate-400 block">
                        Opens Microsoft's authorization popup window with callback redirect.
                      </span>
                    </div>

                    <div className="flex items-center space-x-2 shrink-0">
                      <button
                        onClick={handleMicrosoftLogin}
                        disabled={isConnecting}
                        className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center space-x-2 border border-slate-700 transition-all cursor-pointer disabled:opacity-50"
                      >
                        {isConnecting ? (
                          <>
                            <RefreshCw className="w-3.5 h-3.5 animate-spin text-indigo-400" />
                            <span>Opening Popup...</span>
                          </>
                        ) : (
                          <>
                            <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                            <span>Open OAuth Popup</span>
                          </>
                        )}
                      </button>

                      <button
                        onClick={() => setShowManualPaste(!showManualPaste)}
                        className="px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 text-xs border border-slate-800 transition-colors cursor-pointer"
                        title="If your popup shows Google 403 error on redirect"
                      >
                        <span>Got 403? Paste URL</span>
                      </button>
                    </div>
                  </div>

                  {/* 403 Callback URL / Code Paste Assistant */}
                  {showManualPaste && (
                    <div className="mt-3 p-4 rounded-xl bg-slate-950 border border-amber-800/40 space-y-3 text-xs animate-in fade-in duration-200">
                      <div className="flex items-start space-x-2 text-amber-300">
                        <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                        <div>
                          <span className="font-semibold block">Saw Google's "403 That's an error" on redirect?</span>
                          <span className="text-slate-400 text-[11px] leading-relaxed block mt-0.5">
                            Because you already logged in and clicked Accept on Microsoft, the popup window's address bar contains your authorization code! Copy that entire URL (or the <code className="text-amber-300 font-mono">code=...</code> value) and paste it below:
                          </span>
                        </div>
                      </div>

                      {exchangeError && (
                        <div className="p-2.5 rounded-lg bg-rose-950/60 border border-rose-800 text-rose-300 text-[11px]">
                          {exchangeError}
                        </div>
                      )}

                      <form onSubmit={handleManualCodeSubmit} className="flex flex-col sm:flex-row gap-2">
                        <input
                          type="text"
                          value={pastedCodeOrUrl}
                          onChange={(e) => setPastedCodeOrUrl(e.target.value)}
                          placeholder="Paste popup URL (e.g. https://.../callback?code=M.R...) or authorization code"
                          className="flex-1 px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-700 text-slate-100 placeholder-slate-500 font-mono text-xs focus:outline-none focus:border-indigo-500"
                        />
                        <button
                          type="submit"
                          disabled={isExchangingCode || !pastedCodeOrUrl.trim()}
                          className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs flex items-center justify-center space-x-1.5 cursor-pointer disabled:opacity-50 shrink-0"
                        >
                          {isExchangingCode && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                          <span>{isExchangingCode ? 'Linking Account...' : 'Complete Connection'}</span>
                        </button>
                      </form>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              /* If Azure App credentials are not configured */
              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-amber-950/30 border border-amber-800/50 text-xs text-amber-200 space-y-2">
                  <div className="flex items-center space-x-2 font-semibold text-amber-300">
                    <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                    <span>Azure App Registration Required for Authentic Sign-In</span>
                  </div>
                  <p className="text-slate-400 leading-relaxed text-[11px]">
                    To connect an authentic Microsoft account, provide your Microsoft Azure App Registration credentials (Client ID & Client Secret).
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
                  <div className="text-xs text-slate-400">
                    Configure your credentials to enable live Microsoft sign-in:
                  </div>
                  <button
                    onClick={() => {
                      setCfgError(null);
                      setShowConfigModal(true);
                    }}
                    className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center justify-center space-x-2 shadow-lg shadow-indigo-600/30 transition-all cursor-pointer"
                  >
                    <Settings className="w-4 h-4" />
                    <span>Configure Azure App Credentials</span>
                  </button>
                </div>
              </div>
            )}

            <div className="pt-4 border-t border-slate-900 grid grid-cols-1 sm:grid-cols-3 gap-3 text-[11px] text-slate-400">
              <div className="flex items-center space-x-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>Offline persistent access token</span>
              </div>
              <div className="flex items-center space-x-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>Protected strictly to {user?.name}</span>
              </div>
              <div className="flex items-center space-x-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>Saved in Firebase database</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Microsoft Device Login Modal */}
      {showDeviceModal && deviceLoginData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md">
          <div className="bg-slate-900 border border-indigo-700/50 rounded-3xl max-w-lg w-full p-6 sm:p-8 space-y-6 shadow-2xl relative text-slate-100 animate-in zoom-in-95 duration-150">
            <button
              onClick={handleCloseDeviceModal}
              className="absolute top-5 right-5 text-slate-400 hover:text-white p-1.5 rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center space-x-3.5">
              <div className="w-12 h-12 rounded-2xl bg-indigo-950 border border-indigo-700/60 text-indigo-400 flex items-center justify-center shadow-lg shadow-indigo-950/50 shrink-0">
                <Laptop className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white tracking-tight">Microsoft Device Sign-In</h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Direct authentication on Microsoft.com (Zero Google 403 redirect errors)
                </p>
              </div>
            </div>

            {/* Step 1: Copy Code */}
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2 text-center">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                Step 1: Your One-Time Microsoft Code
              </span>
              <div className="flex items-center justify-center space-x-3 py-1">
                <span className="font-mono text-2xl sm:text-3xl font-extrabold tracking-widest text-indigo-300 select-all">
                  {deviceLoginData.userCode}
                </span>
                <button
                  type="button"
                  onClick={copyDeviceCode}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold flex items-center space-x-1.5 transition-all cursor-pointer"
                  title="Copy code to clipboard"
                >
                  {deviceCopied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-emerald-400">Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-slate-400" />
                      <span>Copy</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Step 2: Open microsoft.com/devicelogin */}
            <div className="space-y-3">
              <span className="text-xs font-semibold text-slate-300 block">
                Step 2: Sign in with your Microsoft account
              </span>
              <a
                href={deviceLoginData.verificationUri}
                target="_blank"
                rel="noreferrer"
                className="w-full px-5 py-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm flex items-center justify-center space-x-2.5 shadow-xl shadow-indigo-600/30 transition-all cursor-pointer group"
              >
                <Globe className="w-4 h-4 text-indigo-200" />
                <span>Open Microsoft Login ({deviceLoginData.verificationUri.replace('https://', '')})</span>
                <ExternalLink className="w-4 h-4 text-indigo-200 group-hover:translate-x-0.5 transition-transform" />
              </a>
              <p className="text-[11px] text-slate-400 text-center leading-relaxed">
                Paste the code above, sign in with your authentic Microsoft email/password, and click <strong className="text-slate-200">Accept</strong>.
              </p>
            </div>

            {/* Step 3: Polling Status */}
            <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800/80 flex items-center justify-between text-xs">
              <div className="flex items-center space-x-2.5 text-slate-300">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping shrink-0" />
                <span className="text-[11px] text-slate-300">
                  Waiting for your approval on Microsoft...
                </span>
              </div>
              <span className="text-[10px] text-indigo-400 font-mono bg-indigo-950/60 px-2 py-0.5 rounded-md border border-indigo-900/60">
                Auto-linking
              </span>
            </div>

            <div className="flex justify-end pt-1">
              <button
                type="button"
                onClick={handleCloseDeviceModal}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Azure App Configuration Modal */}
      {showConfigModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 space-y-5 shadow-2xl relative">
            <button
              onClick={() => setShowConfigModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-950 border border-indigo-800/60 text-indigo-400 flex items-center justify-center">
                <Settings className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Microsoft Azure App Configuration</h3>
                <p className="text-xs text-slate-400">
                  Configure Microsoft Entra ID App credentials for authentic OAuth 2.0 sign-in.
                </p>
              </div>
            </div>

            {/* Redirect URI Box to copy */}
            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5 text-xs">
              <span className="text-slate-400 font-semibold block text-[11px]">
                Web Redirect URI (Add to Azure Portal App Registration &gt; Authentication):
              </span>
              <div className="flex items-center justify-between bg-slate-900 p-2 rounded-lg border border-slate-800 font-mono text-[11px] text-indigo-300">
                <span className="truncate select-all">{redirectUri || `${window.location.origin}/api/outlook/callback`}</span>
                <button
                  type="button"
                  onClick={copyRedirectUri}
                  className="ml-2 text-slate-400 hover:text-slate-200 p-1 hover:bg-slate-800 rounded transition-colors shrink-0 cursor-pointer"
                  title="Copy Redirect URI"
                >
                  {copiedRedirect ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
              <div className="text-[11px] text-slate-400 mt-2 bg-indigo-950/30 p-2 rounded-lg border border-indigo-900/40">
                <span className="text-indigo-300 font-semibold">💡 Recommended for Device Login:</span> In Azure Portal &gt; <strong className="text-slate-300">Authentication</strong> &gt; <strong className="text-slate-300">Advanced settings</strong>, enable <strong className="text-emerald-400">Allow public client flows: Yes</strong> to sign in without any redirect URI errors.
              </div>
            </div>

            {cfgError && (
              <div className="p-3 rounded-xl bg-rose-950/50 border border-rose-800/60 flex items-center space-x-2 text-xs text-rose-300">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{cfgError}</span>
              </div>
            )}

            <form onSubmit={handleSaveCredentials} className="space-y-4 text-xs">
              <div className="space-y-1.5">
                <label className="text-slate-300 font-semibold block">
                  Application (Client) ID
                </label>
                <input
                  type="text"
                  value={cfgClientId}
                  onChange={(e) => setCfgClientId(e.target.value)}
                  placeholder="e.g. 00000000-0000-0000-0000-000000000000"
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 placeholder-slate-500 font-mono focus:outline-none focus:border-indigo-500 transition-colors"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-slate-300 font-semibold block">
                  Client Secret Value
                </label>
                <input
                  type="password"
                  value={cfgClientSecret}
                  onChange={(e) => setCfgClientSecret(e.target.value)}
                  placeholder="Client secret value from Certificates & secrets"
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 placeholder-slate-500 font-mono focus:outline-none focus:border-indigo-500 transition-colors"
                />
              </div>

              <div className="flex items-center justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowConfigModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingCfg}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold flex items-center space-x-1.5 cursor-pointer shadow-lg shadow-indigo-600/30 disabled:opacity-50"
                >
                  {isSavingCfg && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  <span>{isSavingCfg ? 'Saving...' : 'Save & Activate'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Disconnect Confirmation Modal */}
      {showDisconnectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="w-12 h-12 rounded-2xl bg-rose-950/80 border border-rose-800/60 text-rose-400 flex items-center justify-center">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div className="space-y-1">
              <h3 className="text-base font-bold text-white">Disconnect Microsoft Outlook?</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                This will immediately purge all stored access tokens and offline refresh credentials from the persistent Firebase database for faculty member <span className="text-slate-200 font-semibold">{user?.name}</span>. Your connection state will revert to DISCONNECTED.
              </p>
            </div>

            <div className="flex items-center justify-end space-x-3 pt-3">
              <button
                onClick={() => setShowDisconnectModal(false)}
                disabled={isDisconnecting}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDisconnect}
                disabled={isDisconnecting}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold flex items-center space-x-1.5 cursor-pointer shadow-lg shadow-rose-600/30"
              >
                {isDisconnecting && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                <span>{isDisconnecting ? 'Disconnecting...' : 'Yes, Disconnect'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
