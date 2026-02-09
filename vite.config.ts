import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig(({ command }) => {
  const config = {
    plugins: [react()],
    server: {
      port: 3002,
      https: undefined as { key: Buffer; cert: Buffer } | undefined,
      headers: {
        // Allow Teams to embed this app in an iframe
        'Content-Security-Policy': "frame-ancestors 'self' https://teams.microsoft.com https://*.teams.microsoft.com https://*.skype.com https://*.microsoft.com https://teams.cloud.microsoft https://*.teams.cloud.microsoft",
        // Required for Teams embedding
        'X-Frame-Options': 'ALLOW-FROM https://teams.microsoft.com',
        // Allow popups for authentication
        'Cross-Origin-Opener-Policy': 'unsafe-none',
        'Cross-Origin-Embedder-Policy': 'unsafe-none',
      },
    },
    build: {
      outDir: 'dist',
      sourcemap: false,
      manifest: true,
    },
    // Required for msal-browser to work correctly
    optimizeDeps: {
      include: ['@azure/msal-browser'],
    },
  };

  // Enable HTTPS for development (required for Teams)
  if (command === 'serve') {
    const certPath = path.join(__dirname, 'certs');
    const keyFile = path.join(certPath, 'localhost-key.pem');
    const certFile = path.join(certPath, 'localhost.pem');

    if (fs.existsSync(keyFile) && fs.existsSync(certFile)) {
      config.server.https = {
        key: fs.readFileSync(keyFile),
        cert: fs.readFileSync(certFile),
      };
    }
  }

  return config;
});
