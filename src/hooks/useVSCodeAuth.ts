import { useState, useEffect, useCallback, useRef } from 'react';
import { isInVSCode, sendRequest } from '../utils/vscodeApi';

interface User {
  id: string;
  displayName: string;
  mail: string | null;
  userPrincipalName: string;
  avatar?: string;
}

interface VSCodeAuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

interface TokenResponse {
  type: 'token';
  token: string;
  requestId: string;
}

interface UserProfileResponse {
  type: 'userProfile';
  user: User | null;
  requestId: string;
}

interface SignedOutResponse {
  type: 'signedOut';
  requestId: string;
}

// Cache token for 50 minutes (tokens typically last 60 min)
const TOKEN_CACHE_DURATION = 50 * 60 * 1000;

export function useVSCodeAuth() {
  const [state, setState] = useState<VSCodeAuthState>({
    user: null,
    isAuthenticated: false,
    isLoading: true,
    error: null,
  });

  const tokenCache = useRef<{ token: string; expiresAt: number } | null>(null);

  const getToken = useCallback(async (): Promise<string | null> => {
    if (!isInVSCode()) return null;

    // Check cache first
    if (tokenCache.current && tokenCache.current.expiresAt > Date.now()) {
      return tokenCache.current.token;
    }

    try {
      const response = await sendRequest<TokenResponse>(
        { type: 'getToken' },
        'token',
      );
      if (response.token) {
        tokenCache.current = {
          token: response.token,
          expiresAt: Date.now() + TOKEN_CACHE_DURATION,
        };
        return response.token;
      }
      return null;
    } catch (err) {
      console.warn('[MDEdit VSCode Auth] getToken failed:', err);
      return null;
    }
  }, []);

  const signIn = useCallback(async () => {
    if (!isInVSCode()) return;

    setState(prev => ({ ...prev, isLoading: true, error: null }));
    try {
      const response = await sendRequest<UserProfileResponse>(
        { type: 'signIn' },
        'userProfile',
        60000, // 60s timeout for interactive sign-in
      );
      if (response.user) {
        setState({
          user: response.user,
          isAuthenticated: true,
          isLoading: false,
          error: null,
        });
      } else {
        setState(prev => ({ ...prev, isLoading: false }));
      }
    } catch (err) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: err instanceof Error ? err.message : 'Sign in failed',
      }));
    }
  }, []);

  const signOut = useCallback(async () => {
    if (!isInVSCode()) return;

    try {
      await sendRequest<SignedOutResponse>(
        { type: 'signOut' },
        'signedOut',
      );
    } catch {
      // Best-effort
    }
    tokenCache.current = null;
    setState({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
    });
  }, []);

  // Initialize: try silent auth, then auto-sign-in if VS Code has a Microsoft account
  useEffect(() => {
    if (!isInVSCode()) {
      setState(prev => ({ ...prev, isLoading: false }));
      return;
    }

    (async () => {
      try {
        // First try: silent fetch (checks existing session + silent token acquisition)
        const response = await sendRequest<UserProfileResponse>(
          { type: 'getUserProfile' },
          'userProfile',
        );
        if (response.user) {
          setState({
            user: response.user,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          });
          return;
        }

        // Silent didn't find a session — try interactive sign-in automatically
        // This triggers VS Code's Microsoft auth prompt once; after that it's cached
        const signInResponse = await sendRequest<UserProfileResponse>(
          { type: 'signIn' },
          'userProfile',
          60000,
        );
        if (signInResponse.user) {
          setState({
            user: signInResponse.user,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          });
        } else {
          setState({
            user: null,
            isAuthenticated: false,
            isLoading: false,
            error: null,
          });
        }
      } catch {
        setState({
          user: null,
          isAuthenticated: false,
          isLoading: false,
          error: null,
        });
      }
    })();
  }, []);

  return {
    ...state,
    getToken,
    signIn,
    signOut,
    isInTeams: false,
  };
}
