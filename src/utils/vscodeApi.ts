// VS Code Webview API bridge
// Provides environment detection and postMessage communication with the extension host

interface VSCodeApi {
  postMessage(message: unknown): void;
  getState(): unknown;
  setState(state: unknown): void;
}

declare function acquireVsCodeApi(): VSCodeApi;

let vscodeApi: VSCodeApi | null = null;

/** Check if the app is running inside a VS Code webview */
export function isInVSCode(): boolean {
  return typeof acquireVsCodeApi === 'function';
}

/** Lazily acquire and cache the VS Code API handle */
export function getVSCodeApi(): VSCodeApi | null {
  if (!isInVSCode()) return null;
  if (!vscodeApi) {
    vscodeApi = acquireVsCodeApi();
    // Signal to the extension host that the webview is ready
    vscodeApi.postMessage({ type: 'ready' });
  }
  return vscodeApi;
}

/** Send a typed request to the extension host and wait for a matching response */
export function sendRequest<T>(
  request: Record<string, unknown>,
  responseType: string,
  timeout = 30000,
): Promise<T> {
  return new Promise((resolve, reject) => {
    const api = getVSCodeApi();
    if (!api) {
      reject(new Error('Not running in VS Code'));
      return;
    }

    const requestId = crypto.randomUUID();

    const timer = setTimeout(() => {
      window.removeEventListener('message', handler);
      reject(new Error(`VS Code request '${request.type}' timed out after ${timeout}ms`));
    }, timeout);

    function handler(event: MessageEvent) {
      const data = event.data;
      if (data && data.type === responseType && data.requestId === requestId) {
        clearTimeout(timer);
        window.removeEventListener('message', handler);
        if (data.error) {
          reject(new Error(data.error));
        } else {
          resolve(data as T);
        }
      }
    }

    window.addEventListener('message', handler);
    api.postMessage({ ...request, requestId });
  });
}
