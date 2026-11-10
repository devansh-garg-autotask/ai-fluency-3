export type OutlookConnectionStatus =
  | 'CONNECTED'
  | 'DISCONNECTED'
  | 'REAUTHENTICATION_REQUIRED'
  | 'ERROR'
  | 'CHECKING'
  | 'VERIFICATION_UNAVAILABLE';

export interface OutlookConnectionDoc {
  teacherId: string;
  teacherUsername?: string;
  encryptedAccessToken: string;
  encryptedRefreshToken: string;
  iv: string;
  tag: string;
  refreshIv?: string;
  refreshTag?: string;
  expiresAt: number; // UTC timestamp ms
  email?: string;
  displayName?: string;
  accountType?: 'work_school' | 'personal' | 'unknown';
  scopes: string[];
  lastVerifiedAt?: string; // ISO String
  connectedAt: string; // ISO String
  status: OutlookConnectionStatus;
  errorMessage?: string;
}

export interface OutlookStatusResponse {
  connected: boolean;
  status: OutlookConnectionStatus;
  email?: string;
  displayName?: string;
  accountType?: 'work_school' | 'personal' | 'unknown';
  scopes?: string[];
  lastVerifiedAt?: string;
  connectedAt?: string;
  errorMessage?: string;
  isConfigured: boolean;
}
