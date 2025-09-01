<script setup lang="ts">
import { ref } from "vue";
import Button from "primevue/button";
import Card from "primevue/card";

import { useSDK } from "../plugins/sdk";
import FileUploadArea from "../components/FileUploadArea.vue";
import DocumentationModal from "../components/DocumentationModal.vue";
import AuthenticationModal from "../components/AuthenticationModal.vue";
import RequestSelectionModal from "../components/RequestSelectionModal.vue";
import EnvironmentModal from "../components/EnvironmentModal.vue";

const sdk = useSDK();

const showDocumentation = ref(false);
const showRequestSelection = ref(false);
const showAuthentication = ref(false);
const showEnvironment = ref(false);
const importResult = ref<any>(null);
const selectedRequests = ref<any[]>([]);
const environmentVariables = ref<any[]>([]);
const environmentName = ref('');
const isProcessing = ref(false);
const processingStep = ref('');



const openDocumentation = () => {
  showDocumentation.value = true;
};





const saveFileToUserFiles = async (fileName: string, content: string): Promise<boolean> => {
  try {
    const baseName = fileName.replace(/\.json$/i, '');
    let finalFileName = `[ReDocs]-${baseName}.json`;
    
    const existingFiles = sdk.files.getAll();
    let counter = 0;
    
    while (existingFiles.some((file: any) => file.name === finalFileName)) {
      counter++;
      finalFileName = `[ReDocs] - ${baseName}-${counter}.json`;
    }
    
    const file = new File([content], finalFileName, { 
      type: 'application/json' 
    });
    
    const result = await sdk.files.create(file);
    
    if (result) {
      if (sdk.window?.showToast) {
        sdk.window.showToast(`File saved as ${finalFileName}`, { 
          variant: "success",
          duration: 3000 
        });
      }
      
      return true;
    } else {
      throw new Error('Failed to create file');
    }
  } catch (error: any) {
    if (sdk.window?.showToast) {
      sdk.window.showToast(`Could not save file: ${error.message}`, { 
        variant: "warning",
        duration: 3000 
      });
    }
    return false;
  }
};









const handleFileUploadSuccess = async (result: any, fileContent?: string, fileName?: string) => {
  if (fileContent && fileName) {
    result.uploadedFileInfo = { content: fileContent, name: fileName };
  }
  handleImportSuccess(result, fileName);
};

const handleImportSuccess = async (result: any, fileName?: string) => {
  importResult.value = result;
  
  // Check if this is an environment file
  if (result.type === 'environment') {
    // Handle environment file import
    environmentVariables.value = result.variables || [];
    
    // Use environment name from JSON file, not filename
    environmentName.value = result.environmentName || 'Unknown';
    
    // Store filename for file saving (parse correctly - stop at last dot)
    if (fileName) {
      // Remove file extension correctly - stop at last dot, not first dot
      const lastDotIndex = fileName.lastIndexOf('.');
      const fileNameWithoutExt = lastDotIndex > 0 ? fileName.substring(0, lastDotIndex) : fileName;
      result.savedFileName = fileNameWithoutExt;
    }
    
    if (sdk.window && sdk.window.showToast) {
      sdk.window.showToast(`Environment parsed successfully! Found ${result.variableCount} variables.`, {
        variant: "info"
      });
    }
    
    // Show environment selection modal
    showEnvironment.value = true;
    return;
  }
  
  // Handle documentation files (existing logic)
  if (result.authentication && result.authentication.hasAuth) {
    if (sdk.window && sdk.window.showToast) {
      sdk.window.showToast(`File parsed successfully! ${result.authentication.description}`, {
        variant: "info"
      });
    }
  } else {
    if (sdk.window && sdk.window.showToast) {
      sdk.window.showToast(`File parsed successfully! No authentication detected.`, {
        variant: "info"
      });
    }
  }
  
  // Show request selection modal for documentation files
  showRequestSelection.value = true;
};

const handleImportError = (error: string) => {
  if (sdk.window && sdk.window.showToast) {
    sdk.window.showToast("Import failed: " + error, {
      variant: "error",
      duration: 5000,
    });
  }
};

const handleRequestsSelected = (requests: any[]) => {
  selectedRequests.value = requests;
  showRequestSelection.value = false;
  
  if (sdk.window && sdk.window.showToast) {
    sdk.window.showToast(`${requests.length} requests selected for import.`, {
      variant: "info"
    });
  }
  
  // Show authentication modal after request selection
  showAuthentication.value = true;
};

const handleSelectionCancelled = () => {
  showRequestSelection.value = false;
  importResult.value = null;
  selectedRequests.value = [];
  
  if (sdk.window && sdk.window.showToast) {
    sdk.window.showToast("Import cancelled.", {
      variant: "info"
    });
  }
};

const handleEnvironmentSelectionCancelled = () => {
  showEnvironment.value = false;
  importResult.value = null;
  environmentVariables.value = [];
  environmentName.value = '';
  
  if (sdk.window && sdk.window.showToast) {
    sdk.window.showToast("Environment import cancelled.", {
      variant: "info"
    });
  }
};

const handleVariablesSelected = async (selectedVariables: any[], envName: string) => {
  isProcessing.value = true;
  processingStep.value = "Creating new environment...";
  showEnvironment.value = false;
  
  // Generate unique environment name to avoid collisions
  const baseEnvironmentName = `[ReDocs]-${envName}`;
  let uniqueEnvironmentName = baseEnvironmentName;
  let counter = 1;
  
  // Try to create environment with collision detection
  while (true) {
    try {
      // Step 1: Try to create environment with GraphQL
      await sdk.graphql.createEnvironment({
        input: { 
          name: uniqueEnvironmentName,
          variables: []
        }
      });
      
      // If successful, break out of loop
      break;
      
    } catch (error: any) {
      // If error suggests environment already exists, try next number
      if (error.message && error.message.includes('already exists')) {
        uniqueEnvironmentName = `${baseEnvironmentName}-${counter}`;
        counter++;
        
        // Prevent infinite loop
        if (counter > 100) {
          throw new Error('Too many environment name collisions');
        }
      } else {
        // Some other error, re-throw
        throw error;
      }
    }
  }
  
  if (sdk.window && sdk.window.showToast) {
    sdk.window.showToast(`Creating environment "${uniqueEnvironmentName}" with ${selectedVariables.length} variables...`, {
      variant: "info",
      duration: 3000,
    });
  }

  try {
    // Step 2: Add variables to the created environment
    const result = await sdk.backend.createEnvironmentVariables(
      selectedVariables,
      uniqueEnvironmentName // Pass the full unique environment name
    );

    if (result.success) {
      const message = `Successfully created environment "${uniqueEnvironmentName}" with ${(result as any).variablesCreated} variables!`;
      if (sdk.window && sdk.window.showToast) {
        sdk.window.showToast(message, {
          variant: "success",
          duration: 4000,
        });
      }
      
      // Save uploaded file after successful import
      if (importResult.value?.uploadedFileInfo) {
        await saveFileToUserFiles(
          importResult.value.uploadedFileInfo.name,
          importResult.value.uploadedFileInfo.content
        );
      }
    } else {
      const errorMessage = result.message || result.error || "No variables were created";
      if (sdk.window && sdk.window.showToast) {
        sdk.window.showToast(`Environment creation failed: ${errorMessage}`, {
          variant: "error",
          duration: 5000,
        });
      }
    }
  } catch (error: any) {
    if (sdk.window && sdk.window.showToast) {
      sdk.window.showToast("Unexpected error: " + error.message, {
        variant: "error",
        duration: 5000,
      });
    }
  } finally {
    isProcessing.value = false;
    processingStep.value = '';
  }
};

const handleAuthConfigured = async (authConfig: any) => {
  isProcessing.value = true;
  processingStep.value = "Processing requests...";
  
  if (sdk.window && sdk.window.showToast) {
    sdk.window.showToast("Processing " + selectedRequests.value.length + " requests...", {
      variant: "info",
      duration: 3000,
    });
  }

  try {
    // Get processed requests from backend (use selected requests)
    const result = await sdk.backend.createSessionsFromRequests(
      selectedRequests.value,
      importResult.value.collectionName,
      authConfig
    );

    if (result.success && result.processedRequests) {
      // Create sessions in frontend using proper SDK methods
      processingStep.value = "Creating replay sessions...";
      const createdCount = await createReplaySessionsInFrontend(
        result.processedRequests, 
        result.collectionName
      );

      const message = `Successfully created ${createdCount} replay sessions!`;
      if (sdk.window && sdk.window.showToast) {
        sdk.window.showToast(message, {
          variant: "success",
          duration: 4000,
        });
      }
      
      // Save uploaded file after successful import
      if (importResult.value?.uploadedFileInfo) {
        await saveFileToUserFiles(
          importResult.value.uploadedFileInfo.name,
          importResult.value.uploadedFileInfo.content
        );
      }
    } else {
      const errorMessage = result.message || "Failed to process requests";
      if (sdk.window && sdk.window.showToast) {
        sdk.window.showToast(`Request processing failed: ${errorMessage}`, {
          variant: "error",
          duration: 5000,
        });
      }
    }
  } catch (error: any) {
    if (sdk.window && sdk.window.showToast) {
      sdk.window.showToast("Unexpected error: " + error.message, {
        variant: "error",
        duration: 5000,
      });
    }
  } finally {
    isProcessing.value = false;
    processingStep.value = '';
  }
};

const handleAuthSkipped = async (authConfig?: any) => {
  isProcessing.value = true;
  processingStep.value = "Processing requests...";
  
  if (sdk.window && sdk.window.showToast) {
    sdk.window.showToast("Processing " + selectedRequests.value.length + " requests...", {
      variant: "info",
      duration: 3000,
    });
  }

  try {
    // Get processed requests from backend (use selected requests)
    const result = await sdk.backend.createSessionsFromRequests(
      selectedRequests.value,
      importResult.value.collectionName,
      authConfig || { type: 'none' }
    );

    if (result.success && result.processedRequests) {
      // Create sessions in frontend using proper SDK methods
      processingStep.value = "Creating replay sessions...";
      const createdCount = await createReplaySessionsInFrontend(
        result.processedRequests, 
        result.collectionName
      );

      const message = `Successfully created ${createdCount} replay sessions!`;
      if (sdk.window && sdk.window.showToast) {
        sdk.window.showToast(message, {
          variant: "success",
          duration: 4000,
        });
      }
      
      // Save uploaded file after successful import
      if (importResult.value?.uploadedFileInfo) {
        await saveFileToUserFiles(
          importResult.value.uploadedFileInfo.name,
          importResult.value.uploadedFileInfo.content
        );
      }
    } else {
      const errorMessage = result.message || "Failed to process requests";
      if (sdk.window && sdk.window.showToast) {
        sdk.window.showToast(`Request processing failed: ${errorMessage}`, {
          variant: "error",
          duration: 5000,
        });
      }
    }
  } catch (error: any) {
    if (sdk.window && sdk.window.showToast) {
      sdk.window.showToast("Unexpected error: " + error.message, {
        variant: "error",
        duration: 5000,
      });
    }
  } finally {
    isProcessing.value = false;
    processingStep.value = '';
  }
};

/**
 * Enhanced session creation with better error handling and batch processing
 */
const createReplaySessionsInFrontend = async (
  processedRequests: Array<{
    request: any;
    spec: any;
    sessionName: string;
  }>,
  collectionName: string
): Promise<number> => {
  try {
    // Step 1: Get existing collections using SDK method
    const collections = await sdk.replay.getCollections();
    let finalCollectionName = collectionName;
    let targetCollectionId = collections.find((c: any) => c.name === finalCollectionName)?.id;
    
    // Handle incremental naming if collection exists
    if (targetCollectionId) {
      let counter = 1;
      do {
        finalCollectionName = `${collectionName}${counter}`;
        targetCollectionId = collections.find((c: any) => c.name === finalCollectionName)?.id;
        counter++;
      } while (targetCollectionId && counter < 100);
    }
    
    // Step 2: Create new collection using GraphQL method
    const createCollectionResult = await sdk.graphql.createReplaySessionCollection({
      input: {
        name: finalCollectionName
      }
    });
    
    if (!createCollectionResult.createReplaySessionCollection?.collection?.id) {
      throw new Error('Failed to create collection: No collection ID returned');
    }
    
    targetCollectionId = createCollectionResult.createReplaySessionCollection.collection.id;

    // Step 3: Process sessions with better error tracking and batch processing
    let createdCount = 0;
    const sessionErrors: string[] = [];

    // Process sessions with controlled concurrency
    const processSession = async (spec: any, sessionName: string, index: number): Promise<void> => {
      try {
        // Create session using GraphQL
        const createSessionResult = await sdk.graphql.createReplaySession({
          input: {
            requestSource: {
              raw: {
                raw: buildRawRequest(spec),
                connectionInfo: {
                  host: spec.host || 'example.com',
                  port: spec.port || (spec.tls !== false ? 443 : 80),
                  isTLS: spec.tls !== false,
                },
              },
            },
          },
        });

        const sessionId = createSessionResult.createReplaySession?.session?.id;
        if (!sessionId) {
          // Session creation failed
          const errorMsg = 'Failed to get session ID after creation';
          sessionErrors.push(`Session ${index + 1}: ${errorMsg}`);
          return;
        }

        // Move session to collection
        try {
          await (sdk.replay as any).moveSession(sessionId, targetCollectionId);
        } catch (moveError: any) {
          sessionErrors.push(`Session ${index + 1} move: ${moveError.message}`);
        }

        // Rename session
        try {
          await sdk.graphql.renameReplaySession({
            id: sessionId,
            name: sessionName,
          });
        } catch (renameError: any) {
          sessionErrors.push(`Session ${index + 1} rename: ${renameError.message}`);
        }

        createdCount++;

      } catch (sessionError: any) {
        sessionErrors.push(`Session ${index + 1}: ${sessionError.message}`);
      }
    };

    // Process in batches to avoid overwhelming the API
    const batchSize = 5;
    for (let i = 0; i < processedRequests.length; i += batchSize) {
      const batch = processedRequests.slice(i, i + batchSize);
      
      // Use manual Promise.all implementation for better compatibility
      const batchPromises = batch.map((item, batchIndex) => 
        processSession(item.spec, item.sessionName, i + batchIndex)
      );
      
      // Wait for all sessions in this batch to complete
      try {
        await Promise.all(batchPromises);
      } catch (batchError: any) {
        // Individual errors are already captured in sessionErrors
        console.warn('Batch processing error (continuing):', batchError.message);
      }
      
      // Small delay between batches to be API-friendly
      if (i + batchSize < processedRequests.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    // Report any session errors to console but don't fail the entire operation
    if (sessionErrors.length > 0) {
      console.warn('Some sessions failed to create:', sessionErrors);
      
      if (sdk.window?.showToast) {
        sdk.window.showToast(
          `${createdCount}/${processedRequests.length} sessions created successfully. Check console for details on failed sessions.`,
          { variant: "warning", duration: 6000 }
        );
      }
    }

    return createdCount;

  } catch (error: any) {
    throw new Error(`Session creation failed: ${error.message}`);
  }
};

/**
 * Builds raw HTTP request from RequestSpec (using the actual spec data from backend)
 */
const buildRawRequest = (spec: any): string => {
  try {
    // Extract data from the RequestSpec object that backend built
    const method = spec.method || 'GET';
    const host = spec.host || 'example.com';
    const port = spec.port || (spec.tls ? 443 : 80);
    const path = spec.path || '/';
    const query = spec.query || '';
    const headers = spec.headers || {};
    const body = spec.body || '';
    const isTls = spec.tls !== false;

    // Build the request line with proper path and query
    const fullPath = path + query;
    let request = `${method} ${fullPath} HTTP/1.1\r\n`;
    
    // Add Host header first (with port if not standard)
    if ((isTls && port !== 443) || (!isTls && port !== 80)) {
      request += `Host: ${host}:${port}\r\n`;
    } else {
      request += `Host: ${host}\r\n`;
    }
    
    // Add all other headers from the spec
    for (const [name, value] of Object.entries(headers)) {
      if (name && value && name.toLowerCase() !== 'host') {
        request += `${name}: ${value}\r\n`;
      }
    }
    
    // Add Content-Length if there's a body
    if (body && typeof body === 'string' && body.length > 0) {
      request += `Content-Length: ${body.length}\r\n`;
    }
    
    // End headers section
    request += '\r\n';
    
    // Add body if present
    if (body && typeof body === 'string' && body.length > 0) {
      request += body;
    }
    
    return request;
  } catch (error) {
    console.error('Error building raw request:', error);
    // Fallback for errors
    const method = spec?.method || 'GET';
    const path = spec?.path || '/';
    const host = spec?.host || 'example.com';
    return `${method} ${path} HTTP/1.1\r\nHost: ${host}\r\n\r\n`;
  }
};
</script>

<template>
  <div class="plugin-container">
    <div class="plugin-header">
      <div class="flex items-center gap-3">
        <i class="fas fa-file-import text-xl text-primary-600"></i>
        <h1 class="text-xl font-bold text-white">
          ReDocs
        </h1>
      </div>
      
      <div class="flex items-center gap-2">
        <Button
          icon="fas fa-book"
          label="Docs"
          severity="secondary"
          size="small"
          @click="openDocumentation"
          class="flex items-center gap-2"
        />
      </div>
    </div>

    <div class="plugin-content">
      <!-- Processing Status -->
      <div v-if="isProcessing" class="text-center p-4 mb-6 bg-primary-50 dark:bg-primary-900 rounded-lg max-w-2xl mx-auto">
        <p class="text-primary-800 dark:text-primary-200">
          {{ processingStep }}
        </p>
      </div>
      
      <!-- File Upload Section - Centered -->
      <div class="upload-container">
        <Card class="upload-card">
          <template #content>
            <div class="upload-card-content">
              <div class="upload-header">
                <i class="fas fa-cloud-upload-alt text-2xl text-primary-600"></i>
                <h3 class="text-2xl font-bold text-white">
                  Import New File
                </h3>
              </div>
              
              <div class="upload-area-wrapper">
                <FileUploadArea
                  :disabled="isProcessing"
                  @import-success="handleFileUploadSuccess"
                  @import-error="handleImportError"
                />
              </div>
            </div>
          </template>
        </Card>
      </div>
    </div>

    <DocumentationModal
      :visible="showDocumentation"
      @update:visible="showDocumentation = $event"
    />

    <RequestSelectionModal
      v-if="importResult"
      :visible="showRequestSelection"
      :requests="importResult.requests || []"
      :collection-name="importResult.collectionName || 'Unknown'"
      :collection-type="importResult.type || 'unknown'"
      @update:visible="showRequestSelection = $event"
      @requests-selected="handleRequestsSelected"
      @selection-cancelled="handleSelectionCancelled"
    />

    <EnvironmentModal
      v-if="importResult && importResult.type === 'environment'"
      :visible="showEnvironment"
      :variables="environmentVariables"
      :environment-name="environmentName"
      @update:visible="showEnvironment = $event"
      @variables-selected="handleVariablesSelected"
      @selection-cancelled="handleEnvironmentSelectionCancelled"
    />

    <AuthenticationModal
      v-if="importResult && selectedRequests.length > 0"
      :visible="showAuthentication"
      :auth-info="importResult.authentication || { hasAuth: false, authType: 'none', description: 'No authentication detected' }"
      :collection-name="importResult.collectionName || 'Unknown'"
      :request-count="selectedRequests.length"
      @update:visible="showAuthentication = $event"
      @auth-configured="handleAuthConfigured"
      @auth-skipped="handleAuthSkipped"
    />
  </div>
</template>

<style scoped>
.bg-surface-0 {
  background-color: hsl(var(--c-surface-0));
}

.bg-surface-900 {
  background-color: hsl(var(--c-surface-900));
}

.border-surface-200 {
  border-color: hsl(var(--c-surface-200));
}

.border-surface-700 {
  border-color: hsl(var(--c-surface-700));
}

.text-surface-900 {
  color: hsl(var(--c-surface-900));
}

.text-surface-0 {
  color: hsl(var(--c-surface-0));
}

.text-surface-600 {
  color: hsl(var(--c-surface-600));
}

.text-surface-400 {
  color: hsl(var(--c-surface-400));
}

.text-primary-500 {
  color: hsl(var(--c-primary-500));
}

.text-primary-600 {
  color: hsl(var(--c-primary-600));
}

.text-primary-700 {
  color: hsl(var(--c-primary-700));
}

/* Plugin container - proper height like reference */
.plugin-container {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: var(--c-bg-default);
  color: var(--c-text-primary);
  overflow: hidden;
}

/* Plugin header - smaller height */
.plugin-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem 1.5rem;
  border-bottom: 1px solid var(--c-border-default);
  background: var(--c-bg-subtle);
  flex-shrink: 0;
}

/* Plugin content area */
.plugin-content {
  flex: 1;
  padding: 2rem;
  overflow-y: auto;
  overflow-x: hidden;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 0;
  position: relative;
}

/* Upload container - bigger width */
.upload-container {
  width: 100%;
  max-width: 900px;
  margin: 0 auto;
}

/* Upload card styling */
.upload-card {
  background: var(--c-bg-subtle);
  border: 1px solid var(--c-border-default);
  border-radius: 1rem;
  overflow: hidden;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.upload-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

/* Upload card content */
.upload-card-content {
  padding: 1.5rem 2rem;
  display: flex;
  flex-direction: column;
  gap: 2rem;
  min-height: 600px;
}

/* Upload header */
.upload-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 0.5rem;
}

/* Upload area wrapper */
.upload-area-wrapper {
  flex: 1;
  display: flex;
  flex-direction: column;
}

/* Theme-aware text colors */
.text-primary {
  color: var(--c-text-primary);
}

/* Responsive layout */
@media (max-width: 768px) {
  .upload-container {
    width: 95%;
    max-width: none;
  }
  
  .plugin-content {
    padding: 1rem;
  }
  
  .upload-card-content {
    padding: 1rem 1.5rem;
    min-height: 500px;
  }
  
  .plugin-header {
    padding: 0.5rem 1rem;
  }
}
</style>