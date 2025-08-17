<script setup lang="ts">
import { ref, computed } from "vue";
import Dialog from "primevue/dialog";
import Button from "primevue/button";
import Card from "primevue/card";
import InputText from "primevue/inputtext";
import Dropdown from "primevue/dropdown";
import Textarea from "primevue/textarea";
import Message from "primevue/message";

// Component props
const props = defineProps<{
  visible: boolean;
  authInfo: {
    hasAuth: boolean;
    authType: string;
    description: string;
    schemes?: Array<{ name: string; type: string; description: string }>;
  };
  collectionName: string;
  requestCount: number;
}>();

// Component events
const emit = defineEmits<{
  'update:visible': [value: boolean];
  'auth-configured': [authConfig: any];
  'auth-skipped': [authConfig?: any];
}>();

// Component state
const selectedAuthType = ref('');
const apiKey = ref('');
const apiKeyHeader = ref('x-api-key');
const bearerToken = ref('');
const basicUsername = ref('');
const basicPassword = ref('');
const customHeaderName = ref('');
const customHeaderValue = ref('');
const hostname = ref('');

// Auth type options
const authTypeOptions = computed(() => {
  const options = [
    { label: 'Skip Authentication', value: 'none' },
    { label: 'API Key (Header)', value: 'apikey' },
    { label: 'Bearer Token', value: 'bearer' },
    { label: 'Basic Authentication', value: 'basic' },
    { label: 'Custom Header', value: 'custom' }
  ];

  // Add detected schemes if available
  if (props.authInfo.schemes && props.authInfo.schemes.length > 0) {
    const detectedOptions = props.authInfo.schemes.map(scheme => ({
      label: `${scheme.type} (Detected)`,
      value: `detected-${scheme.name}`
    }));
    return [...detectedOptions, ...options];
  }

  return options;
});

// Initialize with detected auth type if available
const initializeAuthType = () => {
  if (props.authInfo.hasAuth) {
    if (props.authInfo.authType === 'bearer') {
      selectedAuthType.value = 'bearer';
    } else if (props.authInfo.authType === 'apikey') {
      selectedAuthType.value = 'apikey';
    } else if (props.authInfo.authType === 'basic') {
      selectedAuthType.value = 'basic';
    } else if (props.authInfo.schemes && props.authInfo.schemes.length > 0) {
      selectedAuthType.value = `detected-${props.authInfo.schemes[0]?.name}`;
    }
  } else {
    selectedAuthType.value = 'none';
  }
};

// Watch for auth info changes  
import { watchEffect } from 'vue';
watchEffect(() => {
  if (props.visible && props.authInfo) {
    initializeAuthType();
  }
});

/**
 * Handles authentication configuration
 */
const configureAuthentication = () => {
  let authConfig: any = { type: 'none' };

  // Always include hostname in authConfig
  const baseConfig = {
    hostname: hostname.value?.trim() || undefined
  };

  if (selectedAuthType.value === 'none') {
    authConfig = { ...baseConfig, type: 'none' };
  } else if (selectedAuthType.value === 'apikey') {
    if (!apiKey.value.trim()) {
      return; // Validation will show error
    }
    authConfig = {
      ...baseConfig,
      type: 'apikey',
      key: apiKeyHeader.value || 'x-api-key',
      value: apiKey.value.trim()
    };
  } else if (selectedAuthType.value === 'bearer') {
    if (!bearerToken.value.trim()) {
      return; // Validation will show error
    }
    authConfig = {
      ...baseConfig,
      type: 'bearer',
      token: bearerToken.value.trim()
    };
  } else if (selectedAuthType.value === 'basic') {
    if (!basicUsername.value.trim() || !basicPassword.value.trim()) {
      return; // Validation will show error
    }
    authConfig = {
      ...baseConfig,
      type: 'basic',
      username: basicUsername.value.trim(),
      password: basicPassword.value.trim()
    };
  } else if (selectedAuthType.value === 'custom') {
    if (!customHeaderName.value.trim() || !customHeaderValue.value.trim()) {
      return; // Validation will show error
    }
    authConfig = {
      ...baseConfig,
      type: 'custom',
      header: customHeaderName.value.trim(),
      value: customHeaderValue.value.trim()
    };
  } else if (selectedAuthType.value.startsWith('detected-')) {
    // Handle detected schemes
    const schemeName = selectedAuthType.value.replace('detected-', '');
    const scheme = props.authInfo.schemes?.find(s => s.name === schemeName);
    if (scheme) {
      authConfig = {
        ...baseConfig,
        type: 'detected',
        scheme: scheme,
        // User would need to provide values based on scheme type
      };
    }
  }

  emit('auth-configured', authConfig);
  closeModal();
};

/**
 * Skips authentication configuration
 */
const skipAuthentication = () => {
  const authConfig = {
    type: 'none',
    hostname: hostname.value?.trim() || undefined
  };
  emit('auth-skipped', authConfig);
  closeModal();
};

/**
 * Closes the modal
 */
const closeModal = () => {
  emit('update:visible', false);
  // Reset form
  selectedAuthType.value = '';
  apiKey.value = '';
  bearerToken.value = '';
  basicUsername.value = '';
  basicPassword.value = '';
  customHeaderName.value = '';
  customHeaderValue.value = '';
};

// Validation
const isFormValid = computed(() => {
  if (selectedAuthType.value === 'none') return true;
  if (selectedAuthType.value === 'apikey') return apiKey.value.trim().length > 0;
  if (selectedAuthType.value === 'bearer') return bearerToken.value.trim().length > 0;
  if (selectedAuthType.value === 'basic') return basicUsername.value.trim().length > 0 && basicPassword.value.trim().length > 0;
  if (selectedAuthType.value === 'custom') return customHeaderName.value.trim().length > 0 && customHeaderValue.value.trim().length > 0;
  return true;
});
</script>

<template>
  <Dialog 
    :visible="visible"
    @update:visible="$emit('update:visible', $event)"
    modal
    :style="{ width: '90vw', maxWidth: '1000px', height: 'auto', maxHeight: '85vh' }"
    :draggable="false"
    class="authentication-modal"
    :breakpoints="{ '960px': '95vw' }"
  >
    <template #header>
      <div class="flex items-center gap-3">
        <i class="fas fa-shield-alt text-xl text-primary-600"></i>
        <span class="text-lg font-semibold">Authentication Configuration</span>
      </div>
    </template>

    <div class="flex flex-col gap-6">
      <!-- Collection Info -->
      <Card>
        <template #content>
          <div class="flex items-center gap-3 mb-4">
            <i class="fas fa-file-import text-primary-600"></i>
            <div>
              <h3 class="font-semibold text-surface-900 dark:text-surface-0">{{ collectionName }}</h3>
              <p class="text-sm font-medium text-surface-0">{{ requestCount }} requests found</p>
            </div>
          </div>

          <Message 
            v-if="authInfo.hasAuth" 
            severity="info" 
            :closable="false"
            class="mb-4"
          >
            <div class="text-sm">
              <strong>Authentication Detected:</strong> {{ authInfo.description }}
            </div>
          </Message>

          <Message 
            v-else 
            severity="warn" 
            :closable="false"
            class="mb-4"
          >
            <div class="text-sm">
              <strong>No Authentication Detected</strong> - You can still configure authentication manually if needed.
            </div>
          </Message>
        </template>
      </Card>

      <!-- Authentication Configuration -->
      <Card>
        <template #title>
          <div class="flex items-center gap-2">
            <i class="fas fa-cog text-primary-600"></i>
            <span>Configure Authentication</span>
          </div>
        </template>
        <template #content>
          <div class="flex flex-col gap-4">
            <!-- Auth Type Selection -->
            <div class="field">
              <label for="authType" class="field-label">
                Authentication Type
              </label>
              <Dropdown
                id="authType"
                v-model="selectedAuthType"
                :options="authTypeOptions"
                optionLabel="label"
                optionValue="value"
                placeholder="Select authentication type"
                class="w-full"
              />
            </div>

            <!-- API Key Configuration -->
            <div v-if="selectedAuthType === 'apikey'" class="field-group">
              <div class="field-item">
                <label for="apiKeyHeader" class="field-label">
                  Header Name
                </label>
                <InputText
                  id="apiKeyHeader"
                  v-model="apiKeyHeader"
                  placeholder="e.g., x-api-key, Authorization"
                  class="w-full"
                />
              </div>
              <div class="field-item">
                <label for="apiKey" class="field-label">
                  API Key
                </label>
                <InputText
                  id="apiKey"
                  v-model="apiKey"
                  placeholder="Enter your API key"
                  class="w-full"
                  type="password"
                />
              </div>
            </div>

            <!-- Bearer Token Configuration -->
            <div v-if="selectedAuthType === 'bearer'" class="field">
              <label for="bearerToken" class="field-label">
                Bearer Token
              </label>
              <Textarea
                id="bearerToken"
                v-model="bearerToken"
                placeholder="Enter your bearer token (without 'Bearer ' prefix)"
                class="w-full"
                :rows="3"
              />
            </div>

            <!-- Basic Authentication Configuration -->
            <div v-if="selectedAuthType === 'basic'" class="field-group">
              <div class="field-item">
                <label for="basicUsername" class="field-label">
                  Username
                </label>
                <InputText
                  id="basicUsername"
                  v-model="basicUsername"
                  placeholder="Enter username"
                  class="w-full"
                />
              </div>
              <div class="field-item">
                <label for="basicPassword" class="field-label">
                  Password
                </label>
                <InputText
                  id="basicPassword"
                  v-model="basicPassword"
                  placeholder="Enter password"
                  class="w-full"
                  type="password"
                />
              </div>
            </div>

            <!-- Custom Header Configuration -->
            <div v-if="selectedAuthType === 'custom'" class="field-group">
              <div class="field-item">
                <label for="customHeaderName" class="field-label">
                  Header Name
                </label>
                <InputText
                  id="customHeaderName"
                  v-model="customHeaderName"
                  placeholder="e.g., Authorization, X-Custom-Auth"
                  class="w-full"
                />
              </div>
              <div class="field-item">
                <label for="customHeaderValue" class="field-label">
                  Header Value
                </label>
                <InputText
                  id="customHeaderValue"
                  v-model="customHeaderValue"
                  placeholder="Enter header value"
                  class="w-full"
                  type="password"
                />
              </div>
            </div>

                                    <!-- Hostname Configuration -->
                        <div class="field">
                          <label for="hostname" class="field-label">
                            Hostname (Optional)
                          </label>
                          <InputText
                            id="hostname"
                            v-model="hostname"
                            placeholder="e.g., api.example.com or leave empty for auto-detection"
                            class="w-full"
                          />
                          <small class="text-surface-600 dark:text-surface-300">
                            Override the hostname for all requests. Leave empty to use detected hostname from the API documentation.
                          </small>
                        </div>

                        <!-- No Authentication Message -->
                        <div v-if="selectedAuthType === 'none'" class="field">
                          <Message severity="info" :closable="false">
                            <div class="text-sm">
                              No authentication will be applied to the imported requests. You can manually add authentication later in Caido.
                            </div>
                          </Message>
                        </div>
          </div>
        </template>
      </Card>
    </div>

    <template #footer>
      <div class="flex justify-between items-center px-3 py-4">
        <Button
          label="Skip Authentication"
          severity="secondary"
          @click="skipAuthentication"
          class="flex items-center"
        >
          <template #icon>
            <i class="fas fa-times"></i>
          </template>
        </Button>
        
        <div style="width: 60px;"></div>
        
        <Button
          label="Apply & Continue"
          :disabled="!isFormValid"
          @click="configureAuthentication"
          class="flex items-center"
        >
          <template #icon>
            <i class="fas fa-check"></i>
          </template>
        </Button>
      </div>
    </template>
  </Dialog>
</template>

<style scoped>
.authentication-modal :deep(.p-dialog-content) {
  padding: 1.5rem;
}

/* Modal styling to match docs modal exactly */
.authentication-modal :deep(.p-dialog) {
  border-radius: 8px;
  background: rgb(var(--c-surface-0));
  border: 1px solid rgb(var(--c-surface-200));
}

.authentication-modal :deep(.p-dialog-content) {
  padding: 2rem;
  background: rgb(var(--c-surface-0));
}

.authentication-modal :deep(.p-dialog-header) {
  padding: 1.5rem 2rem 0.5rem 2rem;
  border-bottom: none;
  background: rgb(var(--c-surface-0));
}

.authentication-modal :deep(.p-dialog-footer) {
  padding: 1rem 2rem 2rem 2rem;
  border-top: 1px solid rgb(var(--c-surface-200));
  background: rgb(var(--c-surface-0));
}

/* Field styling with proper spacing */
.field {
  margin-bottom: 2rem;
}

.field-group {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  margin-bottom: 2rem;
}

.field-item {
  margin-bottom: 0;
}

.field-label {
  display: block;
  font-size: 0.875rem;
  font-weight: 500;
  color: rgb(var(--c-surface-900));
  margin-top: 5px;
  margin-bottom: 0.75rem;
}

/* Dark mode support */
[data-mode="dark"] .field-label {
  color: rgb(var(--c-surface-0));
}

[data-mode="dark"] .authentication-modal :deep(.p-dialog) {
  background: rgb(var(--c-surface-900));
  border-color: rgb(var(--c-surface-700));
}

[data-mode="dark"] .authentication-modal :deep(.p-dialog-content),
[data-mode="dark"] .authentication-modal :deep(.p-dialog-header),
[data-mode="dark"] .authentication-modal :deep(.p-dialog-footer) {
  background: rgb(var(--c-surface-900));
}

[data-mode="dark"] .authentication-modal :deep(.p-dialog-footer) {
  border-top-color: rgb(var(--c-surface-700));
}

/* Proper Caido surface colors */
.text-surface-0 {
  color: hsl(var(--c-surface-0));
}

/* Caido brand color utilities */
.text-primary-600 {
  color: hsl(var(--c-primary-600));
}
</style>