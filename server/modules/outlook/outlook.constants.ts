export const MICROSOFT_OAUTH_AUTHORIZE_URL =
  'https://login.microsoftonline.com/common/oauth2/v2.0/authorize';

export const MICROSOFT_OAUTH_TOKEN_URL =
  'https://login.microsoftonline.com/common/oauth2/v2.0/token';

export const MICROSOFT_OAUTH_DEVICE_CODE_URL =
  'https://login.microsoftonline.com/common/oauth2/v2.0/devicecode';

export const MICROSOFT_GRAPH_ME_URL =
  'https://graph.microsoft.com/v1.0/me';

// Strictly delegated permissions as specified
export const REQUIRED_OUTLOOK_SCOPES = [
  'openid',
  'profile',
  'email',
  'offline_access',
  'User.Read',
  'Mail.Read',
  'Mail.ReadWrite',
  'Mail.Send',
];

export const OUTLOOK_COLLECTION_NAME = 'outlook_connections';
