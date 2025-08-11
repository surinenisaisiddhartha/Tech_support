// frontend/src/app/hooks/useFileManagement.ts
'use client';

import { useState, useCallback } from 'react';
import { fileApi } from '../lib/fileApi';
import { UploadedFile, Message } from '../types';

export function useFileManagement() {
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const uploadFile = useCallback(async (
    file: File,
    onSuccess?: (file: UploadedFile, message?: Message) => void
  ) => {
    if (!file) return;

    setIsUploading(true);
    setUploadError(null);

    try {
      const response = await fileApi.uploadFile(file);
      
      const newFile: UploadedFile = {
        id: Date.now().toString(),
        name: response.filename,
        summary: response.summary,
        uploadTime: new Date(),
      };

      setUploadedFiles(prev => [...prev, newFile]);

      // Create success message
      const successMessage: Message = {
        id: Date.now().toString(),
        type: "assistant",
        content: `📄 ${response.filename} uploaded successfully!\n\nSummary:\n${response.summary}`,
        timestamp: new Date(),
      };

      if (onSuccess) {
        onSuccess(newFile, successMessage);
      }

      return newFile;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to upload file';
      
      // Check if it's a domain validation error using the metadata from apiClient
      const isDomainError = (error as any).isDomainValidationError || 
                           errorMessage.includes('tech support') || 
                           errorMessage.includes('troubleshooting') ||
                           errorMessage.includes('software') ||
                           errorMessage.includes('hardware');
      
      if (isDomainError) {
        // Show popup for domain validation errors
        alert(`❌ Upload Failed - Invalid Document Type\n\n${errorMessage}\n\nPlease upload only:\n• Technical documentation\n• Troubleshooting guides\n• Software manuals\n• Hardware documentation\n• User manuals for tech products`);
        
        // Set error but don't throw for domain validation errors
        setUploadError(errorMessage);
        return null; // Return null instead of throwing
      } else {
        // For other errors, set error and throw
        setUploadError(errorMessage);
        throw new Error(errorMessage);
      }
    } finally {
      setIsUploading(false);
    }
  }, []);

  const deleteFile = useCallback(async (fileName: string) => {
    setDeleteError(null);
    
    try {
      await fileApi.deleteFile(fileName);
      setUploadedFiles(prev => prev.filter(file => file.name !== fileName));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete file';
      setDeleteError(errorMessage);
      throw new Error(errorMessage);
    }
  }, []);

  const resetVectorStore = useCallback(async () => {
    try {
      await fileApi.resetVectorStore();
      setUploadedFiles([]);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to reset vector store';
      setUploadError(errorMessage);
      throw new Error(errorMessage);
    }
  }, []);

  const clearErrors = useCallback(() => {
    setUploadError(null);
    setDeleteError(null);
  }, []);

  const handleFileUpload = useCallback(async (
    files: FileList | null,
    onSuccess?: (file: UploadedFile, message?: Message) => void
  ) => {
    if (!files || files.length === 0) return;
    
    const file = files[0];
    return uploadFile(file, onSuccess);
  }, [uploadFile]);

  return {
    uploadedFiles,
    isUploading,
    uploadError,
    deleteError,
    uploadFile,
    deleteFile,
    resetVectorStore,
    handleFileUpload,
    clearErrors,
    setUploadedFiles, // For external state updates if needed
  };
}