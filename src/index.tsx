import React from 'react';
import ReactDOM from 'react-dom/client';
import { ErrorBoundary } from './ErrorBoundary';
import App from './App';
import './index.css';

// Log to help debug blank page issues
console.log('MDEdit Teams: Starting app initialization...');

const root = document.getElementById('root');
if (!root) {
  console.error('MDEdit Teams: Root element not found!');
} else {
  console.log('MDEdit Teams: Root element found, rendering app...');
  ReactDOM.createRoot(root).render(
    <React.StrictMode>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </React.StrictMode>
  );
  console.log('MDEdit Teams: App rendered');
}
