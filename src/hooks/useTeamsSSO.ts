import { useState, useEffect, useCallback, useRef } from 'react';
import { app, authentication } from '@microsoft/teams-js';
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

// Minimal scopes for sign-in (works with both org and personal MSA accounts)
const LOGIN_SCOPES = ['User.Read'];

// Full scopes requested incrementally via acquireTokenSilent/Popup
const GRAPH_SCOPES = [
  'User.Read',
  'User.ReadBasic.All',
  'People.Read',
  'Files.ReadWrite',
  'Tasks.ReadWrite',
  'Mail.Send',
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
      console.log('[MDEdit Auth] isRunningInTeams:', isRunningInTeams);

      if (isRunningInTeams) {
        // Use Nested App Authentication for Teams
        // NAA allows the app to get tokens without popups by leveraging the Teams host
        console.log('[MDEdit Auth] Creating NAA MSAL instance...');
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
          console.log('[MDEdit Auth] NAA MSAL instance created successfully');
        } catch (error) {
          console.warn('[MDEdit Auth] NAA initialization failed, falling back to standard MSAL:', error);
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

  // Get access token for Graph API. Returns null if Graph permissions are unavailable
  // (e.g. admin consent not granted). Callers should degrade gracefully.
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
          // Need interactive consent for additional scopes
          console.log('Silent token acquisition failed, requesting consent via popup');
          try {
            const response = await pca.acquireTokenPopup({ scopes: GRAPH_SCOPES, account: accounts[0], redirectUri: `${window.location.origin}/auth-popup.html` });
            tokenCache.current = {
              token: response.accessToken,
              expiresAt: response.expiresOn?.getTime() || Date.now() + 3600000,
            };
            return response.accessToken;
          } catch (popupError) {
            console.warn('Interactive token acquisition failed:', popupError);
            return null;
          }
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

  // Acquire a token with minimal LOGIN_SCOPES (for profile fetch only)
  const getLoginToken = useCallback(async (): Promise<string | null> => {
    try {
      const pca = await getMsalInstance();
      const accounts = pca.getAllAccounts();
      if (accounts.length === 0) return null;

      const response = await pca.acquireTokenSilent({
        scopes: LOGIN_SCOPES,
        account: accounts[0],
      });
      return response.accessToken;
    } catch {
      return null;
    }
  }, []);

  // Initialize authentication
  useEffect(() => {
    async function initAuth() {
      setState((prev) => ({ ...prev, isLoading: true }));

      try {
        const pca = await getMsalInstance();

        // Clean up URL hash (e.g. #code=... from redirect flow)
        if (window.location.hash && window.location.hash.includes('code=')) {
          window.history.replaceState(null, '', window.location.pathname + window.location.search);
        }

        // In Teams, try multiple auth strategies in order
        console.log('[MDEdit Auth] initAuth: isRunningInTeams =', isRunningInTeams);
        if (isRunningInTeams) {
          // Strategy 1: Teams SDK getAuthToken — gets SSO token from Teams host.
          // Works without admin consent if Teams client IDs are pre-authorized.
          // Token is a JWT with user identity claims (oid, name, preferred_username).
          try {
            console.log('[MDEdit Auth] Trying Teams SDK getAuthToken...');
            const ssoToken = await authentication.getAuthToken();
            console.log('[MDEdit Auth] getAuthToken succeeded');

            // Decode JWT payload to extract user identity
            const parts = ssoToken.split('.');
            const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
            const payload = JSON.parse(atob(base64));

            const user: User = {
              id: payload.oid || payload.sub || 'teams-user',
              displayName: payload.name || 'Teams User',
              mail: payload.preferred_username || null,
              userPrincipalName: payload.preferred_username || '',
            };

            setState({
              user,
              isAuthenticated: true,
              isLoading: false,
              error: null,
            });

            // Strategy 1 gives us user identity but no MSAL account.
            // Try to silently establish an MSAL account in the background
            // so getToken() works for Graph API calls (People, OneDrive, etc.)
            // If this fails (e.g. admin consent not granted), Graph features
            // gracefully degrade — task assignments are still tracked locally.
            const loginHint = payload.preferred_username || payload.upn;
            (async () => {
              try {
                const response = await pca.ssoSilent({ scopes: LOGIN_SCOPES, loginHint });
                if (response?.account) {
                  pca.setActiveAccount(response.account);
                  console.log('[MDEdit Auth] Background ssoSilent succeeded — Graph API ready');
                }
              } catch {
                console.log('[MDEdit Auth] Graph API unavailable (admin consent may be required). Task assignments will be tracked locally.');
              }
            })();

            return;
          } catch (authTokenError) {
            console.warn('[MDEdit Auth] Teams getAuthToken failed:', authTokenError);
          }

          // Strategy 2: MSAL NAA ssoSilent
          try {
            console.log('[MDEdit Auth] Trying ssoSilent...');
            const ssoResponse = await pca.ssoSilent({ scopes: LOGIN_SCOPES });
            if (ssoResponse?.account) {
              pca.setActiveAccount(ssoResponse.account);
              tokenCache.current = {
                token: ssoResponse.accessToken,
                expiresAt: ssoResponse.expiresOn?.getTime() || Date.now() + 3600000,
              };
              const user = await fetchUserProfile(ssoResponse.accessToken);
              setState({
                user,
                isAuthenticated: !!user,
                isLoading: false,
                error: null,
              });
              return;
            }
          } catch (ssoError) {
            console.warn('[MDEdit Auth] ssoSilent failed:', ssoError);
          }

          // Strategy 3: MSAL NAA loginPopup (routed through Teams host)
          try {
            console.log('[MDEdit Auth] Trying loginPopup via NAA...');
            const popupResponse = await pca.loginPopup({ scopes: LOGIN_SCOPES });
            if (popupResponse?.account) {
              pca.setActiveAccount(popupResponse.account);
              tokenCache.current = {
                token: popupResponse.accessToken,
                expiresAt: popupResponse.expiresOn?.getTime() || Date.now() + 3600000,
              };
              const user = await fetchUserProfile(popupResponse.accessToken);
              setState({
                user,
                isAuthenticated: !!user,
                isLoading: false,
                error: null,
              });
              return;
            }
          } catch (popupError) {
            console.error('[MDEdit Auth] loginPopup also failed:', popupError);
          }
        }

        // Check for existing accounts (standalone browser path)
        const accounts = pca.getAllAccounts();
        console.log('[MDEdit Auth] Cached accounts:', accounts.length);

        if (accounts.length > 0) {
          pca.setActiveAccount(accounts[0]);

          // Acquire with LOGIN_SCOPES only for initial profile fetch
          // (NOT GRAPH_SCOPES — MSA accounts may not have consented to full scopes yet)
          const token = await getLoginToken();

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
        console.log('[MDEdit Auth] No authenticated user found');
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
  }, [getLoginToken, fetchUserProfile]);

  // Sign in
  const signIn = useCallback(async () => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      const pca = await getMsalInstance();

      if (isRunningInTeams) {
        // In Teams: use ssoSilent (NAA) — no popup needed, Teams host handles auth
        try {
          const response = await pca.ssoSilent({ scopes: LOGIN_SCOPES });
          if (response?.account) {
            pca.setActiveAccount(response.account);
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
            return;
          }
        } catch (ssoError) {
          // If ssoSilent fails, try loginPopup — NAA routes this through Teams host
          console.log('Teams ssoSilent failed, trying loginPopup via NAA...');
          const response = await pca.loginPopup({ scopes: LOGIN_SCOPES });
          if (response?.account) {
            pca.setActiveAccount(response.account);
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
            return;
          }
        }
      } else {
        // Standalone browser: use popup with redirect bridge
        const loginRequest: PopupRequest = {
          scopes: LOGIN_SCOPES,
          redirectUri: `${window.location.origin}/auth-popup.html`,
        };

        const response = await pca.loginPopup(loginRequest);

        if (response.account) {
          pca.setActiveAccount(response.account);
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
          return;
        }
      }

      setState((prev) => ({ ...prev, isLoading: false }));
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
    isInTeams: isRunningInTeams,
  };
}
