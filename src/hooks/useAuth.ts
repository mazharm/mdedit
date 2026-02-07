import { useCallback, useMemo } from 'react';
import { useTeamsSSO } from './useTeamsSSO';
import { useGoogleAuth } from './useGoogleAuth';
import type { AuthProvider } from '../stores/commentStore';

export interface AuthCapabilities {
  canUseOneDrive: boolean;
  canUsePeopleSearch: boolean;
  canUseTodoTasks: boolean;
}

export interface AuthUser {
  id: string;
  displayName: string;
  mail: string | null;
  userPrincipalName: string;
  avatar?: string;
  provider: AuthProvider;
}

export function useAuth() {
  const microsoft = useTeamsSSO();
  const google = useGoogleAuth();

  // Determine which provider is active (Microsoft takes priority if both authenticated)
  const activeProvider: AuthProvider | null = microsoft.isAuthenticated
    ? 'microsoft'
    : google.isAuthenticated
      ? 'google'
      : null;

  const isAuthenticated = microsoft.isAuthenticated || google.isAuthenticated;
  const isLoading = microsoft.isLoading || google.isLoading;

  const user: AuthUser | null = useMemo(() => {
    if (microsoft.isAuthenticated && microsoft.user) {
      return {
        id: microsoft.user.id,
        displayName: microsoft.user.displayName,
        mail: microsoft.user.mail,
        userPrincipalName: microsoft.user.userPrincipalName,
        avatar: microsoft.user.avatar,
        provider: 'microsoft' as const,
      };
    }
    if (google.isAuthenticated && google.user) {
      return {
        id: google.user.id,
        displayName: google.user.displayName,
        mail: google.user.mail,
        userPrincipalName: google.user.mail,
        avatar: google.user.avatar,
        provider: 'google' as const,
      };
    }
    return null;
  }, [microsoft.isAuthenticated, microsoft.user, google.isAuthenticated, google.user]);

  const capabilities: AuthCapabilities = useMemo(() => {
    if (activeProvider === 'microsoft') {
      return {
        canUseOneDrive: true,
        canUsePeopleSearch: true,
        canUseTodoTasks: true,
      };
    }
    // Google users have no Microsoft Graph access
    return {
      canUseOneDrive: false,
      canUsePeopleSearch: false,
      canUseTodoTasks: false,
    };
  }, [activeProvider]);

  const signInWithMicrosoft = microsoft.signIn;
  const signInWithGoogle = google.signIn;

  const signOut = useCallback(() => {
    if (microsoft.isAuthenticated) {
      microsoft.signOut();
    }
    if (google.isAuthenticated) {
      google.signOut();
    }
  }, [microsoft, google]);

  // Only return a Microsoft token getter when Microsoft is the active provider
  const getMicrosoftToken = useCallback(async (): Promise<string | null> => {
    if (activeProvider === 'microsoft') {
      return microsoft.getToken();
    }
    return null;
  }, [activeProvider, microsoft]);

  return {
    user,
    isAuthenticated,
    isLoading,
    activeProvider,
    capabilities,
    isInTeams: microsoft.isInTeams,
    signInWithMicrosoft,
    signInWithGoogle,
    signOut,
    getMicrosoftToken,
    // Expose raw getToken for backward compat with components that need it
    getToken: microsoft.getToken,
  };
}
