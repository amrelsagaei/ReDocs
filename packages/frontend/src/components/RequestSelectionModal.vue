<script setup lang="ts">
import { ref, computed, watch } from "vue";
import Dialog from "primevue/dialog";
import Button from "primevue/button";
import Card from "primevue/card";
import Checkbox from "primevue/checkbox";
import Message from "primevue/message";
import DataTable from "primevue/datatable";
import Column from "primevue/column";

// Component props
const props = defineProps<{
  visible: boolean;
  requests: Array<any>;
  collectionName: string;
  collectionType: 'postman' | 'openapi';
}>();

// Component events
const emit = defineEmits<{
  'update:visible': [value: boolean];
  'requests-selected': [selectedRequests: Array<any>];
  'selection-cancelled': [];
}>();

// Component state
const selectedRequests = ref<Set<string>>(new Set());

// Computed properties
const dialogVisible = computed({
  get: () => props.visible,
  set: (value: boolean) => emit("update:visible", value)
});

const tableData = computed(() => {
  // Force reactivity by accessing selectedRequests.value
  const currentSelection = selectedRequests.value;
  
  // Use Set to track unique IDs and ensure no duplicates
  const usedIds = new Set<string>();
  
  return props.requests.map((request, index) => {
    // Generate more unique IDs to avoid duplicates
    let requestId = request.id || `req_${index}_${request.method}_${request.url}`;
    
    // Ensure ID uniqueness
    let counter = 0;
    let originalId = requestId;
    while (usedIds.has(requestId)) {
      counter++;
      requestId = `${originalId}_${counter}`;
    }
    usedIds.add(requestId);
    
    return {
      id: requestId,
      name: request.name || `${request.method} ${getPathFromUrl(request.url)}`,
      method: request.method?.toUpperCase() || 'GET',
      path: getPathFromUrl(request.url),
      url: request.url,
      request: request,
      selected: currentSelection.has(requestId)
    };
  });
});

const selectedCount = computed(() => selectedRequests.value.size);
const totalCount = computed(() => props.requests.length);

// Computed property for select all checkbox
const selectAll = computed({
  get: () => {
    const tableItems = tableData.value;
    const selection = selectedRequests.value;
    return tableItems.length > 0 && tableItems.every(item => selection.has(item.id));
  },
  set: (value: boolean) => {
    const tableItems = tableData.value;
    if (value) {
      // Select all using the same IDs as tableData
      const newSelection = new Set<string>();
      tableItems.forEach(item => {
        newSelection.add(item.id);
      });
      selectedRequests.value = newSelection;
    } else {
      // Deselect all
      selectedRequests.value = new Set();
    }
  }
});

// Extract path from URL for display
const getPathFromUrl = (url: string): string => {
  if (!url) return '/';
  
  try {
    // Handle template URLs like {{baseUrl}}/api/users
    if (url.includes('{{') && url.includes('}}')) {
      const templateEnd = url.lastIndexOf('}}');
      if (templateEnd !== -1) {
        let pathAfterTemplate = url.substring(templateEnd + 2);
        if (!pathAfterTemplate.startsWith('/')) {
          pathAfterTemplate = '/' + pathAfterTemplate;
        }
        return pathAfterTemplate;
      }
    }
    
    // Handle full URLs
    if (url.includes('://')) {
      const urlParts = url.split('://');
      if (urlParts.length > 1 && urlParts[1]) {
        const afterProtocol = urlParts[1];
        const firstSlash = afterProtocol.indexOf('/');
        if (firstSlash !== -1) {
          return afterProtocol.substring(firstSlash);
        } else {
          return '/';
        }
      }
    }
    
    // Handle paths that start with /
    if (url.startsWith('/')) {
      return url;
    }
    
    // Handle relative paths
    return '/' + url;
  } catch (error) {
    return url;
  }
};

// Initialize with all requests selected
watch(() => props.requests, (newRequests) => {
  if (newRequests && newRequests.length > 0) {
    // Use the same ID generation logic as tableData
    const usedIds = new Set<string>();
    const newSelection = new Set<string>();
    
    newRequests.forEach((request, index) => {
      let requestId = request.id || `req_${index}_${request.method}_${request.url}`;
      
      // Ensure ID uniqueness
      let counter = 0;
      let originalId = requestId;
      while (usedIds.has(requestId)) {
        counter++;
        requestId = `${originalId}_${counter}`;
      }
      usedIds.add(requestId);
      newSelection.add(requestId);
    });
    
    selectedRequests.value = newSelection;
  }
}, { immediate: true });

// Handle individual request selection
const handleRequestSelection = (requestId: string, selected: boolean | any) => {
  const newSelection = new Set(selectedRequests.value);
  
  if (selected) {
    newSelection.add(requestId);
  } else {
    newSelection.delete(requestId);
  }
  
  selectedRequests.value = newSelection;
};

// Handle row click to toggle selection
const handleRowClick = (rowData: any) => {
  const isSelected = selectedRequests.value.has(rowData.id);
  handleRequestSelection(rowData.id, !isSelected);
};

// Handle continue with selected requests
const handleContinue = () => {
  // Use tableData to get the correct mapping of IDs to requests
  const tableItems = tableData.value;
  const selected = tableItems
    .filter(item => selectedRequests.value.has(item.id))
    .map(item => item.request);
  
  emit('requests-selected', selected);
  closeModal();
};

// Handle cancel
const handleCancel = () => {
  emit('selection-cancelled');
  closeModal();
};

// Close modal
const closeModal = () => {
  dialogVisible.value = false;
};

// Get method badge class
const getMethodBadgeClass = (method: string) => {
  const baseClasses = "px-3 py-1.5 text-xs font-bold rounded-md border";
  
  switch (method.toUpperCase()) {
    case 'GET':
      return `${baseClasses} bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800`;
    case 'POST':
      return `${baseClasses} bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800`;
    case 'PUT':
      return `${baseClasses} bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-900/20 dark:text-orange-400 dark:border-orange-800`;
    case 'PATCH':
      return `${baseClasses} bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-400 dark:border-yellow-800`;
    case 'DELETE':
      return `${baseClasses} bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800`;
    default:
      return `${baseClasses} bg-gray-50 text-gray-700 border-gray-200 dark:bg-gray-900/20 dark:text-gray-400 dark:border-gray-800`;
  }
};
</script>

<template>
  <Dialog 
    :visible="dialogVisible"
    @update:visible="dialogVisible = $event"
    modal
    :style="{ width: '95vw', maxWidth: '1200px', height: 'auto', maxHeight: '90vh' }"
    :draggable="false"
    class="request-selection-modal"
    :breakpoints="{ '960px': '98vw' }"
  >
    <template #header>
      <div class="flex items-center gap-3">
        <i class="fas fa-list text-xl text-primary-600"></i>
        <span class="text-lg font-semibold">Select Requests to Import</span>
      </div>
    </template>

    <div class="flex flex-col gap-6">
      <!-- Collection Info -->
      <Card>
        <template #content>
          <div class="flex items-center justify-between mb-4">
            <div class="flex items-center gap-3">
              <i class="fas fa-file-import text-primary-600"></i>
              <div>
                <h3 class="font-semibold text-surface-900 dark:text-surface-0">{{ collectionName }}</h3>
                <p class="text-sm font-medium text-surface-600 dark:text-surface-300">
                  {{ totalCount }} {{ collectionType === 'postman' ? 'Postman' : 'OpenAPI' }} requests found
                </p>
              </div>
            </div>
            
            <div class="text-right">
              <p class="text-sm font-medium text-surface-900 dark:text-surface-0">
                {{ selectedCount }} of {{ totalCount }} selected
              </p>
            </div>
          </div>

          <Message 
            severity="info" 
            :closable="false"
            class="mb-4"
          >
            <div class="text-sm">
              <strong>Choose which requests to import:</strong> Uncheck any requests you don't want to include in your Caido replay sessions.
            </div>
          </Message>
        </template>
      </Card>

      <!-- Request Selection Table -->
      <Card>
        <template #title>
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <i class="fas fa-table text-primary-600"></i>
              <span>Available Requests</span>
            </div>
            
            <!-- Select All Checkbox -->
            <div class="flex items-center gap-2">
              <Checkbox
                v-model="selectAll"
                binary
                class="select-all-checkbox"
              />
              <label class="text-sm font-medium text-surface-900 dark:text-surface-0 cursor-pointer" @click="selectAll = !selectAll">
                {{ selectAll ? 'Unselect All' : 'Select All' }}
              </label>
            </div>
          </div>
        </template>
        <template #content>
          <div class="request-table-container">
            <DataTable 
              :value="tableData" 
              scrollable 
              scroll-height="400px"
              :rows="50"
              class="request-selection-table"
              striped-rows
              size="small"
            >
              <Column header="" :style="{ width: '60px' }">
                <template #body="{ data }">
                  <div class="flex justify-center" @click.stop>
                    <Checkbox
                      :model-value="data.selected"
                      @update:model-value="value => handleRequestSelection(data.id, value)"
                      binary
                    />
                  </div>
                </template>
              </Column>
              
              <Column header="Method" :style="{ width: '100px' }">
                <template #body="{ data }">
                  <div @click="handleRowClick(data)" class="cursor-pointer">
                    <span :class="getMethodBadgeClass(data.method)">
                      {{ data.method }}
                    </span>
                  </div>
                </template>
              </Column>
              
              <Column header="Path" field="path" :style="{ minWidth: '200px' }">
                <template #body="{ data }">
                  <div @click="handleRowClick(data)" class="cursor-pointer">
                    <code class="text-sm font-mono text-surface-800 dark:text-surface-200 bg-surface-100 dark:bg-surface-800 px-2 py-1 rounded">
                      {{ data.path }}
                    </code>
                  </div>
                </template>
              </Column>
              
              <Column header="Name" field="name" :style="{ minWidth: '250px' }">
                <template #body="{ data }">
                  <div @click="handleRowClick(data)" class="cursor-pointer">
                    <span class="text-sm text-surface-900 dark:text-surface-0">
                      {{ data.name }}
                    </span>
                  </div>
                </template>
              </Column>
            </DataTable>
          </div>
        </template>
      </Card>
    </div>

    <template #footer>
      <div class="flex justify-between items-center px-6 py-4">
        <span class="text-sm text-surface-600 dark:text-surface-300 pr-4">
            {{ selectedCount }} requests will be imported
          </span>
        <Button
          label="Cancel Import"
          severity="secondary"
          @click="handleCancel"
          class="flex items-center gap-2 mr-4"
        >
          <template #icon>
            <i class="fas fa-times"></i>
          </template>
        </Button>
        
        <div class="flex items-center gap-6">
          <Button
            label="Continue to Authentication"
            :disabled="selectedCount === 0"
            @click="handleContinue"
            class="flex items-center gap-2"
          >
            <template #icon>
              <i class="fas fa-arrow-right"></i>
            </template>
          </Button>
          

        </div>
      </div>
    </template>
  </Dialog>
</template>

<style scoped>
/* Modal styling to match other modals */
.request-selection-modal :deep(.p-dialog) {
  border-radius: 8px;
  background: rgb(var(--c-surface-0));
  border: 1px solid rgb(var(--c-surface-200));
}

.request-selection-modal :deep(.p-dialog-content) {
  padding: 2rem;
  background: rgb(var(--c-surface-0));
}

.request-selection-modal :deep(.p-dialog-header) {
  padding: 1.5rem 2rem 0.5rem 2rem;
  border-bottom: none;
  background: rgb(var(--c-surface-0));
}

.request-selection-modal :deep(.p-dialog-footer) {
  padding: 1rem 2rem 2rem 2rem;
  border-top: 1px solid rgb(var(--c-surface-200));
  background: rgb(var(--c-surface-0));
}

/* Dark mode support */
[data-mode="dark"] .request-selection-modal :deep(.p-dialog) {
  background: rgb(var(--c-surface-900));
  border-color: rgb(var(--c-surface-700));
}

[data-mode="dark"] .request-selection-modal :deep(.p-dialog-content),
[data-mode="dark"] .request-selection-modal :deep(.p-dialog-header),
[data-mode="dark"] .request-selection-modal :deep(.p-dialog-footer) {
  background: rgb(var(--c-surface-900));
}

[data-mode="dark"] .request-selection-modal :deep(.p-dialog-footer) {
  border-top-color: rgb(var(--c-surface-700));
}

/* Table styling */
.request-table-container {
  border-radius: 6px;
  overflow: hidden;
  border: 1px solid rgb(var(--c-surface-200));
}

[data-mode="dark"] .request-table-container {
  border-color: rgb(var(--c-surface-700));
}

.request-selection-table :deep(.p-datatable-table) {
  border-collapse: separate;
  border-spacing: 0;
}

.request-selection-table :deep(.p-datatable-thead > tr > th) {
  background: rgb(var(--c-surface-100));
  color: rgb(var(--c-surface-900));
  font-weight: 600;
  padding: 1rem;
  border-bottom: 1px solid rgb(var(--c-surface-200));
}

[data-mode="dark"] .request-selection-table :deep(.p-datatable-thead > tr > th) {
  background: rgb(var(--c-surface-800));
  color: rgb(var(--c-surface-0));
  border-bottom-color: rgb(var(--c-surface-700));
}

.request-selection-table :deep(.p-datatable-tbody > tr > td) {
  padding: 0.75rem 1rem;
  border-bottom: 1px solid rgb(var(--c-surface-200));
}

[data-mode="dark"] .request-selection-table :deep(.p-datatable-tbody > tr > td) {
  border-bottom-color: rgb(var(--c-surface-700));
}

.request-selection-table :deep(.p-datatable-tbody > tr) {
  cursor: pointer;
  transition: background-color 0.2s ease;
}

.request-selection-table :deep(.p-datatable-tbody > tr:hover > td) {
  background: rgb(var(--c-surface-50)) !important;
}

[data-mode="dark"] .request-selection-table :deep(.p-datatable-tbody > tr:hover > td) {
  background: rgb(var(--c-surface-800)) !important;
}

/* Enhanced striped rows */
.request-selection-table :deep(.p-datatable-tbody > tr:nth-child(even) > td) {
  background: rgb(var(--c-surface-25));
}

[data-mode="dark"] .request-selection-table :deep(.p-datatable-tbody > tr:nth-child(even) > td) {
  background: rgb(var(--c-surface-850));
}

.request-selection-table :deep(.p-datatable-tbody > tr:nth-child(odd) > td) {
  background: rgb(var(--c-surface-0));
}

[data-mode="dark"] .request-selection-table :deep(.p-datatable-tbody > tr:nth-child(odd) > td) {
  background: rgb(var(--c-surface-900));
}

/* Checkbox styling */
.select-all-checkbox :deep(.p-checkbox-box) {
  border-color: hsl(var(--c-primary-600));
}

.select-all-checkbox :deep(.p-checkbox-box.p-highlight) {
  background: hsl(var(--c-primary-600));
  border-color: hsl(var(--c-primary-600));
}

/* Caido brand color utilities */
.text-primary-600 {
  color: hsl(var(--c-primary-600));
}

.bg-surface-100 {
  background-color: hsl(var(--c-surface-100));
}

.bg-surface-800 {
  background-color: hsl(var(--c-surface-800));
}
</style>
