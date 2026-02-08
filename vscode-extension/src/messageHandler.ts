import * as vscode from 'vscode';
import { getTokenForScopes, getUserProfile } from './auth';

export function handleMessage(
  webview: vscode.Webview,
  message: Record<string, unknown>,
) {
  const { type, requestId } = message as { type: string; requestId?: string };

  switch (type) {
    case 'ready':
      // Webview is ready — no response needed
      break;

    case 'getToken':
      handleGetToken(webview, requestId);
      break;

    case 'getUserProfile':
      handleGetUserProfile(webview, requestId, false);
      break;

    case 'signIn':
      handleGetUserProfile(webview, requestId, true);
      break;

    case 'signOut':
      handleSignOut(webview, requestId);
      break;

    case 'openFile':
      handleOpenFile(webview, requestId);
      break;

    case 'saveFileAs':
      handleSaveFileAs(
        webview,
        requestId,
        message.content as string,
        message.suggestedName as string | undefined,
      );
      break;

    case 'writeFile':
      handleWriteFile(
        webview,
        requestId,
        message.filePath as string,
        message.content as string,
      );
      break;

    default:
      console.warn(`[MDEdit] Unknown message type: ${type}`);
  }
}

async function handleGetToken(webview: vscode.Webview, requestId?: string) {
  const token = await getTokenForScopes(false);
  webview.postMessage({ type: 'token', token, requestId });
}

async function handleGetUserProfile(
  webview: vscode.Webview,
  requestId?: string,
  forceNew?: boolean,
) {
  const user = await getUserProfile(forceNew);
  webview.postMessage({ type: 'userProfile', user, requestId });
}

async function handleSignOut(webview: vscode.Webview, requestId?: string) {
  // VS Code doesn't have a built-in "sign out" for auth sessions,
  // but we can signal the webview that sign-out completed
  webview.postMessage({ type: 'signedOut', requestId });
}

async function handleOpenFile(webview: vscode.Webview, requestId?: string) {
  try {
    const uris = await vscode.window.showOpenDialog({
      canSelectFiles: true,
      canSelectFolders: false,
      canSelectMany: false,
      filters: { 'Markdown files': ['md', 'markdown'] },
    });

    if (!uris || uris.length === 0) {
      webview.postMessage({
        type: 'fileOpened',
        requestId,
        error: 'cancelled',
      });
      return;
    }

    const uri = uris[0];
    const contentBytes = await vscode.workspace.fs.readFile(uri);
    const content = Buffer.from(contentBytes).toString('utf-8');
    const fileName = uri.path.split('/').pop() ?? 'untitled.md';

    webview.postMessage({
      type: 'fileOpened',
      content,
      fileName,
      filePath: uri.fsPath,
      requestId,
    });
  } catch (err) {
    webview.postMessage({
      type: 'fileOpened',
      requestId,
      error: err instanceof Error ? err.message : 'Failed to open file',
    });
  }
}

async function handleSaveFileAs(
  webview: vscode.Webview,
  requestId?: string,
  content?: string,
  suggestedName?: string,
) {
  try {
    const uri = await vscode.window.showSaveDialog({
      defaultUri: suggestedName
        ? vscode.Uri.file(suggestedName)
        : undefined,
      filters: { 'Markdown files': ['md'] },
    });

    if (!uri) {
      webview.postMessage({
        type: 'fileSaved',
        success: false,
        requestId,
        error: 'cancelled',
      });
      return;
    }

    const contentBuffer = Buffer.from(content ?? '', 'utf-8');
    await vscode.workspace.fs.writeFile(uri, contentBuffer);

    const fileName = uri.path.split('/').pop() ?? 'untitled.md';
    webview.postMessage({
      type: 'fileSaved',
      success: true,
      filePath: uri.fsPath,
      fileName,
      requestId,
    });
  } catch (err) {
    webview.postMessage({
      type: 'fileSaved',
      success: false,
      requestId,
      error: err instanceof Error ? err.message : 'Failed to save file',
    });
  }
}

async function handleWriteFile(
  webview: vscode.Webview,
  requestId?: string,
  filePath?: string,
  content?: string,
) {
  try {
    if (!filePath) throw new Error('No file path provided');
    const uri = vscode.Uri.file(filePath);
    const contentBuffer = Buffer.from(content ?? '', 'utf-8');
    await vscode.workspace.fs.writeFile(uri, contentBuffer);
    webview.postMessage({ type: 'fileWritten', success: true, requestId });
  } catch (err) {
    webview.postMessage({
      type: 'fileWritten',
      success: false,
      requestId,
      error: err instanceof Error ? err.message : 'Failed to write file',
    });
  }
}
