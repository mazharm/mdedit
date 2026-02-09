import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { handleMessage } from './messageHandler';

export function createWebviewPanel(
  context: vscode.ExtensionContext,
  initialFilePath?: string,
) {
  const panel = vscode.window.createWebviewPanel(
    'mdedit',
    'MDEdit',
    vscode.ViewColumn.One,
    {
      enableScripts: true,
      retainContextWhenHidden: true,
      localResourceRoots: [
        vscode.Uri.file(path.join(context.extensionPath, 'media')),
      ],
    },
  );

  panel.webview.html = getWebviewContent(panel.webview, context);

  // Handle messages from the webview
  panel.webview.onDidReceiveMessage(
    (message: Record<string, unknown>) => {
      if (message.type === 'ready' && initialFilePath) {
        // When webview is ready and we have a file to load, send it
        loadFileIntoWebview(panel.webview, initialFilePath);
      }
      handleMessage(panel.webview, message);
    },
    undefined,
    context.subscriptions,
  );
}

async function loadFileIntoWebview(webview: vscode.Webview, filePath: string) {
  try {
    const uri = vscode.Uri.file(filePath);
    const contentBytes = await vscode.workspace.fs.readFile(uri);
    const content = Buffer.from(contentBytes).toString('utf-8');
    const fileName = path.basename(filePath);

    webview.postMessage({
      type: 'fileOpened',
      content,
      fileName,
      filePath,
    });
  } catch (err) {
    console.error('[MDEdit] Failed to load initial file:', err);
  }
}

export function getWebviewContent(
  webview: vscode.Webview,
  context: vscode.ExtensionContext,
): string {
  const mediaPath = path.join(context.extensionPath, 'media');
  const nonce = getNonce();

  // Read the Vite manifest to discover asset file names
  const manifestPath = path.join(mediaPath, '.vite', 'manifest.json');
  let entryJs = 'assets/index.js';
  let entryCss = '';

  if (fs.existsSync(manifestPath)) {
    try {
      const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
      const entry = manifest['index.html'];
      if (entry) {
        entryJs = entry.file;
        if (entry.css && entry.css.length > 0) {
          entryCss = entry.css[0];
        }
      }
    } catch (err) {
      console.error('[MDEdit] Failed to read Vite manifest:', err);
    }
  }

  const scriptUri = webview.asWebviewUri(
    vscode.Uri.file(path.join(mediaPath, entryJs)),
  );
  const styleUri = entryCss
    ? webview.asWebviewUri(vscode.Uri.file(path.join(mediaPath, entryCss)))
    : null;

  // Determine current VS Code theme kind for the webview body
  const themeKind = vscode.window.activeColorTheme.kind;
  let themeKindAttr = 'vscode-light';
  if (themeKind === vscode.ColorThemeKind.Dark) {
    themeKindAttr = 'vscode-dark';
  } else if (themeKind === vscode.ColorThemeKind.HighContrast) {
    themeKindAttr = 'vscode-high-contrast';
  } else if (themeKind === vscode.ColorThemeKind.HighContrastLight) {
    themeKindAttr = 'vscode-high-contrast-light';
  }

  const csp = [
    `default-src 'none'`,
    `style-src ${webview.cspSource} 'unsafe-inline'`,
    `script-src 'nonce-${nonce}'`,
    `font-src ${webview.cspSource}`,
    `img-src ${webview.cspSource} https: data:`,
    `connect-src https://graph.microsoft.com https://login.microsoftonline.com`,
  ].join('; ');

  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta http-equiv="Content-Security-Policy" content="${csp}" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>MDEdit</title>
    ${styleUri ? `<link rel="stylesheet" href="${styleUri}" />` : ''}
    <style>
      html, body { margin: 0; padding: 0; height: 100%; overflow: hidden; }
      #loading-fallback {
        display: flex;
        align-items: center;
        justify-content: center;
        height: 100vh;
        font-family: system-ui, -apple-system, sans-serif;
      }
    </style>
  </head>
  <body data-vscode-theme-kind="${themeKindAttr}">
    <div id="root">
      <div id="loading-fallback">Loading MDEdit...</div>
    </div>
    <script nonce="${nonce}" type="module" src="${scriptUri}"></script>
  </body>
</html>`;
}

function getNonce(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}
