/**
 * Google Identity Services wrapper.
 * Decodes the Google JWT credential to extract user profile info.
 */

export interface GoogleUser {
  id: string;
  displayName: string;
  mail: string;
  avatar?: string;
}

/**
 * Decode a Google JWT credential (ID token) to extract user profile.
 * Google ID tokens are base64url-encoded JWTs; we only need the payload.
 */
export function parseGoogleCredential(credential: string): GoogleUser | null {
  try {
    const parts = credential.split('.');
    if (parts.length !== 3) return null;

    // base64url → base64 → decode
    const payload = parts[1]
      .replace(/-/g, '+')
      .replace(/_/g, '/');
    const decoded = JSON.parse(atob(payload));

    return {
      id: decoded.sub,
      displayName: decoded.name || decoded.email || 'Google User',
      mail: decoded.email || '',
      avatar: decoded.picture,
    };
  } catch (error) {
    console.error('Failed to parse Google credential:', error);
    return null;
  }
}

const GOOGLE_SESSION_KEY = 'mdedit_google_user';

export function saveGoogleSession(user: GoogleUser): void {
  sessionStorage.setItem(GOOGLE_SESSION_KEY, JSON.stringify(user));
}

export function loadGoogleSession(): GoogleUser | null {
  try {
    const data = sessionStorage.getItem(GOOGLE_SESSION_KEY);
    if (!data) return null;
    return JSON.parse(data);
  } catch {
    return null;
  }
}

export function clearGoogleSession(): void {
  sessionStorage.removeItem(GOOGLE_SESSION_KEY);
}
