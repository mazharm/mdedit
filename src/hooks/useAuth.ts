import { useCallback, useMemo } from 'react';
import { useTeamsSSO } from './useTeamsSSO';
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

  const inVSCode = isInVSCode();

  const activeProvider: AuthProvider | null = inVSCode && vscode.isAuthenticated
    ? 'microsoft'
    : microsoft.isAuthenticated
      ? 'microsoft'
      : null;

  const isAuthenticated = (inVSCode && vscode.isAuthenticated) || microsoft.isAuthenticated;
  const isLoading = inVSCode ? vscode.isLoading : microsoft.isLoading;

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
    return null;
  }, [inVSCode, vscode.isAuthenticated, vscode.user, microsoft.isAuthenticated, microsoft.user]);

  const capabilities: AuthCapabilities = useMemo(() => {
    if (activeProvider === 'microsoft') {
      return {
        canUseOneDrive: true,
        canUsePeopleSearch: true,
        canUseTodoTasks: true,
        canSendEmail: true,
      };
    }
    return {
      canUseOneDrive: false,
      canUsePeopleSearch: false,
      canUseTodoTasks: false,
      canSendEmail: false,
    };
  }, [activeProvider]);

  const signInWithMicrosoft = inVSCode ? vscode.signIn : microsoft.signIn;

  const signOut = useCallback(() => {
    if (inVSCode && vscode.isAuthenticated) {
      vscode.signOut();
      return;
    }
    if (microsoft.isAuthenticated) {
      microsoft.signOut();
    }
  }, [inVSCode, vscode, microsoft]);

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
    signOut,
    getMicrosoftToken,
    getToken: inVSCode ? vscode.getToken : microsoft.getToken,
  };
}
