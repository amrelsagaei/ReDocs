<script setup lang="ts">
import { ref, computed, watch } from "vue";
import Dialog from "primevue/dialog";
import Button from "primevue/button";
import Card from "primevue/card";
import Checkbox from "primevue/checkbox";
import Message from "primevue/message";
import DataTable from "primevue/datatable";
import Column from "primevue/column";
import InputText from "primevue/inputtext";
import Dropdown from "primevue/dropdown";

// Component props
const props = defineProps<{
  visible: boolean;
  variables: Array<any>;
  environmentName: string;
}>();

// Component events
const emit = defineEmits<{
  'update:visible': [value: boolean];
  'variables-selected': [selectedVariables: Array<any>, environmentName: string];
  'selection-cancelled': [];
}>();

// Component state
const selectedVariables = ref<Set<string>>(new Set());
const editableVariables = ref<Map<string, any>>(new Map());

// Variable type options
const variableTypeOptions = [
  { label: "Plain Text", value: "plain" },
  { label: "Secret", value: "secret" }
];

// Computed properties
const dialogVisible = computed({
  get: () => props.visible,
  set: (value: boolean) => emit("update:visible", value)
});

const tableData = computed(() => {
  // Force reactivity by accessing selectedVariables.value
  const currentSelection = selectedVariables.value;
  
  // Use Set to track unique IDs and ensure no duplicates
  const usedIds = new Set<string>();
  
  return props.variables.map((variable, index) => {
    // Generate more unique IDs to avoid duplicates
    let variableId = variable.key || `var_${index}_${variable.key}`;
    
    // Ensure ID uniqueness
    let counter = 0;
    let originalId = variableId;
    while (usedIds.has(variableId)) {
      counter++;
      variableId = `${originalId}_${counter}`;
    }
    usedIds.add(variableId);
    
    const editableVar = editableVariables.value.get(variableId) || variable;
    
    return {
      id: variableId,
      key: editableVar.key || variable.key,
      value: editableVar.value || variable.value,
      enabled: editableVar.enabled !== undefined ? editableVar.enabled : variable.enabled,
      isSecret: editableVar.isSecret !== undefined ? editableVar.isSecret : variable.isSecret,
      selected: currentSelection.has(variableId),
      originalVariable: variable
    };
  });
});

const selectedCount = computed(() => selectedVariables.value.size);
const totalCount = computed(() => props.variables.length);

// Computed property for select all checkbox (matching RequestSelectionModal pattern)
const selectAll = computed({
  get: () => {
    const tableItems = tableData.value;
    const selection = selectedVariables.value;
    return tableItems.length > 0 && tableItems.every(item => selection.has(item.id));
  },
  set: (value: boolean) => {
    const tableItems = tableData.value;
    if (value) {
      // Select all using the same IDs as tableData
      selectedVariables.value = new Set(tableItems.map(item => item.id));
    } else {
      // Deselect all
      selectedVariables.value = new Set();
    }
  }
});

// Initialize with all variables selected (matching RequestSelectionModal pattern)
watch(() => props.variables, (newVariables) => {
  if (newVariables && newVariables.length > 0) {
    // Use the same ID generation logic as tableData
    const usedIds = new Set<string>();
    const newSelection = new Set<string>();
    const newEditableVars = new Map<string, any>();
    
    newVariables.forEach((variable, index) => {
      let variableId = variable.key || `var_${index}_${variable.key}`;
      
      // Ensure ID uniqueness
      let counter = 0;
      let originalId = variableId;
      while (usedIds.has(variableId)) {
        counter++;
        variableId = `${originalId}_${counter}`;
      }
      usedIds.add(variableId);
      newSelection.add(variableId);
      newEditableVars.set(variableId, { ...variable });
    });
    
    selectedVariables.value = newSelection;
    editableVariables.value = newEditableVars;
  }
}, { immediate: true });

// Handle individual variable selection (matching RequestSelectionModal pattern)
const handleVariableSelection = (variableId: string, selected: boolean | any) => {
  const newSelection = new Set(selectedVariables.value);
  
  if (selected) {
    newSelection.add(variableId);
  } else {
    newSelection.delete(variableId);
  }
  
  selectedVariables.value = newSelection;
};

// Handle row click to toggle selection (matching RequestSelectionModal pattern)
const handleRowClick = (rowData: any) => {
  const isSelected = selectedVariables.value.has(rowData.id);
  handleVariableSelection(rowData.id, !isSelected);
};

// Update editable variable property
const updateVariable = (variableId: string, field: string, value: any) => {
  const current = editableVariables.value.get(variableId) || {};
  const updated = { ...current, [field]: value };
  editableVariables.value.set(variableId, updated);
  // Force reactivity
  editableVariables.value = new Map(editableVariables.value);
};

// Handle secret type change specifically
const handleSecretTypeChange = (variableId: string, value: string) => {
  updateVariable(variableId, 'isSecret', value === 'secret');
};

// Handle continue with selected variables (matching RequestSelectionModal pattern)
const handleContinue = () => {
  // Use tableData to get the correct mapping of IDs to variables
  const tableItems = tableData.value;
  const selected = tableItems
    .filter(item => selectedVariables.value.has(item.id))
    .map(item => ({
      key: item.key,
      value: item.value,
      enabled: item.enabled,
      isSecret: item.isSecret,
      originalVariable: item.originalVariable
    }));
  
  emit('variables-selected', selected, props.environmentName);
  closeModal();
};

// Handle cancel (matching RequestSelectionModal pattern)
const handleCancel = () => {
  emit('selection-cancelled');
  closeModal();
};

// Close modal
const closeModal = () => {
  dialogVisible.value = false;
};


</script>

<template>
  <Dialog
    :visible="dialogVisible"
    @update:visible="dialogVisible = $event"
    :modal="true"
    :closable="true"
    :draggable="false"
    class="environment-selection-modal"
    :breakpoints="{ '960px': '98vw' }"
  >
    <template #header>
      <div class="flex items-center gap-3">
        <i class="fas fa-cogs text-xl text-primary-600"></i>
        <span class="text-lg font-semibold">Select Variables to Import</span>
      </div>
    </template>

    <div class="flex flex-col gap-6">
      <!-- Environment Info -->
      <Card>
        <template #content>
          <div class="flex items-center justify-between mb-4">
            <div class="flex items-center gap-3">
              <i class="fas fa-layer-group text-primary-600"></i>
              <div>
                <h3 class="font-semibold text-surface-900 dark:text-surface-0">{{ environmentName }}</h3>
                <p class="text-sm font-medium text-surface-600 dark:text-surface-300">
                  {{ totalCount }} environment variables found
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
                          <strong>Choose which variables to import:</strong> A new environment will be created and variables will be added to it. Variables marked as "Secret" were auto-detected based on their names (auth, token, key, etc.).
                        </div>
                      </Message>
        </template>
      </Card>

      <!-- Variable Selection Table -->
      <Card>
        <template #title>
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <i class="fas fa-table text-primary-600"></i>
              <span>Available Variables</span>
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
          <div class="variable-table-container">
            <DataTable 
              :value="tableData" 
              scrollable 
              scroll-height="400px"
              :rows="50"
              class="variable-selection-table"
              striped-rows
              size="small"
            >
              <Column header="" :style="{ width: '60px' }">
                <template #body="{ data }">
                  <div class="flex justify-center" @click.stop>
                    <Checkbox
                      :model-value="data.selected"
                      @update:model-value="value => handleVariableSelection(data.id, value)"
                      binary
                    />
                  </div>
                </template>
              </Column>
              
              <Column header="Variable Name" :style="{ minWidth: '200px' }">
                <template #body="{ data }">
                  <div @click="handleRowClick(data)" class="cursor-pointer">
                    <InputText
                      :model-value="data.key"
                      @update:model-value="value => updateVariable(data.id, 'key', value)"
                      class="w-full"
                      size="small"
                      @click.stop
                    />
                  </div>
                </template>
              </Column>
              
              <Column header="Value" :style="{ minWidth: '250px' }">
                <template #body="{ data }">
                  <div @click="handleRowClick(data)" class="cursor-pointer">
                    <InputText
                      :model-value="data.value"
                      @update:model-value="value => updateVariable(data.id, 'value', value)"
                      :type="data.isSecret ? 'password' : 'text'"
                      class="w-full"
                      size="small"
                      placeholder="Enter variable value..."
                      @click.stop
                    />
                  </div>
                </template>
              </Column>
              
              <Column header="Type" :style="{ width: '140px' }">
                <template #body="{ data }">
                  <div @click="handleRowClick(data)" class="cursor-pointer">
                    <Dropdown
                      :model-value="data.isSecret ? 'secret' : 'plain'"
                      @update:model-value="value => handleSecretTypeChange(data.id, value)"
                      :options="variableTypeOptions"
                      option-label="label"
                      option-value="value"
                      class="w-full"
                      size="small"
                      @click.stop
                    />
                  </div>
                </template>
              </Column>

              <Column header="Status" :style="{ width: '100px' }">
                <template #body="{ data }">
                  <div @click="handleRowClick(data)" class="cursor-pointer">
                    <div class="flex items-center gap-2">
                      <i 
                        :class="data.enabled ? 'fas fa-check-circle text-green-500' : 'fas fa-times-circle text-gray-500'"
                      ></i>
                      <span :class="data.enabled ? 'text-green-400' : 'text-gray-400'" class="text-sm font-medium">
                        {{ data.enabled ? 'Enabled' : 'Disabled' }}
                      </span>
                    </div>
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
              {{ selectedCount }} variables will be imported into a new environment: <span class="text-primary-400 font-mono">[ReDocs]-{{ environmentName }}</span>
            </span>
        
        <div class="flex items-center gap-4">
          <Button
            label="Cancel Import"
            severity="secondary"
            @click="handleCancel"
            class="flex items-center gap-2"
          >
            <template #icon>
              <i class="fas fa-times"></i>
            </template>
          </Button>
          
          <Button
            :label="`Import ${selectedCount} Variables`"
            :disabled="selectedCount === 0"
            @click="handleContinue"
            class="flex items-center gap-2"
          >
            <template #icon>
              <i class="fas fa-check"></i>
            </template>
          </Button>
        </div>
      </div>
    </template>
  </Dialog>
</template>

<style scoped>
/* Modal styling to match other modals */
.environment-selection-modal :deep(.p-dialog) {
  border-radius: 8px;
  background: rgb(var(--c-surface-0));
  border: 1px solid rgb(var(--c-surface-200));
}

.environment-selection-modal :deep(.p-dialog-content) {
  padding: 2rem;
}

.environment-selection-modal :deep(.p-dialog-footer) {
  padding: 0;
  border-top: 1px solid rgb(var(--c-surface-200));
}

/* Table styling */
.variable-table-container {
  border-radius: 6px;
  overflow: hidden;
  border: 1px solid rgb(var(--c-surface-200));
}

.variable-selection-table :deep(.p-datatable-header) {
  background: rgb(var(--c-surface-100));
  border-bottom: 1px solid rgb(var(--c-surface-200));
}

.variable-selection-table :deep(.p-datatable-tbody > tr:hover) {
  background: rgb(var(--c-surface-100));
}

.variable-selection-table :deep(.p-datatable-tbody > tr > td) {
  padding: 0.75rem;
  border-bottom: 1px solid rgb(var(--c-surface-200));
  vertical-align: middle;
}

.variable-selection-table :deep(.p-datatable-thead > tr > th) {
  padding: 1rem 0.75rem;
  font-weight: 600;
  color: rgb(var(--c-surface-700));
  background: rgb(var(--c-surface-50));
  border-bottom: 2px solid rgb(var(--c-surface-200));
}

/* Checkbox styling */
.select-all-checkbox :deep(.p-checkbox-box) {
  border-color: rgb(var(--c-primary-500));
}

.select-all-checkbox :deep(.p-checkbox-box.p-highlight) {
  background: rgb(var(--c-primary-500));
  border-color: rgb(var(--c-primary-500));
}

/* Input and dropdown styling for table */
.variable-selection-table :deep(.p-inputtext) {
  border: 1px solid transparent;
  background: transparent;
  padding: 0.375rem 0.5rem;
  font-size: 0.875rem;
  transition: all 0.2s;
}

.variable-selection-table :deep(.p-inputtext:hover) {
  border-color: rgb(var(--c-surface-300));
  background: rgb(var(--c-surface-50));
}

.variable-selection-table :deep(.p-inputtext:focus) {
  border-color: rgb(var(--c-primary-500));
  background: rgb(var(--c-surface-0));
  box-shadow: 0 0 0 2px rgba(var(--c-primary-500), 0.2);
}

.variable-selection-table :deep(.p-dropdown) {
  border: 1px solid transparent;
  background: transparent;
  transition: all 0.2s;
  min-height: auto;
}

.variable-selection-table :deep(.p-dropdown:hover) {
  border-color: rgb(var(--c-surface-300));
  background: rgb(var(--c-surface-50));
}

.variable-selection-table :deep(.p-dropdown:focus-within) {
  border-color: rgb(var(--c-primary-500));
  background: rgb(var(--c-surface-0));
  box-shadow: 0 0 0 2px rgba(var(--c-primary-500), 0.2);
}

/* Card styling */
.environment-selection-modal :deep(.p-card) {
  border: 1px solid rgb(var(--c-surface-200));
  border-radius: 6px;
  box-shadow: none;
}

.environment-selection-modal :deep(.p-card-content) {
  padding: 1.5rem;
}

.environment-selection-modal :deep(.p-card-title) {
  margin-bottom: 1rem;
  font-size: 1.125rem;
  font-weight: 600;
}

/* Button styling */
.environment-selection-modal :deep(.p-button) {
  padding: 0.75rem 1.5rem;
  font-weight: 500;
  border-radius: 6px;
  transition: all 0.2s;
}

.environment-selection-modal :deep(.p-button:not(:disabled):hover) {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

/* Message styling */
.environment-selection-modal :deep(.p-message) {
  border-radius: 6px;
  border-left: 4px solid rgb(var(--c-primary-500));
}
</style>