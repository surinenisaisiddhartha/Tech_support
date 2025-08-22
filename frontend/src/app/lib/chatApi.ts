// frontend/src/app/lib/chatApi.ts
'use client';

import { apiClient } from './apiClient';
import { API_CONFIG } from './config';
import { ChatRequest, ChatResponse } from '../types';

export const chatApi = {
  async askQuestion(request: ChatRequest): Promise<ChatResponse> {
    return apiClient.post<ChatResponse>(
      API_CONFIG.ENDPOINTS.CHAT.ASK,
      request
    );
  },

  async askQuestionStream(request: ChatRequest): Promise<ReadableStream<Uint8Array>> {
    return apiClient.stream(
      API_CONFIG.ENDPOINTS.CHAT.ASK,
      request
    );
  },

  async uploadUrl(url: string): Promise<{ url: string; title?: string; summary: string }>{
    return apiClient.post(
      API_CONFIG.ENDPOINTS.FILES.UPLOAD_URL,
      { url }
    );
  },

  async processStreamResponse(stream: ReadableStream<Uint8Array>): Promise<string> {
    const reader = stream.getReader();
    const decoder = new TextDecoder();
    let fullResponse = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        
        if (done) break;
        
        const chunk = decoder.decode(value, { stream: true });
        fullResponse += chunk;
      }
      
      return fullResponse;
    } finally {
      reader.releaseLock();
    }
  },

  async streamToCallback(
    request: ChatRequest,
    onChunk: (chunk: string) => void,
    onComplete?: (fullResponse: string) => void,
    onError?: (error: Error) => void
  ): Promise<void> {
    try {
      const stream = await this.askQuestionStream(request);
      const reader = stream.getReader();
      const decoder = new TextDecoder();
      let fullResponse = '';

      while (true) {
        const { done, value } = await reader.read();
        
        if (done) break;
        
        const chunk = decoder.decode(value, { stream: true });
        fullResponse += chunk;
        onChunk(chunk);
      }

      if (onComplete) {
        onComplete(fullResponse);
      }
    } catch (error) {
      if (onError) {
        onError(error as Error);
      } else {
        throw error;
      }
    }
  }
};