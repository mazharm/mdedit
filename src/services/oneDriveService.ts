import { graphGet, graphPut, GetTokenFn, GraphFile, GraphResponse } from './graphService';

/**
 * Validate that an ID is safe for use in Graph API URL paths.
 * Prevents path traversal and injection via crafted IDs.
 */
function validateId(id: string): string {
  if (!id || /[/\\?#&]/.test(id)) {
    throw new Error(`Invalid ID: ${id}`);
  }
  return id;
}

export interface DriveFile {
  id: string;
  name: string;
  size: number;
  lastModified: Date;
  webUrl: string;
  isFolder: boolean;
  mimeType?: string;
  parentId?: string;
  path?: string;
}

function mapGraphFile(file: GraphFile): DriveFile {
  return {
    id: file.id,
    name: file.name,
    size: file.size,
    lastModified: new Date(file.lastModifiedDateTime),
    webUrl: file.webUrl,
    isFolder: !!file.folder,
    mimeType: file.file?.mimeType,
    parentId: file.parentReference?.id,
    path: file.parentReference?.path,
  };
}

export async function listRootFiles(getToken: GetTokenFn): Promise<DriveFile[]> {
  try {
    const response = await graphGet<GraphResponse<GraphFile>>(
      getToken,
      '/me/drive/root/children?$select=id,name,size,lastModifiedDateTime,webUrl,folder,file,parentReference&$orderby=name'
    );

    return response.value.map(mapGraphFile);
  } catch (error) {
    console.error('Failed to list root files:', error);
    throw error;
  }
}

export async function listFolderFiles(
  getToken: GetTokenFn,
  folderId: string
): Promise<DriveFile[]> {
  try {
    const safeFolderId = validateId(folderId);
    const response = await graphGet<GraphResponse<GraphFile>>(
      getToken,
      `/me/drive/items/${safeFolderId}/children?$select=id,name,size,lastModifiedDateTime,webUrl,folder,file,parentReference&$orderby=name`
    );

    return response.value.map(mapGraphFile);
  } catch (error) {
    console.error('Failed to list folder files:', error);
    throw error;
  }
}

export async function getFileContent(
  getToken: GetTokenFn,
  fileId: string
): Promise<string> {
  try {
    const safeFileId = validateId(fileId);
    // Get the download URL
    const item = await graphGet<GraphFile>(
      getToken,
      `/me/drive/items/${safeFileId}?$select=@microsoft.graph.downloadUrl`
    );

    const downloadUrl = item['@microsoft.graph.downloadUrl'];

    if (!downloadUrl) {
      throw new Error('Download URL not available');
    }

    // Fetch content directly (no auth needed for download URL)
    const response = await fetch(downloadUrl);
    if (!response.ok) {
      throw new Error(`Failed to download file: ${response.statusText}`);
    }

    return response.text();
  } catch (error) {
    console.error('Failed to get file content:', error);
    throw error;
  }
}

export async function saveFile(
  getToken: GetTokenFn,
  fileId: string,
  content: string
): Promise<DriveFile> {
  try {
    const safeFileId = validateId(fileId);
    const response = await graphPut<GraphFile>(
      getToken,
      `/me/drive/items/${safeFileId}/content`,
      content
    );

    return mapGraphFile(response);
  } catch (error) {
    console.error('Failed to save file:', error);
    throw error;
  }
}

export async function createFile(
  getToken: GetTokenFn,
  parentPath: string,
  fileName: string,
  content: string
): Promise<DriveFile> {
  try {
    // Ensure filename ends with .md
    const name = fileName.endsWith('.md') ? fileName : `${fileName}.md`;

    // Create file at path
    const path = parentPath ? `${parentPath}/${name}` : name;
    const encodedPath = encodeURIComponent(path).replace(/%2F/g, '/');

    const response = await graphPut<GraphFile>(
      getToken,
      `/me/drive/root:/${encodedPath}:/content`,
      content
    );

    return mapGraphFile(response);
  } catch (error) {
    console.error('Failed to create file:', error);
    throw error;
  }
}

export async function createFileInFolder(
  getToken: GetTokenFn,
  folderId: string,
  fileName: string,
  content: string
): Promise<DriveFile> {
  try {
    const safeFolderId = validateId(folderId);
    // Ensure filename ends with .md
    const name = fileName.endsWith('.md') ? fileName : `${fileName}.md`;
    const encodedName = encodeURIComponent(name);

    const response = await graphPut<GraphFile>(
      getToken,
      `/me/drive/items/${safeFolderId}:/${encodedName}:/content`,
      content
    );

    return mapGraphFile(response);
  } catch (error) {
    console.error('Failed to create file in folder:', error);
    throw error;
  }
}

export async function searchFiles(
  getToken: GetTokenFn,
  query: string
): Promise<DriveFile[]> {
  try {
    // Sanitize query to prevent OData injection: strip quotes and control characters
    const sanitized = query.replace(/['"\\\x00-\x1f]/g, '');
    if (!sanitized.trim()) return [];
    const encodedQuery = encodeURIComponent(sanitized);
    const response = await graphGet<GraphResponse<GraphFile>>(
      getToken,
      `/me/drive/root/search(q='${encodedQuery}')?$select=id,name,size,lastModifiedDateTime,webUrl,folder,file,parentReference&$top=20`
    );

    // Filter for markdown files only
    return response.value
      .filter((file) => !file.folder && (file.name.endsWith('.md') || file.name.endsWith('.markdown')))
      .map(mapGraphFile);
  } catch (error) {
    console.error('Failed to search files:', error);
    throw error;
  }
}

export async function getRecentFiles(getToken: GetTokenFn): Promise<DriveFile[]> {
  try {
    const response = await graphGet<GraphResponse<GraphFile>>(
      getToken,
      '/me/drive/recent?$select=id,name,size,lastModifiedDateTime,webUrl,folder,file,parentReference&$top=20'
    );

    // Filter for markdown files
    return response.value
      .filter((file) => file.name.endsWith('.md') && !file.folder)
      .map(mapGraphFile);
  } catch (error) {
    console.error('Failed to get recent files:', error);
    return [];
  }
}

export async function getFileMetadata(
  getToken: GetTokenFn,
  fileId: string
): Promise<DriveFile> {
  try {
    const safeFileId = validateId(fileId);
    const response = await graphGet<GraphFile>(
      getToken,
      `/me/drive/items/${safeFileId}?$select=id,name,size,lastModifiedDateTime,webUrl,folder,file,parentReference`
    );

    return mapGraphFile(response);
  } catch (error) {
    console.error('Failed to get file metadata:', error);
    throw error;
  }
}
