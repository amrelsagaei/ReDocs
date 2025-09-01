<script setup lang="ts">
import { computed } from "vue";
import Dialog from "primevue/dialog";
import Button from "primevue/button";
import Card from "primevue/card";
import TabView from "primevue/tabview";
import TabPanel from "primevue/tabpanel";
const props = defineProps<{
  visible: boolean;
}>();

const emit = defineEmits<{
  "update:visible": [value: boolean];
}>();

const dialogVisible = computed({
  get: () => props.visible,
  set: (value: boolean) => emit("update:visible", value)
});

const closeModal = () => {
  dialogVisible.value = false;
};



const postmanExample = `{
  "info": {
    "name": "Sample API Collection",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "item": [
    {
      "name": "Get Users",
      "request": {
        "method": "GET",
        "header": [
          {
            "key": "Authorization",
            "value": "Bearer {{token}}"
          }
        ],
        "url": {
          "raw": "{{baseUrl}}/api/users",
          "host": ["{{baseUrl}}"],
          "path": ["api", "users"]
        }
      }
    }
  ]
}`;

const openApiExample = `openapi: 3.0.0
info:
  title: Sample API
  version: 1.0.0
  description: A sample API specification
servers:
  - url: https://api.example.com
paths:
  /users:
    get:
      summary: Get all users
      security:
        - bearerAuth: []
      responses:
        '200':
          description: Successful response
          content:
            application/json:
              schema:
                type: array
                items:
                  $ref: '#/components/schemas/User'
components:
  securitySchemes:
    bearerAuth:
      type: http
      scheme: bearer`;
</script>

<template>
  <Dialog
    :visible="dialogVisible"
    @update:visible="dialogVisible = $event"
    modal
    :closable="true"
    :draggable="false"
    class="documentation-modal"
    header="ReDocs Documentation"
    :style="{ width: '90vw', maxWidth: '1200px', height: 'auto', maxHeight: '85vh' }"
  >
    <template #header>
      <div class="flex items-center gap-3">
        <i class="fas fa-book text-xl text-primary-500"></i>
        <span class="text-xl font-semibold">ReDocs Documentation</span>
      </div>
    </template>

    <div class="documentation-content h-full overflow-y-auto">
      <TabView class="h-full">
        <!-- Getting Started Tab -->
        <TabPanel header="Getting Started">
          <div class="space-y-6">
            <Card>
              <template #title>
                <div class="flex items-center gap-2">
                  <i class="fas fa-rocket text-primary-500"></i>
                  Quick Start Guide
                </div>
              </template>
              <template #content>
                <div class="space-y-4">
                  <div class="step">
                    <h4 class="font-semibold text-surface-900 dark:text-surface-0 mb-2">
                      1. Prepare Your File
                    </h4>
                    <p class="text-surface-800 dark:text-surface-0 mb-3">
                      Export your API collection from Postman, save your OpenAPI specification as a JSON file, 
                      or export Postman Environment files to set up variables.
                    </p>
                  </div>

                  <div class="step">
                    <h4 class="font-semibold text-surface-900 dark:text-surface-0 mb-2">
                      2. Import to ReDocs
                    </h4>
                    <p class="text-surface-800 dark:text-surface-0 mb-3">
                      Drag and drop your file onto the upload area, or click "Choose File" to browse for it.
                    </p>
                  </div>

                  <div class="step">
                    <h4 class="font-semibold text-surface-900 dark:text-surface-0 mb-2">
                      3. Configure Authentication
                    </h4>
                    <p class="text-surface-800 dark:text-surface-0 mb-3">
                      ReDocs will automatically detect authentication methods and prompt you to provide credentials.
                      You can skip this step if authentication isn't needed.
                    </p>
                  </div>

                  <div class="step">
                    <h4 class="font-semibold text-surface-900 dark:text-surface-0 mb-2">
                      4. Start Testing
                    </h4>
                    <p class="text-surface-800 dark:text-surface-0">
                      Navigate to the Replay section in Caido to find your imported sessions organized in collections.
                      Each API endpoint becomes a separate replay session ready for security testing.
                    </p>
                  </div>
                </div>
              </template>
            </Card>

            <Card>
              <template #title>
                <div class="flex items-center gap-2">
                  <i class="fas fa-file-alt text-primary-500"></i>
                  Supported Formats
                </div>
              </template>
              <template #content>
                <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div class="format-card">
                    <h5 class="font-semibold text-surface-900 dark:text-surface-0 mb-2">
                      Postman Collections
                    </h5>
                    <ul class="text-sm text-surface-800 dark:text-surface-0 space-y-1">
                      <li>• Collection v2.1 format (.json)</li>
                      <li>• Environment variables support</li>
                      <li>• Pre-request scripts (limited)</li>
                      <li>• Folder organization preserved</li>
                    </ul>
                  </div>

                  <div class="format-card">
                    <h5 class="font-semibold text-surface-900 dark:text-surface-0 mb-2">
                      OpenAPI Specifications
                    </h5>
                    <ul class="text-sm text-surface-800 dark:text-surface-0 space-y-1">
                      <li>• OpenAPI 3.x (.json only)</li>
                      <li>• Swagger 2.0 (.json only)</li>
                      <li>• Example values generation</li>
                      <li>• Security schemes detection</li>
                    </ul>
                  </div>

                  <div class="format-card">
                    <h5 class="font-semibold text-surface-900 dark:text-surface-0 mb-2">
                      Postman Environments
                    </h5>
                    <ul class="text-sm text-surface-800 dark:text-surface-0 space-y-1">
                      <li>• Environment files (.json)</li>
                      <li>• Variable auto-detection</li>
                      <li>• Secret detection (tokens, keys)</li>
                      <li>• Collision-safe naming</li>
                    </ul>
                  </div>
                </div>
              </template>
            </Card>
          </div>
        </TabPanel>

        <!-- Examples Tab -->
        <TabPanel header="Examples">
          <div class="space-y-6">
            <Card>
              <template #title>
                <div class="flex items-center gap-2">
                  <i class="fas fa-code text-primary-500"></i>
                  Postman Collection Example
                </div>
              </template>
              <template #content>
                <p class="text-surface-800 dark:text-surface-0 mb-4">
                  Basic structure of a Postman Collection that ReDocs can import:
                </p>
                <div class="example-code bg-surface-100 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-lg p-4 text-sm overflow-x-auto">
                  <pre><code class="language-json text-surface-900 dark:text-surface-0 font-mono leading-relaxed">{{ postmanExample }}</code></pre>
                </div>
              </template>
            </Card>

            <Card>
              <template #title>
                <div class="flex items-center gap-2">
                  <i class="fas fa-code text-primary-500"></i>
                  OpenAPI Specification Example
                </div>
              </template>
              <template #content>
                <p class="text-surface-800 dark:text-surface-0 mb-4">
                  Basic structure of an OpenAPI specification that ReDocs can import:
                </p>
                <div class="example-code bg-surface-100 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-lg p-4 text-sm overflow-x-auto">
                  <pre><code class="language-json text-surface-900 dark:text-surface-0 font-mono leading-relaxed">{{ openApiExample }}</code></pre>
                </div>
              </template>
            </Card>
          </div>
        </TabPanel>

        <!-- Authentication Tab -->
        <TabPanel header="Authentication">
          <div class="space-y-6">
            <Card>
              <template #title>
                <div class="flex items-center gap-2">
                  <i class="fas fa-shield-alt text-primary-500"></i>
                  Supported Authentication Methods
                </div>
              </template>
              <template #content>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div class="auth-method">
                    <h5 class="font-semibold text-surface-900 dark:text-surface-0 mb-3 flex items-center gap-2">
                      <i class="fas fa-key text-primary-400"></i>
                      Bearer Token
                    </h5>
                    <p class="text-sm text-surface-800 dark:text-surface-0 mb-2">
                      JWT tokens and API keys sent in Authorization header.
                    </p>
                    <code class="text-xs bg-surface-100 dark:bg-surface-800 p-2 rounded block">
                      Authorization: Bearer your-token-here
                    </code>
                  </div>

                  <div class="auth-method">
                    <h5 class="font-semibold text-surface-900 dark:text-surface-0 mb-3 flex items-center gap-2">
                      <i class="fas fa-user-lock text-primary-400"></i>
                      Basic Authentication
                    </h5>
                    <p class="text-sm text-surface-800 dark:text-surface-0 mb-2">
                      Username and password encoded in Authorization header.
                    </p>
                    <code class="text-xs bg-surface-100 dark:bg-surface-800 p-2 rounded block">
                      Authorization: Basic base64(username:password)
                    </code>
                  </div>

                  <div class="auth-method">
                    <h5 class="font-semibold text-surface-900 dark:text-surface-0 mb-3 flex items-center gap-2">
                      <i class="fas fa-cookie-bite text-primary-400"></i>
                      Cookie Authentication
                    </h5>
                    <p class="text-sm text-surface-800 dark:text-surface-0 mb-2">
                      Session cookies and authentication tokens.
                    </p>
                    <code class="text-xs bg-surface-100 dark:bg-surface-800 p-2 rounded block">
                      Cookie: sessionId=abc123; authToken=xyz789
                    </code>
                  </div>

                  <div class="auth-method">
                    <h5 class="font-semibold text-surface-900 dark:text-surface-0 mb-3 flex items-center gap-2">
                      <i class="fas fa-cog text-primary-400"></i>
                      Custom Headers
                    </h5>
                    <p class="text-sm text-surface-800 dark:text-surface-0 mb-2">
                      API keys in custom headers like X-API-Key.
                    </p>
                    <code class="text-xs bg-surface-100 dark:bg-surface-800 p-2 rounded block">
                      X-API-Key: your-api-key-here
                    </code>
                  </div>
                </div>
              </template>
            </Card>
          </div>
        </TabPanel>

        <!-- Environment Variables Tab -->
        <TabPanel header="Environment Variables">
          <div class="space-y-6">
            <Card>
              <template #title>
                <div class="flex items-center gap-2">
                  <i class="fas fa-cogs text-primary-500"></i>
                  Environment Variables Import
                </div>
              </template>
              <template #content>
                <div class="space-y-4">
                  <div class="step">
                    <h4 class="font-semibold text-surface-900 dark:text-surface-0 mb-2">
                      What are Environment Variables?
                    </h4>
                    <p class="text-surface-800 dark:text-surface-0 mb-3">
                      Environment variables store values like API endpoints, tokens, and configuration data that can be reused 
                      across multiple requests. ReDocs can import Postman Environment files and create corresponding Caido environments.
                    </p>
                  </div>

                  <div class="step">
                    <h4 class="font-semibold text-surface-900 dark:text-surface-0 mb-2">
                      Supported Variable Types
                    </h4>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
                      <div class="format-card">
                        <h5 class="font-semibold text-surface-900 dark:text-surface-0 mb-2 flex items-center gap-2">
                          <i class="fas fa-text-width text-primary-400"></i>
                          Plain Text Variables
                        </h5>
                        <ul class="text-sm text-surface-800 dark:text-surface-0 space-y-1">
                          <li>• API endpoints (baseUrl, apiUrl)</li>
                          <li>• User IDs and identifiers</li>
                          <li>• Configuration values</li>
                          <li>• Non-sensitive data</li>
                        </ul>
                      </div>

                      <div class="format-card">
                        <h5 class="font-semibold text-surface-900 dark:text-surface-0 mb-2 flex items-center gap-2">
                          <i class="fas fa-lock text-primary-400"></i>
                          Secret Variables
                        </h5>
                        <ul class="text-sm text-surface-800 dark:text-surface-0 space-y-1">
                          <li>• API tokens and keys</li>
                          <li>• Access tokens and refresh tokens</li>
                          <li>• Passwords and credentials</li>
                          <li>• Client secrets</li>
                        </ul>
                      </div>
                    </div>
                  </div>

                  <div class="step">
                    <h4 class="font-semibold text-surface-900 dark:text-surface-0 mb-2">
                      Auto-Detection Features
                    </h4>
                    <p class="text-surface-800 dark:text-surface-0 mb-3">
                      ReDocs automatically detects sensitive variables based on their names and marks them as secrets:
                    </p>
                    <div class="bg-surface-100 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-lg p-4">
                      <p class="text-sm text-surface-800 dark:text-surface-0 font-mono">
                        <strong>Detected as secrets:</strong> token, key, secret, password, auth, bearer, api_key, 
                        access_token, refresh_token, client_secret, private_key
                      </p>
                    </div>
                  </div>
                </div>
              </template>
            </Card>

            <Card>
              <template #title>
                <div class="flex items-center gap-2">
                  <i class="fas fa-upload text-primary-500"></i>
                  Import Process
                </div>
              </template>
              <template #content>
                <div class="space-y-4">
                  <div class="step">
                    <h4 class="font-semibold text-surface-900 dark:text-surface-0 mb-2">
                      1. Export from Postman
                    </h4>
                    <p class="text-surface-800 dark:text-surface-0 mb-3">
                      In Postman, go to your Environment → Click the three dots → Export → Save as JSON file.
                    </p>
                  </div>

                  <div class="step">
                    <h4 class="font-semibold text-surface-900 dark:text-surface-0 mb-2">
                      2. Import to ReDocs
                    </h4>
                    <p class="text-surface-800 dark:text-surface-0 mb-3">
                      Drag and drop your environment JSON file or click "Choose File" to upload it.
                    </p>
                  </div>

                  <div class="step">
                    <h4 class="font-semibold text-surface-900 dark:text-surface-0 mb-2">
                      3. Review Variables
                    </h4>
                    <p class="text-surface-800 dark:text-surface-0 mb-3">
                      Select which variables to import, edit their values if needed, and choose between plain text or secret types.
                    </p>
                  </div>

                  <div class="step">
                    <h4 class="font-semibold text-surface-900 dark:text-surface-0 mb-2">
                      4. Environment Created
                    </h4>
                    <p class="text-surface-800 dark:text-surface-0">
                      ReDocs creates a new Caido environment with collision-safe naming ([ReDocs]-Dev, [ReDocs]-Dev-1, etc.).
                    </p>
                  </div>
                </div>
              </template>
            </Card>

            <Card>
              <template #title>
                <div class="flex items-center gap-2">
                  <i class="fas fa-code text-primary-500"></i>
                  Environment File Example
                </div>
              </template>
              <template #content>
                <p class="text-surface-800 dark:text-surface-0 mb-4">
                  Basic structure of a Postman Environment file that ReDocs can import:
                </p>
                <div class="example-code bg-surface-100 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-lg p-4 text-sm overflow-x-auto">
                  <pre><code class="language-json text-surface-900 dark:text-surface-0 font-mono leading-relaxed">{
  "name": "Development",
  "values": [
    {
      "key": "baseUrl",
      "value": "https://api.example.com",
      "type": "default",
      "enabled": true
    },
    {
      "key": "api_token",
      "value": "your-secret-token-here",
      "type": "secret",
      "enabled": true
    },
    {
      "key": "user_id",
      "value": "12345",
      "type": "default",
      "enabled": true
    }
  ],
  "_postman_variable_scope": "environment",
  "_postman_exported_at": "2024-01-01T00:00:00.000Z"
}</code></pre>
                </div>
              </template>
            </Card>
          </div>
        </TabPanel>

        <!-- Troubleshooting Tab -->
        <TabPanel header="Troubleshooting">
          <div class="space-y-6">
            <Card>
              <template #title>
                <div class="flex items-center gap-2">
                  <i class="fas fa-question-circle text-primary-500"></i>
                  Common Issues
                </div>
              </template>
              <template #content>
                <div class="space-y-4">
                  <div class="faq-item">
                    <h5 class="font-semibold text-surface-900 dark:text-surface-0 mb-2">
                      File format not recognized
                    </h5>
                    <p class="text-surface-800 dark:text-surface-0 text-sm">
                      Ensure your file is a valid Postman Collection (.json) or OpenAPI specification (.json only).
                      Check that the file contains the required schema information.
                    </p>
                  </div>

                  <div class="faq-item">
                    <h5 class="font-semibold text-surface-900 dark:text-surface-0 mb-2">
                      Large files taking too long
                    </h5>
                    <p class="text-surface-800 dark:text-surface-0 text-sm">
                      Files larger than 10MB may take longer to process. Consider splitting large collections 
                      into smaller chunks for better performance.
                    </p>
                  </div>

                  <div class="faq-item">
                    <h5 class="font-semibold text-surface-900 dark:text-surface-0 mb-2">
                      Sessions not appearing in Replay
                    </h5>
                    <p class="text-surface-800 dark:text-surface-0 text-sm">
                      Check the Replay section in Caido and look for a collection named after your imported file.
                      Refresh the page if sessions don't appear immediately.
                    </p>
                  </div>

                  <div class="faq-item">
                    <h5 class="font-semibold text-surface-900 dark:text-surface-0 mb-2">
                      Authentication not working
                    </h5>
                    <p class="text-surface-800 dark:text-surface-0 text-sm">
                      Verify that your authentication credentials are correct and haven't expired.
                      Some APIs may require additional headers or specific token formats.
                    </p>
                  </div>

                  <div class="faq-item">
                    <h5 class="font-semibold text-surface-900 dark:text-surface-0 mb-2">
                      Environment variables not importing
                    </h5>
                    <p class="text-surface-800 dark:text-surface-0 text-sm">
                      Ensure your environment file is a valid Postman export with the correct JSON structure.
                      Check that it contains the required fields: name, values array, and Postman metadata.
                    </p>
                  </div>

                  <div class="faq-item">
                    <h5 class="font-semibold text-surface-900 dark:text-surface-0 mb-2">
                      Environment name conflicts
                    </h5>
                    <p class="text-surface-800 dark:text-surface-0 text-sm">
                      ReDocs automatically handles naming conflicts by adding numbers ([ReDocs]-Dev-1, [ReDocs]-Dev-2).
                      Each import creates a separate environment to prevent overwrites.
                    </p>
                  </div>

                  <div class="faq-item">
                    <h5 class="font-semibold text-surface-900 dark:text-surface-0 mb-2">
                      Variables not appearing in Caido
                    </h5>
                    <p class="text-surface-800 dark:text-surface-0 text-sm">
                      Check the Environment section in Caido to find your imported variables.
                      Ensure you select the correct environment when using variables in replay sessions.
                    </p>
                  </div>
                </div>
              </template>
            </Card>
          </div>
        </TabPanel>


      </TabView>
    </div>

    <template #footer>
      <div class="flex justify-end gap-2">
        <Button
          label="Close"
          severity="secondary"
          @click="closeModal"
        />
      </div>
    </template>
  </Dialog>
</template>

<style scoped>
.documentation-modal {
  @apply max-h-screen;
}

.documentation-content {
  @apply text-surface-700 dark:text-surface-300;
}

.step {
  @apply border-l-4 border-primary-200 dark:border-primary-700 pl-4 ml-2;
}

.format-card {
  @apply p-4 bg-surface-50 dark:bg-surface-800 rounded-lg border border-surface-200 dark:border-surface-700;
}

.auth-method {
  @apply p-4 bg-surface-50 dark:bg-surface-800 rounded-lg border border-surface-200 dark:border-surface-700;
}

.faq-item {
  @apply pb-4 border-b border-surface-200 dark:border-surface-700 last:border-b-0;
}



.example-code {
  @apply max-h-80 overflow-y-auto text-xs font-mono;
  color: hsl(var(--c-surface-800));
  background-color: hsl(var(--c-surface-100));
}

.dark .example-code {
  color: hsl(var(--c-surface-200));
  background-color: hsl(var(--c-surface-800));
}

:deep(.p-tabview-nav-link) {
  @apply text-surface-700 dark:text-surface-300;
}

:deep(.p-tabview-nav-link.p-tabview-nav-link-active) {
  @apply text-primary-500 border-primary-500;
}

/* Clean up - removed utility classes that were conflicting */
</style>