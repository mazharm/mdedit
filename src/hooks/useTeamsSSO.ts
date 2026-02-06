import { useState, useEffect, useCallback, useRef } from 'react';
import { app } from '@microsoft/teams-js';
import {
  PublicClientApplication,
  SilentRequest,
  PopupRequest,
  InteractionRequiredAuthError,
  createNestablePublicClientApplication,
  IPublicClientApplication,
  BrowserCacheLocation,
} from '@azure/msal-browser';

interface User {
  id: string;
  displayName: string;
  mail: string | null;
  userPrincipalName: string;
  avatar?: string;
}

interface TeamsSSOState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

// Azure AD App Configuration - must match Azure AD app registration
const AAD_CLIENT_ID = import.meta.env.VITE_AAD_CLIENT_ID;
const AAD_TENANT_ID = import.meta.env.VITE_AAD_TENANT_ID || 'common';

if (!AAD_CLIENT_ID) {
  console.error('MDEdit Teams: VITE_AAD_CLIENT_ID environment variable is required. See .env.example for setup instructions.');
}

// Scopes needed for the app
const GRAPH_SCOPES = [
  'User.Read',
  'User.ReadBasic.All',
  'People.Read',
  'Files.ReadWrite',
  'Tasks.ReadWrite',
];

let msalInstance: IPublicClientApplication | null = null;
let msalInitPromise: Promise<IPublicClientApplication> | null = null;
let isRunningInTeams = false;

async function checkIfInTeams(): Promise<boolean> {
  try {
    // Reuse the Teams SDK initialization that useTeamsContext already performed.
    // app.initialize() is idempotent and returns the same promise if already called.
    await app.initialize();
    const context = await app.getContext();
    return !!context?.app?.host?.name;
  } catch {
    return false;
  }
}

async function getMsalInstance(): Promise<IPublicClientApplication> {
  if (msalInstance) return msalInstance;

  if (!msalInitPromise) {
    msalInitPromise = (async () => {
      isRunningInTeams = await checkIfInTeams();

      if (isRunningInTeams) {
        // Use Nested App Authentication for Teams
        // NAA allows the app to get tokens without popups by leveraging the Teams host
        console.log('Running in Teams - using Nested App Authentication');
        try {
          msalInstance = await createNestablePublicClientApplication({
            auth: {
              clientId: AAD_CLIENT_ID,
              authority: `https://login.microsoftonline.com/${AAD_TENANT_ID}`,
            },
            cache: {
              cacheLocation: BrowserCacheLocation.LocalStorage,
            },
          });
        } catch (error) {
          console.warn('NAA initialization failed, falling back to standard MSAL:', error);
          // Fall back to standard MSAL if NAA is not available
          msalInstance = new PublicClientApplication({
            auth: {
              clientId: AAD_CLIENT_ID,
              authority: `https://login.microsoftonline.com/${AAD_TENANT_ID}`,
              redirectUri: window.location.origin,
            },
            cache: {
              cacheLocation: BrowserCacheLocation.LocalStorage,
            },
          });
          await msalInstance.initialize();
        }
      } else {
        // Use standard MSAL for standalone browser
        console.log('Running standalone - using standard MSAL');
        msalInstance = new PublicClientApplication({
          auth: {
            clientId: AAD_CLIENT_ID,
            authority: `https://login.microsoftonline.com/${AAD_TENANT_ID}`,
            redirectUri: window.location.origin,
          },
          cache: {
            cacheLocation: BrowserCacheLocation.LocalStorage,
          },
        });
        await msalInstance.initialize();
      }

      return msalInstance;
    })();
  }

  return msalInitPromise;
}

export function useTeamsSSO() {
  const [state, setState] = useState<TeamsSSOState>({
    user: null,
    isAuthenticated: false,
    isLoading: true,
    error: null,
  });

  const tokenCache = useRef<{ token: string; expiresAt: number } | null>(null);

  // Get access token
  const getToken = useCallback(async (): Promise<string | null> => {
    // Check cache first
    if (tokenCache.current && tokenCache.current.expiresAt > Date.now()) {
      return tokenCache.current.token;
    }

    try {
      const pca = await getMsalInstance();
      const accounts = pca.getAllAccounts();

      if (accounts.length === 0) {
        return null;
      }

      const silentRequest: SilentRequest = {
        scopes: GRAPH_SCOPES,
        account: accounts[0],
      };

      try {
        const response = await pca.acquireTokenSilent(silentRequest);

        // Cache the token
        tokenCache.current = {
          token: response.accessToken,
          expiresAt: response.expiresOn?.getTime() || Date.now() + 3600000,
        };

        return response.accessToken;
      } catch (error) {
        if (error instanceof InteractionRequiredAuthError) {
          // Need interactive login
          console.log('Silent token acquisition failed, interaction required');
          return null;
        }
        throw error;
      }
    } catch (error) {
      console.error('Token acquisition failed:', error);
      tokenCache.current = null;
      return null;
    }
  }, []);

  // Fetch user profile from Graph API
  const fetchUserProfile = useCallback(async (accessToken: string): Promise<User | null> => {
    try {
      const response = await fetch('https://graph.microsoft.com/v1.0/me', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch user profile');
      }

      const data = await response.json();

      // Try to get user photo
      let avatar: string | undefined;
      try {
        const photoResponse = await fetch('https://graph.microsoft.com/v1.0/me/photo/$value', {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        });

        if (photoResponse.ok) {
          const blob = await photoResponse.blob();
          avatar = await new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.readAsDataURL(blob);
          });
        }
      } catch {
        // Photo not available
      }

      return {
        id: data.id,
        displayName: data.displayName,
        mail: data.mail,
        userPrincipalName: data.userPrincipalName,
        avatar,
      };
    } catch (error) {
      console.error('Failed to fetch user profile:', error);
      return null;
    }
  }, []);

  // Initialize authentication
  useEffect(() => {
    async function initAuth() {
      setState((prev) => ({ ...prev, isLoading: true }));

      try {
        const pca = await getMsalInstance();

        // Handle redirect response (if coming back from login)
        try {
          const response = await pca.handleRedirectPromise();
          if (response?.account) {
            pca.setActiveAccount(response.account);
          }
        } catch {
          // Ignore redirect errors
        }

        // Check for existing accounts
        const accounts = pca.getAllAccounts();

        if (accounts.length > 0) {
          pca.setActiveAccount(accounts[0]);
          const token = await getToken();

          if (token) {
            const user = await fetchUserProfile(token);
            setState({
              user,
              isAuthenticated: !!user,
              isLoading: false,
              error: null,
            });
            return;
          }
        }

        // No authenticated user
        setState({
          user: null,
          isAuthenticated: false,
          isLoading: false,
          error: null,
        });
      } catch (error) {
        console.error('Auth initialization error:', error);
        setState({
          user: null,
          isAuthenticated: false,
          isLoading: false,
          error: error instanceof Error ? error.message : 'Authentication failed',
        });
      }
    }

    initAuth();
  }, [getToken, fetchUserProfile]);

  // Sign in
  const signIn = useCallback(async () => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      const pca = await getMsalInstance();

      const loginRequest: PopupRequest = {
        scopes: GRAPH_SCOPES,
      };

      // Try popup login - works both in Teams (NAA) and standalone
      const response = await pca.loginPopup(loginRequest);

      if (response.account) {
        pca.setActiveAccount(response.account);

        // Cache the token
        tokenCache.current = {
          token: response.accessToken,
          expiresAt: response.expiresOn?.getTime() || Date.now() + 3600000,
        };

        const user = await fetchUserProfile(response.accessToken);

        setState({
          user,
          isAuthenticated: !!user,
          isLoading: false,
          error: null,
        });
      }
    } catch (error) {
      console.error('Sign in failed:', error);
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Sign in failed',
      }));
    }
  }, [fetchUserProfile]);

  // Sign out
  const signOut = useCallback(async () => {
    try {
      const pca = await getMsalInstance();
      const accounts = pca.getAllAccounts();

      if (accounts.length > 0) {
        // Clear local state first
        tokenCache.current = null;
        setState({
          user: null,
          isAuthenticated: false,
          isLoading: false,
          error: null,
        });

        // Then clear MSAL cache (don't redirect)
        await pca.clearCache();
      }
    } catch (error) {
      console.error('Sign out error:', error);
    }
  }, []);

  return {
    ...state,
    getToken,
    signIn,
    signOut,
  };
}
