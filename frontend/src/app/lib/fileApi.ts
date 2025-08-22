// frontend/src/app/lib/fileApi.ts
'use client';

import { apiClient } from './apiClient';
import { API_CONFIG } from './config';
import { UploadResponse } from '../types';

export const fileApi = {
  async uploadFile(file: File): Promise<UploadResponse> {
    return apiClient.upload<UploadResponse>(
      API_CONFIG.ENDPOINTS.FILES.UPLOAD,
      file
    );
  },

  async uploadUrl(url: string): Promise<{ url: string; title?: string; summary: string }>{
    return apiClient.post(
      API_CONFIG.ENDPOINTS.FILES.UPLOAD_URL,
      { url }
    );
  },

  async deleteFile(filename: string): Promise<{ success: boolean; message: string }> {
    const encodedFilename = encodeURIComponent(filename);
    return apiClient.delete<{ success: boolean; message: string }>(
      `${API_CONFIG.ENDPOINTS.FILES.DELETE}/${encodedFilename}`
    );
  },

  async resetVectorStore(): Promise<{ message: string }> {
    return apiClient.post<{ message: string }>(
      API_CONFIG.ENDPOINTS.FILES.RESET
    );
  }
};