import type { SDK } from "caido:plugin";

/**
 * Interface for a parsed HTTP request from Postman collection
 */
export interface PostmanRequest {
  id: string;
  name: string;
  method: string;
  url: string;
  headers: Record<string, string>;
  body?: {
    mode: string;
    raw?: string;
    formdata?: Array<{ key: string; value: string; type: string }>;
  };
  auth?: {
    type: string;
    bearer?: { token: string };
    apikey?: { key: string; value: string };
    basic?: { username: string; password: string };
  };
}

/**
 * Interface for parsed Postman collection
 */
export interface PostmanCollection {
  name: string;
  description?: string;
  requests: PostmanRequest[];
  auth?: any;
}

/**
 * Parses a Postman collection JSON and extracts all HTTP requests
 * @param sdk - Caido SDK instance
 * @param content - Raw JSON content of the Postman collection
 * @returns Parsed collection with extracted requests
 */
export async function parsePostmanCollection(
  sdk: SDK,
  content: string
): Promise<PostmanCollection> {
  try {
    const data = JSON.parse(content);

    // Validate that this is a Postman collection
    if (!data.info || !data.info.name) {
      throw new Error("Invalid Postman collection: missing info.name");
    }



    const collection: PostmanCollection = {
      name: data.info.name,
      description: data.info.description,
      requests: [],
      auth: data.auth
    };

    // Extract requests from items (can be nested in folders)
    collection.requests = await extractPostmanRequests(sdk, data.item || []);

    return collection;
  } catch (error: any) {
    throw new Error(`Failed to parse Postman collection: ${error.message}`);
  }
}

/**
 * Recursively extracts requests from Postman collection items (handles folders)
 * @param sdk - Caido SDK instance
 * @param items - Array of collection items (requests or folders)
 * @returns Array of parsed requests
 */
async function extractPostmanRequests(
  sdk: SDK,
  items: any[]
): Promise<PostmanRequest[]> {
  const requests: PostmanRequest[] = [];

  for (const item of items) {
    if (item.request) {
      // This is a request item
      const request = await parsePostmanRequest(sdk, item);
      if (request) {
        requests.push(request);
      }
    } else if (item.item) {
      // This is a folder, recursively extract requests
      const folderRequests = await extractPostmanRequests(sdk, item.item);
      requests.push(...folderRequests);
    }
  }

  return requests;
}

/**
 * Parses a single Postman request item
 * @param sdk - Caido SDK instance
 * @param item - Postman request item
 * @returns Parsed request or null if invalid
 */
async function parsePostmanRequest(
  sdk: SDK,
  item: any
): Promise<PostmanRequest | null> {
  try {
    const request = item.request;
    if (!request) return null;

    // Extract URL (can be string or object)
    let url = '';
    if (typeof request.url === 'string') {
      url = request.url;
    } else if (request.url && request.url.raw) {
      url = request.url.raw;
    } else if (request.url && request.url.protocol && request.url.host) {
      url = `${request.url.protocol}://${request.url.host.join('.')}`;
      if (request.url.port) {
        url += `:${request.url.port}`;
      }
      if (request.url.path) {
        url += `/${request.url.path.join('/')}`;
      }
    }

    // Extract headers
    const headers: Record<string, string> = {};
    if (request.header && Array.isArray(request.header)) {
      for (const header of request.header) {
        if (header.key && header.value && !header.disabled) {
          headers[header.key] = header.value;
        }
      }
    }

    // Extract method
    const method = (request.method || 'GET').toUpperCase();

    // Create request object
    const parsedRequest: PostmanRequest = {
      id: item.id || `${method}_${Date.now()}_${Math.random()}`,
      name: item.name || `${method} ${url}`,
      method,
      url,
      headers
    };

    // Extract body if present
    if (request.body) {
      parsedRequest.body = {
        mode: request.body.mode || 'raw'
      };

      if (request.body.raw) {
        parsedRequest.body.raw = request.body.raw;
      }

      if (request.body.formdata && Array.isArray(request.body.formdata)) {
        parsedRequest.body.formdata = request.body.formdata.filter(
          (item: any) => !item.disabled
        );
      }
    }

    // Extract authentication
    if (request.auth) {
      parsedRequest.auth = request.auth;
    }

    return parsedRequest;

  } catch (error) {
    return null;
  }
}

/**
 * Detects common authentication methods in Postman collection
 * @param collection - Parsed Postman collection
 * @returns Detected authentication info
 */
export function detectPostmanAuth(collection: PostmanCollection): {
  hasAuth: boolean;
  authType: string;
  description: string;
} {
  // Check collection-level auth
  if (collection.auth) {
    return {
      hasAuth: true,
      authType: collection.auth.type || 'unknown',
      description: `Collection uses ${collection.auth.type} authentication`
    };
  }

  // Check for common auth headers in requests
  const authHeaders = ['authorization', 'x-api-key', 'x-auth-token', 'bearer'];
  let foundAuthHeader = false;
  let authType = 'header';

  for (const request of collection.requests) {
    // Check headers
    for (const [key, value] of Object.entries(request.headers)) {
      if (authHeaders.some(auth => key.toLowerCase().includes(auth))) {
        foundAuthHeader = true;
        if (key.toLowerCase().includes('bearer') || value.toLowerCase().startsWith('bearer')) {
          authType = 'bearer';
        } else if (key.toLowerCase().includes('api')) {
          authType = 'apikey';
        }
      }
    }

    // Check request-level auth
    if (request.auth) {
      return {
        hasAuth: true,
        authType: request.auth.type || 'unknown',
        description: `Requests use ${request.auth.type} authentication`
      };
    }
  }

  if (foundAuthHeader) {
    return {
      hasAuth: true,
      authType,
      description: `Found ${authType} authentication in request headers`
    };
  }

  return {
    hasAuth: false,
    authType: 'none',
    description: 'No authentication detected'
  };
}