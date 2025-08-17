<script setup lang="ts">
import { ref, computed } from "vue";
import FileUpload from "primevue/fileupload";
import Message from "primevue/message";

import { useSDK } from "@/plugins/sdk";

// Component props and events
const props = defineProps<{
  disabled?: boolean;
}>();

const emit = defineEmits<{
  'import-success': [result: any];
  'import-error': [error: string];
}>();

// SDK instance for backend communication
const sdk = useSDK();

// Component state
const isUploading = ref(false);
const uploadProgress = ref(0);
const dragOverCount = ref(0);
const selectedFile = ref<File | null>(null);

// Computed properties
const isDragOver = computed(() => dragOverCount.value > 0);
const supportedFormats = computed(() => [
  "Postman Collection (.json)",
  "OpenAPI Specification (.json only)"
]);

/**
 * Handles file selection from file input or drag-drop
 * @param event - File upload event
 */
const onFileSelect = async (event: any) => {
  if (props.disabled) return;
  
  const files = event.files || event.target.files;
  if (files && files.length > 0) {
    selectedFile.value = files[0];
    await processFile(files[0]);
  }
};

/**
 * Validates if the file type is supported
 * @param file - File to validate
 * @returns True if file is supported
 */
const isFileSupported = (file: File): boolean => {
  const supportedExtensions = ['.json'];
  const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
  return supportedExtensions.includes(fileExtension);
};



/**
 * Processes the uploaded file
 * @param file - File to process
 */
const processFile = async (file: File) => {
  if (!isFileSupported(file)) {
    emit('import-error', `Unsupported file type. Please upload ${supportedFormats.value.join(' or ')}.`);
    return;
  }

  isUploading.value = true;
  uploadProgress.value = 0;

  try {
    
    if (sdk.window && sdk.window.showToast) {
      sdk.window.showToast(`Processing File: Analyzing ${file.name}...`, {
        variant: "info"
      });
    }

    // Simulate progress updates
    const progressInterval = setInterval(() => {
      if (uploadProgress.value < 90) {
        uploadProgress.value += 10;
      }
    }, 200);

    // Skip frontend file type detection - let backend handle it with auto-detection

    // Read file content
    const fileContent = await file.text();
    
        // Send to backend for processing (auto-detects file type)
    if (!sdk.backend || !sdk.backend.processImportFile) {
      throw new Error('Backend processImportFile function not available');
    }

    const result = await sdk.backend.processImportFile(fileContent, file.name);
    
    clearInterval(progressInterval);
    uploadProgress.value = 100;

    // Wait a moment to show 100% progress
    setTimeout(() => {
      isUploading.value = false;
      uploadProgress.value = 0;
      selectedFile.value = null;

          if (result?.success) {
      emit('import-success', result);
    } else {
      const errorMsg = result?.message || 'Failed to process file. Please check the file format and try again.';
      emit('import-error', errorMsg);
    }
    }, 500);

  } catch (error) {
    isUploading.value = false;
    uploadProgress.value = 0;
    selectedFile.value = null;
    
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred during file processing.';
    emit('import-error', errorMessage);
  }
};



/**
 * Handles drag enter event
 */
const onDragEnter = (event: DragEvent) => {
  if (props.disabled) return;
  event.preventDefault();
  dragOverCount.value++;
};

/**
 * Handles drag leave event
 */
const onDragLeave = (event: DragEvent) => {
  event.preventDefault();
  dragOverCount.value = Math.max(0, dragOverCount.value - 1);
};

/**
 * Handles drag over event
 */
const onDragOver = (event: DragEvent) => {
  event.preventDefault();
  event.dataTransfer!.dropEffect = 'copy';
};

/**
 * Handles file drop event
 */
const onDrop = (event: DragEvent) => {
  if (props.disabled) return;
  event.preventDefault();
  dragOverCount.value = 0;

  const files = event.dataTransfer?.files;
  if (files && files.length > 0) {
    const file = files[0];
    if (file) {
      selectedFile.value = file;
      processFile(file);
    }
  }
};

/**
 * Handles click on upload area to trigger file selection
 */
const onUploadAreaClick = () => {
  if (!isUploading.value && !props.disabled) {
    const fileInput = document.querySelector('.upload-file-input') as HTMLInputElement;
    if (fileInput) {
      fileInput.click();
    }
  }
};
</script>

<template>
  <div class="file-upload-container">
    <!-- Upload Area -->
                    <div
                  :class="[
                    'upload-area',
                    { 'drag-over': isDragOver },
                    { 'uploading': isUploading },
                    { 'disabled': props.disabled }
                  ]"
                  @dragenter="!props.disabled && onDragEnter"
                  @dragleave="!props.disabled && onDragLeave"
                  @dragover="!props.disabled && onDragOver"
                  @drop="!props.disabled && onDrop"
                  @click="!props.disabled && onUploadAreaClick"
                >
      <div v-if="!isUploading" class="upload-content">
        <div class="upload-icon">
          <i class="fas fa-cloud-upload-alt text-6xl text-primary-600"></i>
        </div>
        
        <div class="upload-text">
          <h3 class="text-xl font-semibold text-surface-900 dark:text-surface-0 mb-2">
            Import Your API Documentation
          </h3>
          <p class="text-surface-800 dark:text-surface-200 mb-4 font-medium">
            Drag and drop your file here, or click to browse
          </p>
          
          <div class="supported-formats mb-6">
            <div class="flex items-center gap-2 mb-3">
              <i class="fas fa-file-code text-primary-600"></i>
              <p class="text-sm font-bold text-white">
                Supported formats:
              </p>
            </div>
            <div class="format-list">
              <div v-for="format in supportedFormats" :key="format" class="format-item">
                <i class="fas fa-check text-success-600"></i>
                <span>{{ format }}</span>
              </div>
            </div>
          </div>
          
          <FileUpload
            mode="basic"
            name="importFile"
            accept=".json"
            :multiple="false"
            :auto="false"
            choose-label="Choose File"
            class="upload-button upload-file-input"
            @select="onFileSelect"
          />
        </div>
      </div>

                <!-- Upload Progress - Removed as requested -->
          <div v-else class="upload-progress">
            <div class="progress-content">
              <i class="fas fa-file-import text-4xl text-primary-600 mb-4"></i>
              <h3 class="text-lg font-semibold text-surface-900 dark:text-surface-0 mb-2">
                Processing {{ selectedFile?.name }}
              </h3>
              <p class="text-surface-800 dark:text-surface-200 mb-4 font-medium">
                Reading and parsing file...
              </p>
            </div>
          </div>
    </div>

    <!-- File Size Limit Notice -->
    <Message 
      severity="info" 
      class="mt-4"
      icon="fas fa-info-circle"
    >
      <div class="text-sm text-surface-800 dark:text-surface-200">
        <strong class="text-white font-bold">File size limit:</strong> Maximum 10MB per file.
        Large collections will be processed in batches for optimal performance.
      </div>
    </Message>
  </div>
</template>

<style scoped>
.file-upload-container {
  @apply w-full;
}

.upload-area {
  @apply relative w-full min-h-96 border-2 border-dashed border-surface-300 dark:border-surface-600 
         rounded-lg transition-all duration-200 ease-in-out cursor-pointer
         bg-surface-50 dark:bg-surface-800 hover:bg-surface-100 dark:hover:bg-surface-700;
}

.upload-area.drag-over {
  @apply border-primary-400 bg-primary-50 dark:bg-primary-900/20 
         shadow-lg scale-[1.02] border-solid;
}

.upload-area.uploading {
  @apply border-solid border-primary-500 bg-primary-50 dark:bg-primary-900/20;
}

.upload-content {
  @apply flex flex-col items-center justify-center h-full p-8 text-center;
}

.upload-icon {
  @apply mb-6 opacity-70;
}

.upload-text {
  @apply max-w-md;
}

.supported-formats {
  @apply text-left;
}

.format-list {
  @apply grid grid-cols-1 gap-2;
}

.format-item {
  @apply flex items-center gap-2 text-sm text-surface-800 dark:text-surface-200 
         px-3 py-2 rounded-md bg-surface-100 dark:bg-surface-800 
         border border-surface-200 dark:border-surface-700 transition-colors;
}

.format-item:hover {
  @apply bg-surface-200 dark:bg-surface-700;
}

.upload-progress {
  @apply flex items-center justify-center h-full p-8;
}

.progress-content {
  @apply text-center max-w-md;
}

.upload-button {
  @apply inline-block;
}

/* Custom FileUpload styling using Caido brand colors */
:deep(.p-fileupload-choose) {
  background-color: hsl(var(--c-primary-600));
  border-color: hsl(var(--c-primary-600));
  color: white;
  padding: 0.75rem 1.5rem;
  font-size: 1rem;
  font-weight: 500;
  border-radius: 0.5rem;
  transition: all 0.2s ease-in-out;
}

:deep(.p-fileupload-choose:hover) {
  background-color: hsl(var(--c-primary-700));
  border-color: hsl(var(--c-primary-700));
}

/* Caido brand color utilities */
.text-primary-600 {
  color: hsl(var(--c-primary-600));
}

.text-primary-700 {
  color: hsl(var(--c-primary-700));
}

.text-success-600 {
  color: hsl(var(--c-success-600));
}
</style>
