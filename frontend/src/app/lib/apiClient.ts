// frontend/src/app/lib/apiClient.ts
'use client';

import { API_CONFIG } from './config';
import { ApiError } from '../types';

class ApiClient {
  private baseUrl: string;

  constructor() {
    this.baseUrl = API_CONFIG.BASE_URL;
  }

  private getAuthToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('access_token');
  }

  private getAuthHeaders(): Record<string, string> {
    const token = this.getAuthToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;

    const isFormData =
      typeof FormData !== 'undefined' && options.body instanceof FormData;

    const baseHeaders = isFormData ? {} : API_CONFIG.HEADERS.JSON;

    const config: RequestInit = {
      ...options,
      headers: {
        ...baseHeaders,
        ...this.getAuthHeaders(),
        ...options.headers,
      },
    };

    try {
      const response = await fetch(url, config);

      if (!response.ok) {
        let errorData: ApiError;
        try {
          errorData = await response.json();
        } catch {
          errorData = { error: `HTTP ${response.status}: ${response.statusText}` };
        }
        
        const errorMessage = errorData.error || (errorData as any).detail || 'Request failed';
        
        // Create a custom error object for domain validation errors
        const isDomainError = errorMessage.includes('tech support') || 
                             errorMessage.includes('troubleshooting') ||
                             errorMessage.includes('software') ||
                             errorMessage.includes('hardware');
        
        const error = new Error(errorMessage);
        (error as any).isDomainValidationError = isDomainError;
        (error as any).statusCode = response.status;
        
        throw error;
      }

      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        return {} as T;
      }

      return await response.json();
    } catch (error) {
      // Only log console errors for non-domain validation errors
      const isDomainError = (error as any).isDomainValidationError;
      if (!isDomainError) {
        console.error(`API request failed for ${endpoint}:`, error);
      }
      throw error;
    }
  }

  async get<T>(endpoint: string, params?: Record<string, string>): Promise<T> {
    const url = params ? `${endpoint}?${new URLSearchParams(params)}` : endpoint;
    return this.request<T>(url, { method: 'GET' });
    }

  async post<T>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }

  async upload<T>(endpoint: string, file: File): Promise<T> {
    const formData = new FormData();
    formData.append('file', file);

    return this.request<T>(endpoint, {
      method: 'POST',
      body: formData,
      headers: this.getAuthHeaders(),
    });
  }

  async stream(endpoint: string, data: any): Promise<ReadableStream<Uint8Array>> {
    const url = `${this.baseUrl}${endpoint}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        ...API_CONFIG.HEADERS.JSON,
        ...this.getAuthHeaders(),
        Accept: 'text/event-stream',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      let errorData: ApiError;
      try {
        errorData = await response.json();
      } catch {
        errorData = { error: `HTTP ${response.status}: ${response.statusText}` };
      }
      throw new Error(errorData.error || 'Stream request failed');
    }

    if (!response.body) {
      throw new Error('Response body is null');
    }

    return response.body;
  }
}

export const apiClient = new ApiClient();