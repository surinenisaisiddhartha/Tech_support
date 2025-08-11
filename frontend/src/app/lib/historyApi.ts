// frontend/src/app/lib/historyApi.ts
'use client';

import { apiClient } from './apiClient';
import { API_CONFIG } from './config';
import { HistoryResponse } from '../types';

export const historyApi = {
  async getRecentMessages(limit: number = 20): Promise<HistoryResponse> {
    return apiClient.get<HistoryResponse>(
      API_CONFIG.ENDPOINTS.HISTORY.RECENT,
      { limit: limit.toString() }
    );
  },

  async clearHistory(): Promise<{ ok: boolean; deleted: number }> {
    return apiClient.post<{ ok: boolean; deleted: number }>(
      API_CONFIG.ENDPOINTS.HISTORY.CLEAR
    );
  }
};