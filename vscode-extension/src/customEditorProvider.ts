import * as vscode from 'vscode';
import * as path from 'path';
import { getWebviewContent } from './webviewPanel';
import { handleMessage } from './messageHandler';

export class MdEditEditorProvider implements vscode.CustomTextEditorProvider {
  public static readonly viewType = 'mdedit.markdownEditor';

  constructor(private readonly context: vscode.ExtensionContext) {}

  public static register(context: vscode.ExtensionContext): vscode.Disposable {
    const provider = new MdEditEditorProvider(context);
    return vscode.window.registerCustomEditorProvider(
      MdEditEditorProvider.viewType,
      provider,
      {
        webviewOptions: {
          retainContextWhenHidden: true,
        },
      },
    );
  }

  public async resolveCustomTextEditor(
    document: vscode.TextDocument,
    webviewPanel: vscode.WebviewPanel,
  ): Promise<void> {
    const mediaPath = path.join(this.context.extensionPath, 'media');

    webviewPanel.webview.options = {
      enableScripts: true,
      localResourceRoots: [vscode.Uri.file(mediaPath)],
    };

    webviewPanel.webview.html = getWebviewContent(
      webviewPanel.webview,
      this.context,
    );

    // Track whether we're applying a webview edit to the TextDocument
    // to avoid echoing it back to the webview
    let isApplyingWebviewEdit = false;

    // Handle messages from the webview
    const messageDisposable = webviewPanel.webview.onDidReceiveMessage(
      (message: Record<string, unknown>) => {
        const { type } = message as { type: string };

        if (type === 'ready') {
          // Send the document content to the webview
          sendDocumentToWebview();
        } else if (type === 'contentChanged') {
          // Webview content changed — apply to the TextDocument
          const content = message.content as string;
          if (content === document.getText()) return;

          isApplyingWebviewEdit = true;
          const edit = new vscode.WorkspaceEdit();
          const fullRange = new vscode.Range(
            document.positionAt(0),
            document.positionAt(document.getText().length),
          );
          edit.replace(document.uri, fullRange, content);
          vscode.workspace.applyEdit(edit).then(() => {
            isApplyingWebviewEdit = false;
          });
        } else if (type === 'writeFile') {
          // In custom editor, "Save" from the SPA toolbar → save the TextDocument
          document.save();
        } else {
          // Auth, openFile, saveFileAs etc. — delegate to standard handler
          handleMessage(webviewPanel.webview, message);
        }
      },
    );

    // Watch for external changes to the document (git checkout, other editor, etc.)
    const changeDisposable = vscode.workspace.onDidChangeTextDocument((e) => {
      if (e.document.uri.toString() !== document.uri.toString()) return;
      if (isApplyingWebviewEdit) return;
      if (e.contentChanges.length === 0) return;
      // External change — push updated content to the webview
      sendDocumentToWebview();
    });

    // When the document is saved, tell the webview to clear its dirty flag
    const saveDisposable = vscode.workspace.onDidSaveTextDocument((saved) => {
      if (saved.uri.toString() === document.uri.toString()) {
        webviewPanel.webview.postMessage({ type: 'documentSaved' });
      }
    });

    webviewPanel.onDidDispose(() => {
      messageDisposable.dispose();
      changeDisposable.dispose();
      saveDisposable.dispose();
    });

    function sendDocumentToWebview() {
      const content = document.getText();
      const fileName = path.basename(document.uri.fsPath);
      webviewPanel.webview.postMessage({
        type: 'fileOpened',
        content,
        fileName,
        filePath: document.uri.fsPath,
      });
    }
  }
}
