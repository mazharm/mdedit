/**
 * Copies the Vite build output (dist/) into vscode-extension/media/
 * so the VS Code extension can serve the SPA as a webview.
 */
import { cpSync, rmSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const src = join(root, 'dist');
const dest = join(root, 'vscode-extension', 'media');

if (!existsSync(src)) {
  console.error('Error: dist/ directory does not exist. Run "npm run build" first.');
  process.exit(1);
}

// Clean destination
if (existsSync(dest)) {
  rmSync(dest, { recursive: true, force: true });
}

// Copy dist → media
cpSync(src, dest, { recursive: true });
console.log(`Copied dist/ → vscode-extension/media/`);
