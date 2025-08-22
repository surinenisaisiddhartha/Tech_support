// frontend/src/app/hooks/useChat.ts
'use client';

import { useState, useCallback } from 'react';
import { chatApi } from '../lib/chatApi';
import { ChatRequest, Message } from '../types';

export function useChat(options?: { onChatComplete?: () => void }) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      type: "assistant",
      content: "Hello! I'm here to help. You can upload documents or ask me anything.",
      timestamp: new Date(),
    },
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const addMessage = useCallback((message: Message) => {
    setMessages(prev => [...prev, message]);
  }, []);

  const updateLastMessage = useCallback((content: string) => {
    setMessages(prev => {
      const updated = [...prev];
      if (updated.length > 0 && updated[updated.length - 1].type === 'assistant') {
        updated[updated.length - 1] = {
          ...updated[updated.length - 1],
          content,
          timestamp: new Date(),
        };
      }
      return updated;
    });
  }, []);

  const sendMessage = useCallback(async (query: string, filterMode?: boolean) => {
    if (!query.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      type: "user",
      content: query,
      timestamp: new Date(),
    };

    addMessage(userMessage);
    setIsLoading(true);
    setError(null);

    try {
      const request: ChatRequest = {
        query,
        ...(filterMode !== undefined && { filter_mode: filterMode })
      };

      const response = await chatApi.askQuestion(request);
      
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: "assistant",
        content: response.answer,
        timestamp: new Date(),
        metadata: {
          blocked: response.blocked,
          is_tech: response.is_tech,
        }
      };

      addMessage(assistantMessage);
    } catch (error) {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: "assistant",
        content: "Sorry, I encountered an error processing your request. Please try again.",
        timestamp: new Date(),
      };
      addMessage(errorMessage);
      setError(error instanceof Error ? error.message : 'Failed to send message');
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, addMessage]);

  const sendMessageStream = useCallback(async (query: string, filterMode?: boolean) => {
    if (!query.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      type: "user",
      content: query,
      timestamp: new Date(),
    };

    addMessage(userMessage);
    setIsLoading(true);
    setError(null);

    // Add initial empty assistant message
    const assistantMessage: Message = {
      id: (Date.now() + 1).toString(),
      type: "assistant",
      content: "",
      timestamp: new Date(),
    };
    addMessage(assistantMessage);

    try {
      const request: ChatRequest = {
        query,
        ...(filterMode !== undefined && { filter_mode: filterMode })
      };

      await chatApi.streamToCallback(
        request,
        (chunk: string) => {
          updateLastMessage(chunk);
        },
        (fullResponse: string) => {
          updateLastMessage(fullResponse);
          options?.onChatComplete?.();
        },
        (error: Error) => {
          updateLastMessage("Sorry, I encountered an error processing your request. Please try again.");
          setError(error.message);
        }
      );
    } catch (error) {
      updateLastMessage("Sorry, I encountered an error processing your request. Please try again.");
      setError(error instanceof Error ? error.message : 'Failed to send message');
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, addMessage, updateLastMessage, options?.onChatComplete]);

  const clearMessages = useCallback(() => {
    setMessages([
      {
        id: "1",
        type: "assistant",
        content: "Hello! I'm here to help. You can upload documents or ask me anything.",
        timestamp: new Date(),
      },
    ]);
    setError(null);
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    messages,
    isLoading,
    error,
    sendMessage,
    sendMessageStream,
    clearMessages,
    clearError,
    addMessage,
  };
}