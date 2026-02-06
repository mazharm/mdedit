export type GetTokenFn = () => Promise<string | null>;

const GRAPH_BASE_URL = 'https://graph.microsoft.com/v1.0';

export interface GraphUser {
  id: string;
  displayName: string;
  mail: string | null;
  userPrincipalName: string;
  avatar?: string;
}

export interface GraphFile {
  id: string;
  name: string;
  size: number;
  lastModifiedDateTime: string;
  webUrl: string;
  folder?: { childCount: number };
  file?: { mimeType: string };
  parentReference?: {
    id: string;
    path: string;
  };
  '@microsoft.graph.downloadUrl'?: string;
}

export interface GraphResponse<T> {
  '@odata.context'?: string;
  value: T[];
}

export class GraphError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public errorCode?: string
  ) {
    super(message);
    this.name = 'GraphError';
  }
}

async function graphFetch<T>(
  getToken: GetTokenFn,
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = await getToken();

  if (!token) {
    throw new GraphError('No access token available', 401, 'NoToken');
  }

  const url = endpoint.startsWith('http') ? endpoint : `${GRAPH_BASE_URL}${endpoint}`;

  const response = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    let errorMessage = response.statusText;
    let errorCode: string | undefined;

    try {
      const errorData = await response.json();
      errorMessage = errorData.error?.message || errorMessage;
      errorCode = errorData.error?.code;
    } catch {
      // Ignore JSON parse errors
    }

    throw new GraphError(errorMessage, response.status, errorCode);
  }

  // Handle empty responses
  const contentType = response.headers.get('content-type');
  if (response.status === 204 || !contentType) {
    return {} as T;
  }

  // Handle binary responses
  if (contentType.includes('image/') || contentType.includes('application/octet-stream')) {
    return response.blob() as Promise<T>;
  }

  // Handle text responses
  if (contentType.includes('text/')) {
    return response.text() as Promise<T>;
  }

  return response.json();
}

export async function graphGet<T>(getToken: GetTokenFn, endpoint: string): Promise<T> {
  return graphFetch<T>(getToken, endpoint);
}

export async function graphPost<T>(
  getToken: GetTokenFn,
  endpoint: string,
  body: unknown
): Promise<T> {
  return graphFetch<T>(getToken, endpoint, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function graphPut<T>(
  getToken: GetTokenFn,
  endpoint: string,
  body: string | Blob
): Promise<T> {
  const token = await getToken();

  if (!token) {
    throw new GraphError('No access token available', 401, 'NoToken');
  }

  const url = endpoint.startsWith('http') ? endpoint : `${GRAPH_BASE_URL}${endpoint}`;

  const response = await fetch(url, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': typeof body === 'string' ? 'text/plain' : 'application/octet-stream',
    },
    body,
  });

  if (!response.ok) {
    let errorMessage = response.statusText;
    try {
      const errorData = await response.json();
      errorMessage = errorData.error?.message || errorMessage;
    } catch {
      // Ignore
    }
    throw new GraphError(errorMessage, response.status);
  }

  const contentType = response.headers.get('content-type');
  if (contentType?.includes('application/json')) {
    return response.json();
  }

  return {} as T;
}

export async function graphPatch<T>(
  getToken: GetTokenFn,
  endpoint: string,
  body: unknown
): Promise<T> {
  return graphFetch<T>(getToken, endpoint, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
}

export async function graphDelete(getToken: GetTokenFn, endpoint: string): Promise<void> {
  await graphFetch<void>(getToken, endpoint, {
    method: 'DELETE',
  });
}
