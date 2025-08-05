import type { SDK } from "caido:plugin";
import type { PostmanRequest } from "../parsers/postman.js";
import type { OpenAPIRequest } from "../parsers/openapi.js";

/**
 * Simple URL parser for browser environment
 */
function parseUrl(urlString: string): { protocol: string; hostname: string; port?: string; pathname: string; search?: string } | null {
  try {
    const urlRegex = /^(https?):\/\/([^:\/\s]+)(?::(\d+))?(\/[^\s?]*)?(\?[^\s]*)?/;
    const match = urlString.match(urlRegex);
    
    if (!match || !match[1] || !match[2]) return null;
    
    return {
      protocol: match[1] + ':',
      hostname: match[2],
      port: match[3] || undefined,
      pathname: match[4] || '/',
      search: match[5] || undefined
    };
  } catch {
    return null;
  }
}

/**
 * Browser-compatible base64 encoding
 */
function btoa(str: string): string {
  try {
    if (typeof globalThis !== 'undefined' && (globalThis as any).btoa) {
      return (globalThis as any).btoa(str);
    }
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
    let result = '';
    let i = 0;
    while (i < str.length) {
      const a = str.charCodeAt(i++);
      const b = i < str.length ? str.charCodeAt(i++) : 0;
      const c = i < str.length ? str.charCodeAt(i++) : 0;
      const bitmap = (a << 16) | (b << 8) | c;
      result += chars.charAt((bitmap >> 18) & 63) + chars.charAt((bitmap >> 12) & 63) +
                (i - 2 < str.length ? chars.charAt((bitmap >> 6) & 63) : '=') +
                (i - 1 < str.length ? chars.charAt(bitmap & 63) : '=');
    }
    return result;
  } catch {
    return '';
  }
}

/**
 * Authentication configuration for applying to requests
 */
export interface AuthConfig {
  type: 'none' | 'apikey' | 'bearer' | 'basic' | 'custom';
  key?: string;
  value?: string;
  token?: string;
  username?: string;
  password?: string;
  header?: string;
  hostname?: string;
}

/**
 * Creates Caido replay sessions from parsed requests
 */
export async function createReplaySessions(
  sdk: SDK,
  requests: (PostmanRequest | OpenAPIRequest)[],
  collectionName: string,
  authConfig: AuthConfig
): Promise<{
  success: boolean;
  processedRequests: Array<{
    request: PostmanRequest | OpenAPIRequest;
    spec: any;
    sessionName: string;
  }>;
  collectionName: string;
  message: string;
}> {
  try {
    const processedRequests: Array<{
      request: PostmanRequest | OpenAPIRequest;
      spec: any;
      sessionName: string;
    }> = [];

    for (let i = 0; i < requests.length; i++) {
      try {
        const request = requests[i];
        
        if (!request) {
          continue;
        }
        
        const processedRequest = applyAuthentication(request, authConfig);
        const spec = await buildRequestSpec(processedRequest, authConfig.hostname);
        const sessionName = generateCompleteSessionName(processedRequest);
        
        if (spec) {
          processedRequests.push({
            request: processedRequest,
            spec,
            sessionName
          });
        }
        
      } catch (error: any) {
        // Skip failed requests
      }
    }

    return {
      success: true,
      processedRequests,
      collectionName,
      message: `Processed ${processedRequests.length} requests for session creation`
    };

  } catch (error: any) {
    return {
      success: false,
      processedRequests: [],
      collectionName,
      message: `Failed to process requests: ${error.message}`
    };
  }
}



/**
 * Builds a RequestSpec for session creation
 */
async function buildRequestSpec(request: PostmanRequest | OpenAPIRequest, hostname?: string): Promise<any | null> {
  try {
    let targetUrl = request.url;
    
    if (hostname && hostname.trim()) {
      if (targetUrl.includes('{{') && targetUrl.includes('}}')) {
        targetUrl = targetUrl.replace(/\{\{[^}]+\}\}/g, hostname.trim());
      } else if (targetUrl.startsWith('/')) {
        targetUrl = `https://${hostname.trim()}${targetUrl}`;
      } else {
        try {
          const urlObj = parseUrl(targetUrl.startsWith('http') ? targetUrl : 'https://' + targetUrl);
          if (urlObj) {
            targetUrl = `${urlObj.protocol}//${hostname.trim()}${urlObj.pathname}${urlObj.search || ''}`;
          }
        } catch {
          const path = targetUrl.startsWith('/') ? targetUrl : '/' + targetUrl;
          targetUrl = `https://${hostname.trim()}${path}`;
        }
      }
    } else if (targetUrl.includes('{{') && targetUrl.includes('}}')) {
      // Template URLs - replace with example.com if no hostname provided
      if (targetUrl.startsWith('/')) {
        targetUrl = `https://example.com${targetUrl}`;
      } else {
        targetUrl = targetUrl.replace(/\{\{[^}]+\}\}/g, 'example.com');
      }
    } else if (targetUrl.startsWith('/')) {
      // Relative URLs - use example.com if no hostname provided
      targetUrl = `https://example.com${targetUrl}`;
    }
    
    if (!targetUrl.startsWith('http')) {
      targetUrl = 'https://' + targetUrl;
    }

    const urlObj = parseUrl(targetUrl);
    if (!urlObj) {
      return null;
    }

    // Build the headers object including all applied headers
    const finalHeaders = { ...request.headers };
    
    // Handle body and determine Content-Type
    let finalBody = '';
    if ('body' in request && request.body) {
      if ('raw' in request.body && request.body.raw) {
        finalBody = request.body.raw;
      } else if ('formdata' in request.body && request.body.formdata) {
        const formPairs = request.body.formdata.map(item => 
          `${encodeURIComponent(item.key)}=${encodeURIComponent(item.value || '')}`
        );
        finalBody = formPairs.join('&');
        finalHeaders['Content-Type'] = 'application/x-www-form-urlencoded';
      }
    }
    
    // Return serialized spec data that frontend can use
    return {
      method: request.method,
      host: urlObj.hostname,
      port: urlObj.port ? parseInt(urlObj.port) : (urlObj.protocol === 'https:' ? 443 : 80),
      path: urlObj.pathname || '/',
      query: urlObj.search || '',
      headers: finalHeaders,
      body: finalBody,
      tls: urlObj.protocol === 'https:',
      url: targetUrl
    };
    
  } catch (error: any) {
    return null;
  }
}

/**
 * Generates complete session name with full path preserved
 */
function generateCompleteSessionName(request: PostmanRequest | OpenAPIRequest): string {
  try {
    let fullPath = request.url;
    
    // Handle different URL formats with 100% accuracy
    
    // Case 1: Full URL with protocol (https://example.com/api/users)
    if (fullPath.includes('://')) {
      const urlParts = fullPath.split('://');
      if (urlParts.length > 1 && urlParts[1]) {
        const afterProtocol = urlParts[1];
        const firstSlash = afterProtocol.indexOf('/');
        if (firstSlash !== -1) {
          fullPath = afterProtocol.substring(firstSlash);
        } else {
          fullPath = '/';
        }
      }
    }
    // Case 2: Template URL ({{baseUrl}}/api/users or {{instance_url}}/users/track)  
    else if (fullPath.includes('}}')) {
      const templateEnd = fullPath.lastIndexOf('}}');
      if (templateEnd !== -1) {
        let pathAfterTemplate = fullPath.substring(templateEnd + 2);
        if (!pathAfterTemplate.startsWith('/')) {
          pathAfterTemplate = '/' + pathAfterTemplate;
        }
        fullPath = pathAfterTemplate;
      }
    }
    // Case 3: Relative path (/api/users)
    else if (fullPath.startsWith('/')) {
      // Already a path, keep as-is
    }
    // Case 4: Path without leading slash (api/users)  
    else {
      fullPath = '/' + fullPath;
    }
    
    // Clean up the path while preserving ALL segments
    // Only remove query parameters, keep everything else
    if (fullPath.includes('?')) {
      const pathPart = fullPath.split('?')[0];
      if (pathPart) {
        fullPath = pathPart;
      }
    }
    
    // Remove hash fragments
    if (fullPath.includes('#')) {
      const pathPart = fullPath.split('#')[0];
      if (pathPart) {
        fullPath = pathPart;
      }
    }
    
    // Normalize multiple slashes but keep all path segments
    fullPath = fullPath.replace(/\/+/g, '/');
    
    // Ensure we always have a leading slash
    if (!fullPath.startsWith('/')) {
      fullPath = '/' + fullPath;
    }
    
    // If path is empty or just "/", use the original URL as fallback
    if (fullPath === '/' && request.url !== '/') {
      fullPath = request.url.replace(/^https?:\/\/[^\/]+/, '') || '/';
    }
    
    return `${request.method.toUpperCase()} ${fullPath}`;
    
  } catch (error: any) {
    // Absolute fallback - use original URL with method
    return `${request.method.toUpperCase()} ${request.url}`;
  }
}

/**
 * Applies authentication configuration to a request
 */
function applyAuthentication(
  request: PostmanRequest | OpenAPIRequest,
  authConfig: AuthConfig
): PostmanRequest | OpenAPIRequest {
  const processedRequest = { ...request, headers: { ...request.headers } };

  switch (authConfig.type) {
    case 'none':
      // No authentication - keep existing headers as they are
      break;

    case 'apikey':
      if (authConfig.key && authConfig.value) {
        // Replace any existing Authorization headers when using API key
        delete processedRequest.headers['Authorization'];
        delete processedRequest.headers['authorization'];
        processedRequest.headers[authConfig.key] = authConfig.value;
      }
      break;

    case 'bearer':
      if (authConfig.token) {
        // Replace any existing API key headers when using Bearer
        delete processedRequest.headers['X-API-Key'];
        delete processedRequest.headers['x-api-key'];
        delete processedRequest.headers['X-Auth-Token'];
        delete processedRequest.headers['x-auth-token'];
        processedRequest.headers['Authorization'] = `Bearer ${authConfig.token}`;
      }
      break;

    case 'basic':
      if (authConfig.username && authConfig.password) {
        // Replace any existing API key headers when using Basic
        delete processedRequest.headers['X-API-Key'];
        delete processedRequest.headers['x-api-key'];
        delete processedRequest.headers['X-Auth-Token'];
        delete processedRequest.headers['x-auth-token'];
        const credentials = btoa(`${authConfig.username}:${authConfig.password}`);
        processedRequest.headers['Authorization'] = `Basic ${credentials}`;
      }
      break;

    case 'custom':
      if (authConfig.header && authConfig.value) {
        // Replace conflicting headers only if custom header conflicts
        if (authConfig.header.toLowerCase() === 'authorization') {
          delete processedRequest.headers['X-API-Key'];
          delete processedRequest.headers['x-api-key'];
        }
        processedRequest.headers[authConfig.header] = authConfig.value;
      }
      break;

    default:
      break;
  }

  return processedRequest;
}