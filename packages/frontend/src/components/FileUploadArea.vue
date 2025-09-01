<script setup lang="ts">
import { ref, computed } from "vue";
import FileUpload from "primevue/fileupload";
import Message from "primevue/message";

import { useSDK } from "../plugins/sdk";

// Component props and events
const props = defineProps<{
  disabled?: boolean;
}>();

const emit = defineEmits<{
  'import-success': [result: any, fileContent?: string, fileName?: string];
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
  "OpenAPI Specification (.json only)",
  "Postman Environment (.json)"
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
      emit('import-success', result, fileContent, file.name);
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
          <h3 class="text-3xl font-bold text-white mb-4">
            Import Your API Documentation
          </h3>
          <p class="text-xl text-white mb-6 font-medium">
            Drag and drop your file here, or click to browse
          </p>
          
          <div class="supported-formats mb-6">
            <div class="flex items-center gap-2 mb-3">
              <i class="fas fa-file-code text-primary-600"></i>
              <p class="text-lg font-bold text-white">
                Supported formats:
              </p>
            </div>
            <div class="format-list">
              <div v-for="format in supportedFormats" :key="format" class="format-item">
                <i class="fas fa-check text-primary-600"></i>
                <span class="text-base font-medium">{{ format }}</span>
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
      class="mt-6"
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
  width: 100%;
}

.upload-area {
  position: relative;
  width: 100%;
  min-height: 28rem;
  border: 2px dashed var(--c-border-default);
  border-radius: 0.75rem;
  transition: all 0.2s ease-in-out;
  cursor: pointer;
  background: var(--c-bg-default);
  aspect-ratio: 5/3;
}

.upload-area:hover {
  background: var(--c-bg-subtle);
  border-color: var(--c-border-hover);
}

.upload-area.drag-over {
  border: 2px solid var(--c-accent-primary);
  background: var(--c-bg-accent-subtle);
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  transform: scale(1.02);
}

.upload-area.uploading {
  border: 2px solid var(--c-accent-primary);
  background: var(--c-bg-accent-subtle);
}

.upload-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  padding: 2rem;
  text-align: center;
}

.upload-icon {
  margin-bottom: 1.5rem;
  opacity: 0.9;
}

.upload-text {
  max-width: 50rem;
  width: 100%;
}

.supported-formats {
  text-align: left;
}

.format-list {
  display: grid;
  grid-template-columns: repeat(1, minmax(0, 1fr));
  gap: 0.75rem;
}

@media (min-width: 1024px) {
  .format-list {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 768px) {
  .upload-area {
    min-height: 24rem;
  }
  
  .upload-content {
    padding: 1.5rem;
  }
  
  .upload-text h3 {
    font-size: 1.75rem;
  }
  
  .upload-text p {
    font-size: 1.125rem;
  }
}

.format-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  font-size: 1rem;
  color: white;
  padding: 0.75rem 1rem;
  border-radius: 0.5rem;
  background: var(--c-bg-subtle);
  border: 1px solid var(--c-border-default);
  transition: all 0.2s ease;
}

.format-item:hover {
  background: var(--c-bg-hover);
  border-color: var(--c-border-hover);
  transform: translateY(-1px);
}

.upload-progress {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  padding: 1.5rem;
}

.progress-content {
  text-align: center;
  max-width: 32rem;
  color: var(--c-text-primary);
}

.upload-button {
  display: inline-block;
}

/* Custom FileUpload styling - beautiful white button */
:deep(.p-fileupload-choose) {
  background-color: white;
  border: 2px solid white;
  color: #374151;
  padding: 1rem 2rem;
  font-size: 1.125rem;
  font-weight: 600;
  border-radius: 0.75rem;
  transition: all 0.2s ease-in-out;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
}

:deep(.p-fileupload-choose:hover) {
  background-color: #f9fafb;
  border-color: #f9fafb;
  transform: translateY(-1px);
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
}

:deep(.p-fileupload-choose:active) {
  transform: translateY(0);
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
}

/* Caido theme color utilities */
.text-primary {
  color: var(--c-text-primary);
}

.text-secondary {
  color: var(--c-text-secondary);
}

.text-accent {
  color: var(--c-accent-primary);
}
</style>

