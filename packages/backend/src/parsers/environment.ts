import type { SDK } from "caido:plugin";

/**
 * Interface for a parsed environment variable
 */
export interface EnvironmentVariable {
  key: string;
  value: string;
  enabled: boolean;
  type: 'default' | 'secret';
  isSecret?: boolean; // Auto-detected or user-selected
}

/**
 * Interface for a parsed Postman environment
 */
export interface PostmanEnvironment {
  name: string;
  description?: string;
  variables: EnvironmentVariable[];
}

/**
 * Keywords that indicate a variable should be treated as secret
 */
const SENSITIVE_KEYWORDS = [
  'token', 'key', 'secret', 'password', 'auth', 'authorization', 
  'bearer', 'api_key', 'apikey', 'client_secret', 'access_token',
  'refresh_token', 'private_key', 'credential', 'pass', 'pwd'
];

/**
 * Check if a variable name/key suggests it should be treated as secret
 */
function shouldBeSecret(key: string, value: string): boolean {
  const keyLower = key.toLowerCase();
  
  // Check if key contains sensitive keywords
  const keyHasSensitive = SENSITIVE_KEYWORDS.some(keyword => 
    keyLower.includes(keyword)
  );
  
  // Check if value looks like a token/secret (long alphanumeric string)
  const valueIsToken = /^[a-zA-Z0-9_\-\.]{20,}$/.test(value) && value.length > 20;
  
  return keyHasSensitive || valueIsToken;
}

/**
 * Parse a Postman environment JSON file
 * @param sdk - Caido SDK instance
 * @param content - Raw JSON content of the environment file
 * @returns Parsed environment data
 */
export async function parsePostmanEnvironment(
  sdk: SDK,
  content: string
): Promise<PostmanEnvironment> {
  try {
    const data = JSON.parse(content);
    
    // Validate basic structure
    if (!data || typeof data !== 'object') {
      throw new Error('Invalid environment file: not a valid JSON object');
    }
    
    if (!data.name || typeof data.name !== 'string') {
      throw new Error('Invalid environment file: missing or invalid name field');
    }
    
    if (!Array.isArray(data.values)) {
      throw new Error('Invalid environment file: missing or invalid values array');
    }
    
    // Parse variables
    const variables: EnvironmentVariable[] = data.values
      .filter((item: any) => 
        item && 
        typeof item === 'object' && 
        typeof item.key === 'string' && 
        typeof item.value === 'string'
      )
      .map((item: any) => ({
        key: item.key,
        value: item.value,
        enabled: item.enabled !== false, // Default to enabled if not specified
        type: item.type || 'default',
        isSecret: shouldBeSecret(item.key, item.value)
      }));
    
    if (variables.length === 0) {
      throw new Error('Invalid environment file: no valid variables found');
    }
    
    return {
      name: data.name,
      description: data.description || undefined,
      variables
    };
    
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error('Invalid environment file: malformed JSON');
    }
    throw error;
  }
}

/**
 * Detect if content is a Postman environment file
 * @param content - File content to analyze
 * @param fileName - Name of the file
 * @returns Detection result
 */
export function isPostmanEnvironment(content: string, fileName: string): boolean {
  try {
    const data = JSON.parse(content);
    
    // Check for required Postman environment fields - exactly like collection detection
    if (!data.name || typeof data.name !== 'string') {
      return false;
    }
    
    // Postman environments must have values array
    if (!data.values || !Array.isArray(data.values)) {
      return false;
    }
    
    // Check for Postman-specific environment indicators  
    const hasPostmanScope = data._postman_variable_scope === 'environment';
    const hasPostmanExport = data._postman_exported_at && typeof data._postman_exported_at === 'string';
    const hasEnvironmentInName = fileName.toLowerCase().includes('environment') || fileName.toLowerCase().includes('env');
    
    // Must have either the scope indicator or export timestamp, plus filename indicator
    return (hasPostmanScope || hasPostmanExport) && hasEnvironmentInName;
    
  } catch (error) {
    return false;
  }
}
