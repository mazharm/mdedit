import { useCallback, useMemo } from 'react';
import { useTeamsSSO } from './useTeamsSSO';
import { useGoogleAuth } from './useGoogleAuth';
import { useVSCodeAuth } from './useVSCodeAuth';
import { isInVSCode } from '../utils/vscodeApi';
import type { AuthProvider } from '../stores/commentStore';

export interface AuthCapabilities {
  canUseOneDrive: boolean;
  canUsePeopleSearch: boolean;
  canUseTodoTasks: boolean;
  canSendEmail: boolean;
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
  const vscode = useVSCodeAuth();
  const microsoft = useTeamsSSO();
  const google = useGoogleAuth();

  const inVSCode = isInVSCode();

  // Determine which provider is active (VS Code > Microsoft > Google)
  const activeProvider: AuthProvider | null = inVSCode && vscode.isAuthenticated
    ? 'microsoft'
    : microsoft.isAuthenticated
      ? 'microsoft'
      : google.isAuthenticated
        ? 'google'
        : null;

  const isAuthenticated = (inVSCode && vscode.isAuthenticated) || microsoft.isAuthenticated || google.isAuthenticated;
  const isLoading = inVSCode ? vscode.isLoading : (microsoft.isLoading || google.isLoading);

  const user: AuthUser | null = useMemo(() => {
    if (inVSCode && vscode.isAuthenticated && vscode.user) {
      return {
        id: vscode.user.id,
        displayName: vscode.user.displayName,
        mail: vscode.user.mail,
        userPrincipalName: vscode.user.userPrincipalName,
        avatar: vscode.user.avatar,
        provider: 'microsoft' as const,
      };
    }
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
  }, [inVSCode, vscode.isAuthenticated, vscode.user, microsoft.isAuthenticated, microsoft.user, google.isAuthenticated, google.user]);

  const capabilities: AuthCapabilities = useMemo(() => {
    if (activeProvider === 'microsoft') {
      return {
        canUseOneDrive: true,
        canUsePeopleSearch: true,
        canUseTodoTasks: true,
        canSendEmail: true,
      };
    }
    // Google users have no Microsoft Graph access
    return {
      canUseOneDrive: false,
      canUsePeopleSearch: false,
      canUseTodoTasks: false,
      canSendEmail: false,
    };
  }, [activeProvider]);

  const signInWithMicrosoft = inVSCode ? vscode.signIn : microsoft.signIn;
  const signInWithGoogle = google.signIn;

  const signOut = useCallback(() => {
    if (inVSCode && vscode.isAuthenticated) {
      vscode.signOut();
      return;
    }
    if (microsoft.isAuthenticated) {
      microsoft.signOut();
    }
    if (google.isAuthenticated) {
      google.signOut();
    }
  }, [inVSCode, vscode, microsoft, google]);

  // Only return a Microsoft token getter when Microsoft is the active provider
  const getMicrosoftToken = useCallback(async (): Promise<string | null> => {
    if (activeProvider === 'microsoft') {
      if (inVSCode) return vscode.getToken();
      return microsoft.getToken();
    }
    return null;
  }, [activeProvider, inVSCode, vscode, microsoft]);

  return {
    user,
    isAuthenticated,
    isLoading,
    activeProvider,
    capabilities,
    isInTeams: inVSCode ? false : microsoft.isInTeams,
    signInWithMicrosoft,
    signInWithGoogle,
    signOut,
    getMicrosoftToken,
    // Expose raw getToken for backward compat with components that need it
    getToken: inVSCode ? vscode.getToken : microsoft.getToken,
  };
}
