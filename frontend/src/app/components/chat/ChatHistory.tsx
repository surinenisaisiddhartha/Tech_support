// frontend/src/app/components/chat/ChatHistory.tsx
'use client';

import React, { useState } from 'react';
import { History, MessageSquare, Clock, Trash2, RefreshCw, AlertCircle } from 'lucide-react';
import { useHistory } from '../../hooks/useHistory';
import { HistoryMessage } from '../../types';

interface ChatHistoryProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectMessage?: (message: HistoryMessage) => void;
}

const ChatHistory: React.FC<ChatHistoryProps> = ({ isOpen, onClose, onSelectMessage }) => {
  const { messages, isLoading, error, loadRecentMessages, clearHistory, clearError } = useHistory();
  const [showConfirmClear, setShowConfirmClear] = useState(false);

  if (!isOpen) return null;

  const handleRefresh = () => {
    loadRecentMessages();
  };

  const handleClearHistory = async () => {
    if (!showConfirmClear) {
      setShowConfirmClear(true);
      return;
    }

    try {
      await clearHistory();
      setShowConfirmClear(false);
    } catch (error) {
      // Error is handled by the hook
    }
  };

  const handleMessageSelect = (message: HistoryMessage) => {
    if (onSelectMessage) {
      onSelectMessage(message);
    }
    onClose();
  };

  const formatTimestamp = (timestamp: Date) => {
    const date = new Date(timestamp);
    return date.toLocaleString();
  };

  const truncateText = (text: string, maxLength: number = 100) => {
    if (!text) return "";
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <History size={20} className="text-purple-600" />
            <h2 className="text-xl font-semibold text-gray-900">Chat History</h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleRefresh}
              disabled={isLoading}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              title="Refresh"
            >
              <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              ×
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {/* Error Display */}
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg mb-4">
              <AlertCircle size={16} className="text-red-600" />
              <span className="text-sm text-red-700 flex-1">{error}</span>
              <button
                onClick={clearError}
                className="text-red-600 hover:text-red-700"
              >
                ×
              </button>
            </div>
          )}

          {/* Loading State */}
          {isLoading && messages.length === 0 && (
            <div className="flex items-center justify-center py-8">
              <RefreshCw size={20} className="animate-spin text-purple-600 mr-2" />
              <span className="text-gray-600">Loading chat history...</span>
            </div>
          )}

          {/* Empty State */}
          {!isLoading && messages.length === 0 && !error && (
            <div className="text-center py-8">
              <MessageSquare size={48} className="text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No chat history found</p>
              <p className="text-sm text-gray-400 mt-2">
                Start a conversation to see your chat history here
              </p>
            </div>
          )}

          {/* Messages List */}
          {messages.length > 0 && (
            <div className="space-y-3">
                            {messages.map((message) => (
                <div
                                    key={message.id}
                  onClick={() => handleMessageSelect(message)}
                >
                  <div className="flex items-start gap-3">
                    <MessageSquare size={16} className="text-purple-600 mt-1 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-sm font-medium text-gray-700">Question:</span>
                        <div className="flex items-center gap-1 text-xs text-gray-500">
                          <Clock size={12} />
                          {formatTimestamp(message.timestamp)}
                        </div>
                      </div>
                      <p className="text-sm text-gray-800 mb-3">
                        {truncateText(message.question)}
                      </p>
                      <div className="mb-2">
                        <span className="text-sm font-medium text-gray-700">Answer:</span>
                      </div>
                      <p className="text-sm text-gray-600">
                        {truncateText(message.answer, 150)}
                      </p>
                      {message.metadata && (
                        <div className="mt-2 flex items-center gap-2">
                          {message.metadata.blocked && (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-red-100 text-red-800">
                              Blocked
                            </span>
                          )}
                          {message.metadata.is_tech !== undefined && (
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs ${
                              message.metadata.is_tech 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-yellow-100 text-yellow-800'
                            }`}>
                              {message.metadata.is_tech ? 'Tech Support' : 'General'}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        {messages.length > 0 && (
          <div className="border-t border-gray-200 p-4">
            <div className="flex justify-between items-center">
              <p className="text-sm text-gray-500">
                {messages.length} message{messages.length !== 1 ? 's' : ''}
              </p>
              <div className="space-x-2">
                {showConfirmClear ? (
                  <>
                    <button
                      onClick={() => setShowConfirmClear(false)}
                      className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleClearHistory}
                      disabled={isLoading}
                      className="px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
                    >
                      {isLoading ? 'Clearing...' : 'Confirm Clear'}
                    </button>
                  </>
                ) : (
                  <button
                    onClick={handleClearHistory}
                    className="flex items-center gap-1 px-3 py-1 text-sm text-red-600 hover:text-red-700"
                  >
                    <Trash2 size={14} />
                    Clear History
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatHistory;