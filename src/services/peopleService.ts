import { graphGet, GetTokenFn, GraphResponse } from './graphService';

export interface Person {
  id: string;
  name: string;
  email: string;
  avatar?: string;
}

interface GraphPerson {
  id: string;
  displayName: string;
  scoredEmailAddresses?: Array<{ address: string }>;
  userPrincipalName?: string;
  mail?: string;
}

/**
 * Sanitize a search query to prevent OData injection.
 * Strips characters that could break OData query syntax.
 */
function sanitizeSearchQuery(query: string): string {
  // Remove characters that could break OData/search syntax: " ' \ and control chars
  return query.replace(/["'\\<>{}|^~`\x00-\x1f]/g, '');
}

export async function searchUsers(
  getToken: GetTokenFn,
  query: string,
  limit: number = 10
): Promise<Person[]> {
  if (!query || query.length < 2) {
    return [];
  }

  const sanitizedQuery = sanitizeSearchQuery(query);
  if (!sanitizedQuery || sanitizedQuery.length < 2) {
    return [];
  }

  const encodedQuery = encodeURIComponent(sanitizedQuery);

  try {
    // Try People API first (better relevance based on user's connections)
    const peopleResponse = await graphGet<GraphResponse<GraphPerson>>(
      getToken,
      `/me/people?$search="${encodedQuery}"&$top=${limit}&$select=id,displayName,scoredEmailAddresses,userPrincipalName`
    );

    if (peopleResponse.value && peopleResponse.value.length > 0) {
      return peopleResponse.value.map((person) => ({
        id: person.id,
        name: person.displayName,
        email:
          person.scoredEmailAddresses?.[0]?.address ||
          person.userPrincipalName ||
          '',
      }));
    }
  } catch (error) {
    console.warn('People API search failed, falling back to Users API:', error);
  }

  // Fallback to Users API
  try {
    // Escape single quotes for OData string literals (e.g. O'Brien -> O''Brien)
    const odataQuery = sanitizedQuery.replace(/'/g, "''");
    const encodedOdataQuery = encodeURIComponent(odataQuery);
    const usersResponse = await graphGet<GraphResponse<GraphPerson>>(
      getToken,
      `/users?$filter=startswith(displayName,'${encodedOdataQuery}') or startswith(mail,'${encodedOdataQuery}') or startswith(userPrincipalName,'${encodedOdataQuery}')&$top=${limit}&$select=id,displayName,mail,userPrincipalName`
    );

    return usersResponse.value.map((user) => ({
      id: user.id,
      name: user.displayName,
      email: user.mail || user.userPrincipalName || '',
    }));
  } catch (error) {
    console.error('User search failed:', error);
    return [];
  }
}

export async function getUserPhoto(
  getToken: GetTokenFn,
  userId: string
): Promise<string | null> {
  try {
    const photoBlob = await graphGet<Blob>(getToken, `/users/${userId}/photo/$value`);

    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.readAsDataURL(photoBlob);
    });
  } catch {
    return null;
  }
}

export async function getCurrentUser(getToken: GetTokenFn): Promise<Person | null> {
  try {
    const user = await graphGet<GraphPerson>(
      getToken,
      '/me?$select=id,displayName,mail,userPrincipalName'
    );

    let avatar: string | undefined;
    try {
      const photoBlob = await graphGet<Blob>(getToken, '/me/photo/$value');
      avatar = await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(photoBlob);
      });
    } catch {
      // Photo not available
    }

    return {
      id: user.id,
      name: user.displayName,
      email: user.mail || user.userPrincipalName || '',
      avatar,
    };
  } catch (error) {
    console.error('Failed to get current user:', error);
    return null;
  }
}
