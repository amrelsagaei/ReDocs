<script setup lang="ts">
import { ref } from "vue";
import Button from "primevue/button";
import Card from "primevue/card";

import { useSDK } from "@/plugins/sdk";
import FileUploadArea from "@/components/FileUploadArea.vue";
import DocumentationModal from "@/components/DocumentationModal.vue";
import AuthenticationModal from "@/components/AuthenticationModal.vue";

const sdk = useSDK();

const showDocumentation = ref(false);
const showAuthentication = ref(false);
const importResult = ref<any>(null);
const isProcessing = ref(false);
const processingStep = ref('');

const openDocumentation = () => {
  showDocumentation.value = true;
};

const handleImportSuccess = (result: any) => {
  importResult.value = result;
  
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
  
  showAuthentication.value = true;
};

const handleImportError = (error: string) => {
  if (sdk.window && sdk.window.showToast) {
    sdk.window.showToast("Import failed: " + error, {
      variant: "error",
      duration: 5000,
    });
  }
};

const handleAuthConfigured = async (authConfig: any) => {
  isProcessing.value = true;
  processingStep.value = "Processing requests...";
  
  if (sdk.window && sdk.window.showToast) {
    sdk.window.showToast("Processing " + importResult.value.sessionCount + " requests...", {
      variant: "info",
      duration: 3000,
    });
  }

  try {
    // Get processed requests from backend
    const result = await sdk.backend.createSessionsFromRequests(
      importResult.value.requests,
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
    sdk.window.showToast("Processing " + importResult.value.sessionCount + " requests...", {
      variant: "info",
      duration: 3000,
    });
  }

  try {
    // Get processed requests from backend
    const result = await sdk.backend.createSessionsFromRequests(
      importResult.value.requests,
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
 * Creates replay sessions in the frontend using proper SDK methods (like Drop plugin)
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
    // Find or create collection with incremental naming
    const collections = await sdk.replay.getCollections();
    let finalCollectionName = collectionName;
    let targetCollectionId = collections.find(c => c.name === finalCollectionName)?.id;
    
    // If collection exists, create a new one with incremental name
    if (targetCollectionId) {
      let counter = 1;
      do {
        finalCollectionName = `${collectionName}${counter}`;
        targetCollectionId = collections.find(c => c.name === finalCollectionName)?.id;
        counter++;
      } while (targetCollectionId && counter < 100); // Safety limit
    }
    
    // Create the new collection with the final name
    const newCollection = await (sdk.replay as any).createCollection(finalCollectionName);
    targetCollectionId = newCollection.id;

    let createdCount = 0;

    // Create sessions using the proper SDK methods
    for (const { spec, sessionName } of processedRequests) {
      try {
        // Create session using graphql like Drop plugin
        const result = await sdk.graphql.createReplaySession({
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

        const sessionId = result.createReplaySession.session?.id;
        if (sessionId) {
          // Move session to collection
          await (sdk.replay as any).moveSession(sessionId, targetCollectionId);
          
          // Rename session
          await sdk.graphql.renameReplaySession({
            id: sessionId,
            name: sessionName,
          });

          createdCount++;
        }
      } catch (sessionError: any) {
        console.warn('Failed to create session:', sessionError);
        // Continue with other sessions
      }
    }

    return createdCount;
  } catch (error: any) {
    console.error('Failed to create sessions in frontend:', error);
    throw error;
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
  <div class="h-full flex flex-col bg-surface-0 dark:bg-surface-900">
    <div class="flex items-center justify-between px-6 py-3 border-b border-surface-200 dark:border-surface-700">
      <div class="flex items-center gap-3">
        <i class="fas fa-file-import text-2xl text-primary-600"></i>
        <h1 class="text-2xl font-bold text-surface-900 dark:text-surface-0">
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

    <div class="flex-1 flex flex-col p-4">
      <div class="flex-1 flex items-center justify-center">
        <Card class="w-full max-w-4xl shadow-lg">
          <template #content>
            <div v-if="isProcessing" class="text-center p-4 mb-4 bg-primary-50 dark:bg-primary-900 rounded-lg">
              <p class="text-primary-800 dark:text-primary-200">
                {{ processingStep }}
              </p>
            </div>
            
            <FileUploadArea
              :disabled="isProcessing"
              @import-success="handleImportSuccess"
              @import-error="handleImportError"
            />
          </template>
        </Card>
      </div>
    </div>

    <DocumentationModal
      :visible="showDocumentation"
      @update:visible="showDocumentation = $event"
    />

    <AuthenticationModal
      v-if="importResult"
      :visible="showAuthentication"
      :auth-info="importResult.authentication || { hasAuth: false, authType: 'none', description: 'No authentication detected' }"
      :collection-name="importResult.collectionName || 'Unknown'"
      :request-count="importResult.sessionCount || 0"
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
</style>