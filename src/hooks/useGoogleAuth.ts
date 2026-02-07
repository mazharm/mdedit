import { useState, useCallback, useEffect, useRef } from 'react';
import {
  GoogleUser,
  parseGoogleCredential,
  saveGoogleSession,
  loadGoogleSession,
  clearGoogleSession,
} from '../auth/googleAuth';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';

interface GoogleAuthState {
  user: GoogleUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

interface GisCredentialResponse {
  credential?: string;
  select_by?: string;
}

interface GisIdApi {
  initialize: (config: Record<string, unknown>) => void;
  prompt: (callback?: (notification: { isNotDisplayed: () => boolean; isSkippedMoment: () => boolean }) => void) => void;
  renderButton: (parent: HTMLElement, config: Record<string, unknown>) => void;
  revoke: (hint: string, callback?: () => void) => void;
}

/**
 * Google auth hook using the "Sign In With Google" (google.accounts.id) flow.
 * This uses ID tokens (JWT credentials) instead of the OAuth implicit grant,
 * which avoids redirect_uri issues. Only requires Authorized JavaScript Origins.
 */
export function useGoogleAuth() {
  const [state, setState] = useState<GoogleAuthState>({
    user: null,
    isAuthenticated: false,
    isLoading: true,
    error: null,
  });

  const initializedRef = useRef(false);
  const resolveSignInRef = useRef<(() => void) | null>(null);

  // Restore session on mount
  useEffect(() => {
    const saved = loadGoogleSession();
    if (saved) {
      setState({
        user: saved,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      });
    } else {
      setState((prev) => ({ ...prev, isLoading: false }));
    }
  }, []);

  const handleCredentialResponse = useCallback((response: GisCredentialResponse) => {
    if (!response.credential) {
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: 'No credential received from Google',
      }));
      return;
    }

    const user = parseGoogleCredential(response.credential);
    if (user) {
      saveGoogleSession(user);
      setState({
        user,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      });
    } else {
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: 'Failed to parse Google credential',
      }));
    }

    // Resolve the pending sign-in promise
    if (resolveSignInRef.current) {
      resolveSignInRef.current();
      resolveSignInRef.current = null;
    }
  }, []);

  // Load GIS script and initialize google.accounts.id
  const ensureInitialized = useCallback((): Promise<GisIdApi> => {
    return new Promise((resolve, reject) => {
      const tryInit = () => {
        const goog = (window as unknown as Record<string, unknown>).google as
          | { accounts?: { id?: GisIdApi } }
          | undefined;

        if (!goog?.accounts?.id) {
          reject(new Error('Google Identity Services failed to load'));
          return;
        }

        if (!initializedRef.current) {
          goog.accounts.id.initialize({
            client_id: GOOGLE_CLIENT_ID,
            callback: handleCredentialResponse,
            auto_select: false,
          });
          initializedRef.current = true;
        }

        resolve(goog.accounts.id);
      };

      // Check if already loaded
      const existing = (window as unknown as Record<string, unknown>).google as
        | { accounts?: { id?: GisIdApi } }
        | undefined;
      if (existing?.accounts?.id) {
        tryInit();
        return;
      }

      // Check if script tag already exists (but hasn't loaded yet)
      const existingScript = document.querySelector('script[src="https://accounts.google.com/gsi/client"]');
      if (existingScript) {
        existingScript.addEventListener('load', () => tryInit());
        return;
      }

      // Load the GIS script
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.onload = () => tryInit();
      script.onerror = () => reject(new Error('Failed to load Google Identity Services script'));
      document.head.appendChild(script);
    });
  }, [handleCredentialResponse]);

  const signIn = useCallback(async () => {
    if (!GOOGLE_CLIENT_ID) {
      setState((prev) => ({ ...prev, error: 'Google client ID not configured' }));
      return;
    }

    setState((prev) => ({ ...prev, isLoading: true, error: null }));
    try {
      const idApi = await ensureInitialized();
      // prompt() shows the One Tap / account chooser UI
      idApi.prompt((notification) => {
        if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
          // One Tap was suppressed (e.g. user dismissed it before).
          // Fall back to rendering a temporary sign-in button and clicking it.
          const container = document.createElement('div');
          container.style.position = 'fixed';
          container.style.top = '50%';
          container.style.left = '50%';
          container.style.transform = 'translate(-50%, -50%)';
          container.style.zIndex = '10000';
          container.style.background = 'white';
          container.style.padding = '24px';
          container.style.borderRadius = '8px';
          container.style.boxShadow = '0 4px 24px rgba(0,0,0,0.2)';
          document.body.appendChild(container);

          idApi.renderButton(container, {
            theme: 'outline',
            size: 'large',
            text: 'signin_with',
            width: 300,
          });

          // Clean up when user clicks away
          const cleanup = (e: MouseEvent) => {
            if (!container.contains(e.target as Node)) {
              document.body.removeChild(container);
              document.removeEventListener('mousedown', cleanup);
              setState((prev) => ({ ...prev, isLoading: false }));
            }
          };
          // Delay adding listener so the current click doesn't trigger it
          setTimeout(() => document.addEventListener('mousedown', cleanup), 100);
        }
      });
    } catch (err) {
      console.error('Failed to initialize Google auth:', err);
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: 'Failed to initialize Google sign-in',
      }));
    }
  }, [ensureInitialized]);

  const signOut = useCallback(() => {
    clearGoogleSession();
    setState({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
    });
  }, []);

  return {
    ...state,
    signIn,
    signOut,
  };
}
