import type { DefineAPI, SDK } from "caido:plugin";
import { parsePostmanCollection, detectPostmanAuth } from "./parsers/postman.js";
import { parseOpenAPISpec, detectOpenAPIAuth } from "./parsers/openapi.js";
import { detectFileType, validateFileTypeSupport } from "./utils/fileDetection.js";
import { createReplaySessions, type AuthConfig } from "./replay/sessionCreator.js";

/**
 * Processes an imported file (auto-detects Postman collection or OpenAPI spec)
 * @param sdk - Caido SDK instance
 * @param fileContent - Raw file content as string
 * @param fileName - Original file name
 * @returns Promise with import results
 */
const processImportFile = async (
  sdk: SDK,
  fileContent: string,
  fileName: string
) => {
  try {
    const detectionResult = detectFileType(sdk, fileContent, fileName);

    // Validate that we can process this file type
    const validation = validateFileTypeSupport(detectionResult.type, fileName);
    if (!validation.supported) {
      return {
        success: false,
        error: validation.message,
        fileType: detectionResult.type,
        detection: detectionResult,
        message: `Cannot process ${fileName}: ${validation.message}`
      };
    }

    let result: any = {};
    let authInfo: any = {};

    if (detectionResult.type === 'postman') {
      // Parse Postman collection
      const collection = await parsePostmanCollection(sdk, fileContent);
      authInfo = detectPostmanAuth(collection);
      
      result = {
        success: true,
        type: 'postman',
        collectionName: collection.name,
        description: collection.description,
        sessionCount: collection.requests.length,
        requests: collection.requests,
        authentication: authInfo,
        message: `Successfully parsed Postman collection "${collection.name}" with ${collection.requests.length} requests`
      };

    } else if (detectionResult.type === 'openapi') {
      // Determine if file is YAML based on extension
      const isYaml = fileName.toLowerCase().endsWith('.yaml') || fileName.toLowerCase().endsWith('.yml');
      
      // Parse OpenAPI specification
      const spec = await parseOpenAPISpec(sdk, fileContent, isYaml);
      authInfo = detectOpenAPIAuth(spec);
      
      result = {
        success: true,
        type: 'openapi',
        collectionName: spec.name,
        description: spec.description,
        version: spec.version,
        baseUrl: spec.baseUrl,
        sessionCount: spec.requests.length,
        requests: spec.requests,
        authentication: authInfo,
        message: `Successfully parsed OpenAPI specification "${spec.name}" with ${spec.requests.length} requests`
      };

    } else {
      throw new Error(`Unsupported file type: ${detectionResult.type}`);
    }

    return result;

  } catch (error: any) {
    return {
      success: false,
      error: error.message,
      message: `Failed to process ${fileName}: ${error.message}`
    };
  }
};

/**
 * Creates replay sessions from parsed requests with authentication
 * @param sdk - Caido SDK instance
 * @param requests - Array of parsed requests
 * @param collectionName - Name for the collection
 * @param authConfig - Authentication configuration
 * @returns Promise with creation results
 */
const createSessionsFromRequests = async (
  sdk: SDK,
  requests: any[],
  collectionName: string,
  authConfig: AuthConfig
) => {
  try {

    
    const result = await createReplaySessions(sdk, requests, collectionName, authConfig);
    

    return result;
  } catch (error: any) {
    return {
      success: false,
      processedRequests: [],
      collectionName,
      message: `Failed to process sessions: ${error.message}`
    };
  }
};

/**
 * Legacy function for demonstration
 * @param sdk - Caido SDK instance  
 * @param length - Length of random string to generate
 * @returns Random string
 */
const generateRandomString = (sdk: SDK, length: number) => {
  const randomString = Math.random()
    .toString(36)
    .substring(2, length + 2);
  return randomString;
};

export type API = DefineAPI<{
  processImportFile: typeof processImportFile;
  createSessionsFromRequests: typeof createSessionsFromRequests;
  generateRandomString: typeof generateRandomString;
}>;

export function init(sdk: SDK<API>) {
  // Register the main import processing function
  sdk.api.register("processImportFile", processImportFile);
  
  // Register the replay session creation function
  sdk.api.register("createSessionsFromRequests", createSessionsFromRequests);
  
  

}
