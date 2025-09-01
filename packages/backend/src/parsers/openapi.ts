import type { SDK } from "caido:plugin";

/**
 * Interface for a parsed HTTP request from OpenAPI specification
 */
export interface OpenAPIRequest {
  id: string;
  name: string;
  method: string;
  url: string;
  headers: Record<string, string>;
  body?: {
    contentType: string;
    schema?: any;
    example?: any;
  };
  parameters: Array<{
    name: string;
    in: 'query' | 'header' | 'path' | 'cookie';
    required: boolean;
    schema: any;
    example?: any;
  }>;
}

/**
 * Interface for parsed OpenAPI specification
 */
export interface OpenAPISpec {
  name: string;
  description?: string;
  version: string;
  baseUrl: string;
  requests: OpenAPIRequest[];
  securitySchemes?: Record<string, any>;
}

/**
 * Parses an OpenAPI specification (JSON or YAML) and extracts all HTTP requests
 * @param sdk - Caido SDK instance
 * @param content - Raw content of the OpenAPI specification
 * @param isYaml - Whether the content is YAML format
 * @returns Parsed specification with extracted requests
 */
export async function parseOpenAPISpec(
  sdk: SDK,
  content: string,
  isYaml: boolean = false
): Promise<OpenAPISpec> {
  try {
    let data: any;

    if (isYaml) {
      // YAML support temporarily disabled due to parsing complexity
      throw new Error("YAML format is not currently supported. Please convert your OpenAPI specification to JSON format and try again.");
    } else {
      data = JSON.parse(content);
    }

    // Validate OpenAPI specification
    if (!data.openapi && !data.swagger) {
      throw new Error("Invalid OpenAPI specification: missing openapi/swagger version");
    }

    const title = data.info?.title || "Untitled API";


    // Determine base URL
    let baseUrl = '';
    if (data.servers && data.servers.length > 0) {
      baseUrl = data.servers[0].url;
    } else if (data.host) {
      // Swagger 2.0 format
      const protocol = data.schemes && data.schemes.includes('https') ? 'https' : 'http';
      baseUrl = `${protocol}://${data.host}`;
      if (data.basePath) {
        baseUrl += data.basePath;
      }
    }

    const spec: OpenAPISpec = {
      name: title,
      description: data.info?.description,
      version: data.info?.version || '1.0.0',
      baseUrl,
      requests: [],
      securitySchemes: data.components?.securitySchemes || data.securityDefinitions
    };

    // Extract requests from paths
    spec.requests = await extractOpenAPIRequests(sdk, data.paths || {}, baseUrl, data);

        return spec;
  } catch (error: any) {
    throw new Error(`Failed to parse OpenAPI specification: ${error.message}`);
  }
}

/**
 * Extracts requests from OpenAPI paths object
 * @param sdk - Caido SDK instance
 * @param paths - OpenAPI paths object
 * @param baseUrl - Base URL for the API
 * @param spec - Full OpenAPI specification for schema resolution
 * @returns Array of parsed requests
 */
async function extractOpenAPIRequests(
  sdk: SDK,
  paths: Record<string, any>,
  baseUrl: string,
  spec: any
): Promise<OpenAPIRequest[]> {
  const requests: OpenAPIRequest[] = [];
  const httpMethods = ['get', 'post', 'put', 'patch', 'delete', 'head', 'options', 'trace'];

  for (const [path, pathItem] of Object.entries(paths)) {
    for (const method of httpMethods) {
      if (pathItem[method]) {
        const operation = pathItem[method];
        const request = await parseOpenAPIOperation(sdk, method, path, operation, baseUrl, spec);
        if (request) {
          requests.push(request);
        }
      }
    }
  }

  return requests;
}

/**
 * Resolves a schema reference ($ref) to the actual schema object
 * @param ref - The $ref string (e.g., "#/components/schemas/User")
 * @param spec - The full OpenAPI specification
 * @param visited - Set to track circular references
 * @returns Resolved schema object
 */
function resolveSchemaRef(ref: string, spec: any, visited: Set<string> = new Set()): any {
  if (visited.has(ref)) {
    // Circular reference detected, return a placeholder
    return { type: 'object', description: `Circular reference to ${ref}` };
  }

  visited.add(ref);

  if (!ref.startsWith('#/')) {
    return null;
  }

  const path = ref.substring(2).split('/');
  let current = spec;

  for (const segment of path) {
    if (!current || typeof current !== 'object' || !(segment in current)) {
      return null;
    }
    current = current[segment];
  }

  // If the resolved schema has a $ref, resolve it recursively
  if (current && typeof current === 'object' && current.$ref) {
    return resolveSchemaRef(current.$ref, spec, visited);
  }

  return current;
}

/**
 * Generates an example value from a schema
 * @param schema - The schema object (can contain $ref)
 * @param spec - The full OpenAPI specification for resolving refs
 * @param visited - Set to track circular references
 * @returns Generated example value
 */
function generateExampleFromSchema(schema: any, spec: any, visited: Set<string> = new Set()): any {
  if (!schema || typeof schema !== 'object') {
    return null;
  }

  // If schema has a $ref, resolve it first
  if (schema.$ref) {
    if (visited.has(schema.$ref)) {
      return null; // Avoid circular references
    }
    const resolvedSchema = resolveSchemaRef(schema.$ref, spec, new Set(visited));
    if (resolvedSchema) {
      visited.add(schema.$ref);
      return generateExampleFromSchema(resolvedSchema, spec, visited);
    }
    return null;
  }

  // Use explicit example if provided
  if (schema.example !== undefined) {
    return schema.example;
  }

  // Generate based on type
  switch (schema.type) {
    case 'string':
      if (schema.enum && schema.enum.length > 0) {
        return schema.enum[0];
      }
      if (schema.format === 'email') {
        return 'user@example.com';
      }
      if (schema.format === 'date') {
        return '2024-01-01';
      }
      if (schema.format === 'date-time') {
        return '2024-01-01T00:00:00Z';
      }
      if (schema.format === 'uuid') {
        return '550e8400-e29b-41d4-a716-446655440000';
      }
      return schema.pattern ? 'example' : 'string';

    case 'number':
    case 'integer':
      if (schema.enum && schema.enum.length > 0) {
        return schema.enum[0];
      }
      return schema.minimum !== undefined ? schema.minimum : 0;

    case 'boolean':
      return true;

    case 'array':
      if (schema.items) {
        const itemExample = generateExampleFromSchema(schema.items, spec, visited);
        return itemExample !== null ? [itemExample] : [];
      }
      return [];

    case 'object':
      const obj: any = {};
      
      if (schema.properties) {
        for (const [propName, propSchema] of Object.entries(schema.properties)) {
          const propExample = generateExampleFromSchema(propSchema, spec, visited);
          if (propExample !== null) {
            obj[propName] = propExample;
          }
        }
      }
      
      // Ensure required properties are present
      if (schema.required && Array.isArray(schema.required)) {
        for (const requiredProp of schema.required) {
          if (!(requiredProp in obj) && schema.properties && schema.properties[requiredProp]) {
            const propExample = generateExampleFromSchema(schema.properties[requiredProp], spec, visited);
            if (propExample !== null) {
              obj[requiredProp] = propExample;
            } else {
              // Fallback for required properties
              obj[requiredProp] = 'required_value';
            }
          }
        }
      }
      
      return Object.keys(obj).length > 0 ? obj : null;

    default:
      return null;
  }
}

/**
 * Parses a single OpenAPI operation
 * @param sdk - Caido SDK instance
 * @param method - HTTP method
 * @param path - API path
 * @param operation - OpenAPI operation object
 * @param baseUrl - Base URL for the API
 * @returns Parsed request or null if invalid
 */
async function parseOpenAPIOperation(
  sdk: SDK,
  method: string,
  path: string,
  operation: any,
  baseUrl: string,
  spec: any
): Promise<OpenAPIRequest | null> {
  try {
    const upperMethod = method.toUpperCase();
    const fullUrl = baseUrl ? `${baseUrl.replace(/\/$/, '')}${path}` : path;
    
    // Create operation name
    const operationName = operation.summary || 
                         operation.operationId || 
                         `${upperMethod} ${path}`;

    const request: OpenAPIRequest = {
      id: operation.operationId || `${upperMethod}_${path.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}`,
      name: operationName,
      method: upperMethod,
      url: fullUrl,
      headers: {},
      parameters: []
    };

    // Extract parameters
    if (operation.parameters && Array.isArray(operation.parameters)) {
      for (const param of operation.parameters) {
        request.parameters.push({
          name: param.name,
          in: param.in,
          required: param.required || false,
          schema: param.schema || param.type || 'string',
          example: param.example
        });

        // Add header parameters to headers
        if (param.in === 'header' && param.example) {
          request.headers[param.name] = param.example.toString();
        }
      }
    }

    // Extract request body (for POST, PUT, PATCH)
    if (operation.requestBody && ['POST', 'PUT', 'PATCH'].includes(upperMethod)) {
      const content = operation.requestBody.content;
      if (content) {
        // Find the first supported content type
        const supportedTypes = ['application/json', 'application/x-www-form-urlencoded', 'multipart/form-data'];
        let contentType = '';
        let bodySchema = null;
        let bodyExample = null;

        for (const type of supportedTypes) {
          if (content[type]) {
            contentType = type;
            bodySchema = content[type].schema;
            bodyExample = content[type].example || content[type].examples;
            break;
          }
        }

        if (contentType && bodySchema) {
          // Generate example from schema if no explicit example exists
          if (!bodyExample && contentType === 'application/json') {
            try {
              const generatedExample = generateExampleFromSchema(bodySchema, spec);
              if (generatedExample !== null) {
                bodyExample = generatedExample;
              }
            } catch (error) {
              // If schema resolution fails, continue without example
              sdk.console.warn(`Failed to generate example from schema: ${error}`);
            }
          }

          request.body = {
            contentType,
            schema: bodySchema,
            example: bodyExample
          };

          // Set content-type header
          request.headers['Content-Type'] = contentType;
        }
      }
    }

    // Extract common response examples for headers
    if (operation.responses) {
      const successResponse = operation.responses['200'] || 
                            operation.responses['201'] || 
                            operation.responses['default'];
      
      if (successResponse && successResponse.headers) {
        // Add common response headers that might be useful for requests
        for (const [headerName, headerSpec] of Object.entries(successResponse.headers)) {
          if (headerSpec && typeof headerSpec === 'object' && (headerSpec as any).example && headerName.toLowerCase().includes('auth')) {
            request.headers[headerName] = (headerSpec as any).example.toString();
          }
        }
      }
    }

    return request;

  } catch (error: any) {
    return null;
  }
}

/**
 * Detects authentication schemes in OpenAPI specification
 * @param spec - Parsed OpenAPI specification
 * @returns Detected authentication info
 */
export function detectOpenAPIAuth(spec: OpenAPISpec): {
  hasAuth: boolean;
  authType: string;
  description: string;
  schemes: Array<{ name: string; type: string; description: string }>;
} {
  const schemes: Array<{ name: string; type: string; description: string }> = [];

  if (spec.securitySchemes) {
    for (const [name, scheme] of Object.entries(spec.securitySchemes)) {
      let description = '';
      
      switch (scheme.type) {
        case 'http':
          description = `HTTP ${scheme.scheme} authentication`;
          break;
        case 'apiKey':
          description = `API key in ${scheme.in}: ${scheme.name}`;
          break;
        case 'oauth2':
          description = `OAuth 2.0 authentication`;
          break;
        case 'openIdConnect':
          description = `OpenID Connect authentication`;
          break;
        default:
          description = `${scheme.type} authentication`;
      }

      schemes.push({
        name,
        type: scheme.type,
        description
      });
    }
  }

  // Check for auth headers in requests
  const authHeaders = ['authorization', 'x-api-key', 'x-auth-token'];

  for (const request of spec.requests) {
    for (const headerName of Object.keys(request.headers)) {
      if (authHeaders.some(auth => headerName.toLowerCase().includes(auth))) {
        if (!schemes.some(s => s.type === 'header')) {
          schemes.push({
            name: 'header-auth',
            type: 'header',
            description: `Authentication via ${headerName} header`
          });
        }
      }
    }
  }

  if (schemes.length > 0 && schemes[0]) {
    return {
      hasAuth: true,
      authType: schemes[0].type,
      description: `Found ${schemes.length} authentication scheme(s)`,
      schemes
    };
  }

  return {
    hasAuth: false,
    authType: 'none',
    description: 'No authentication schemes detected',
    schemes: []
  };
}