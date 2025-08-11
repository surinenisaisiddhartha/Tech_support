// frontend/src/app/hooks/useHistory.ts
'use client';

import { useState, useEffect, useCallback } from 'react';
import { historyApi } from '../lib/historyApi';
import { HistoryMessage } from '../types';
import { useAuthContext } from '../contexts/AuthContext';

export function useHistory() {
  const [messages, setMessages] = useState<HistoryMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { isAuthenticated } = useAuthContext();

  const loadRecentMessages = useCallback(async (limit: number = 20) => {
    if (!isAuthenticated) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await historyApi.getRecentMessages(limit);
      setMessages(response.messages);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to load history');
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated]);

  const clearHistory = useCallback(async () => {
    if (!isAuthenticated) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      await historyApi.clearHistory();
      setMessages([]);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to clear history');
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated]);

  const refreshHistory = useCallback(async () => {
    await loadRecentMessages();
  }, [loadRecentMessages]);

  // Auto-load history when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      loadRecentMessages();
    } else {
      setMessages([]);
    }
  }, [isAuthenticated, loadRecentMessages]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    messages,
    isLoading,
    error,
    loadRecentMessages,
    clearHistory,
    refreshHistory,
    clearError,
  };
}