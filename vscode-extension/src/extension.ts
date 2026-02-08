import * as vscode from 'vscode';
import { createWebviewPanel } from './webviewPanel';
import { MdEditEditorProvider } from './customEditorProvider';

export function activate(context: vscode.ExtensionContext) {
  // Register the custom editor provider for .md files
  context.subscriptions.push(MdEditEditorProvider.register(context));

  // Command: Open the WYSIWYG editor (auto-loads active .md if any)
  context.subscriptions.push(
    vscode.commands.registerCommand('mdedit.openEditor', () => {
      const activeEditor = vscode.window.activeTextEditor;
      let filePath: string | undefined;
      if (activeEditor && activeEditor.document.fileName.endsWith('.md')) {
        filePath = activeEditor.document.uri.fsPath;
      }
      createWebviewPanel(context, filePath);
    })
  );

  // Command: Open editor for a specific file (context menu on .md files)
  context.subscriptions.push(
    vscode.commands.registerCommand('mdedit.openEditorForFile', (uri?: vscode.Uri) => {
      const filePath = uri?.fsPath
        ?? vscode.window.activeTextEditor?.document.uri.fsPath;
      createWebviewPanel(context, filePath);
    })
  );
}

export function deactivate() {}
