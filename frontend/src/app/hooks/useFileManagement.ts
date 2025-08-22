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
      // Always set error and return null; no popup alerts
      setUploadError(errorMessage);
      return null;
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