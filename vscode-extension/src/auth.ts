import * as vscode from 'vscode';

const GRAPH_SCOPES = [
  'User.Read',
  'User.ReadBasic.All',
  'People.Read',
  'Files.ReadWrite',
  'Tasks.ReadWrite',
  'Mail.Send',
];

export interface UserProfile {
  id: string;
  displayName: string;
  mail: string | null;
  userPrincipalName: string;
  avatar?: string;
}

/**
 * Get a Microsoft auth token via VS Code's built-in authentication provider.
 * When createIfNone is false, first checks for existing session, then tries
 * silent acquisition (reuses VS Code's signed-in Microsoft account without prompt).
 * When createIfNone is true, shows an interactive sign-in prompt.
 */
export async function getTokenForScopes(
  createIfNone = false,
): Promise<string | null> {
  try {
    if (createIfNone) {
      // Interactive: prompt the user
      const session = await vscode.authentication.getSession(
        'microsoft',
        GRAPH_SCOPES,
        { createIfNone: true },
      );
      return session?.accessToken ?? null;
    }

    // First try: check for an existing session with these scopes
    let session = await vscode.authentication.getSession(
      'microsoft',
      GRAPH_SCOPES,
      { createIfNone: false },
    );
    if (session) return session.accessToken;

    // Second try: silently acquire using existing VS Code Microsoft credentials
    // This reuses the user's signed-in account without showing any UI
    session = await vscode.authentication.getSession(
      'microsoft',
      GRAPH_SCOPES,
      { silent: true },
    );
    return session?.accessToken ?? null;
  } catch {
    return null;
  }
}

/**
 * Fetch the user profile from Microsoft Graph.
 * If forceNew is true, prompts the user to sign in interactively.
 */
export async function getUserProfile(
  forceNew = false,
): Promise<UserProfile | null> {
  const token = await getTokenForScopes(forceNew);
  if (!token) return null;

  try {
    const res = await fetch('https://graph.microsoft.com/v1.0/me', {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return null;
    const data = await res.json();

    // Try to fetch profile photo
    let avatar: string | undefined;
    try {
      const photoRes = await fetch(
        'https://graph.microsoft.com/v1.0/me/photo/$value',
        { headers: { Authorization: `Bearer ${token}` } },
      );
      if (photoRes.ok) {
        const buf = Buffer.from(await photoRes.arrayBuffer());
        avatar = `data:image/jpeg;base64,${buf.toString('base64')}`;
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
  } catch {
    return null;
  }
}
