// frontend/src/app/components/chat/SettingsPanel.tsx
'use client';

import React, { useState } from 'react';
import { Settings, Shield, RefreshCw, Trash2, LogOut, AlertCircle } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useFileManagement } from '../../hooks/useFileManagement';
import { useHistory } from '../../hooks/useHistory';

interface SettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

const SettingsPanel: React.FC<SettingsPanelProps> = ({ isOpen, onClose }) => {
  const { user, setDomainFilter, logout, error, clearError } = useAuth();
  const { resetVectorStore, uploadError, clearErrors } = useFileManagement();
  const { clearHistory, error: historyError } = useHistory();
  
  const [isResetting, setIsResetting] = useState(false);
  const [isClearingHistory, setIsClearingHistory] = useState(false);
  const [showConfirmReset, setShowConfirmReset] = useState(false);
  const [showConfirmClearHistory, setShowConfirmClearHistory] = useState(false);

  if (!isOpen) return null;

  const handleDomainFilterChange = async (enabled: boolean) => {
    try {
      await setDomainFilter(enabled);
    } catch (error) {
      // Error is handled by the hook
    }
  };

  const handleResetVectorStore = async () => {
    if (!showConfirmReset) {
      setShowConfirmReset(true);
      return;
    }

    setIsResetting(true);
    try {
      await resetVectorStore();
      setShowConfirmReset(false);
      alert('Vector store has been reset successfully!');
    } catch (error) {
      // Error is handled by the hook
    } finally {
      setIsResetting(false);
    }
  };

  const handleClearHistory = async () => {
    if (!showConfirmClearHistory) {
      setShowConfirmClearHistory(true);
      return;
    }

    setIsClearingHistory(true);
    try {
      await clearHistory();
      setShowConfirmClearHistory(false);
      alert('Chat history has been cleared successfully!');
    } catch (error) {
      // Error is handled by the hook
    } finally {
      setIsClearingHistory(false);
    }
  };

  const handleLogout = () => {
    logout();
    onClose();
  };

  const currentError = error || uploadError || historyError;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <Settings size={20} className="text-purple-600" />
            <h2 className="text-xl font-semibold text-gray-900">Settings</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
          >
            ×
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* User Info */}
          {user && (
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="text-sm font-medium text-gray-700 mb-2">Account</h3>
              <p className="text-sm text-gray-600">
                <strong>Email:</strong> {user.email}
              </p>
              {user.username && (
                <p className="text-sm text-gray-600">
                  <strong>Username:</strong> {user.username}
                </p>
              )}
            </div>
          )}

          {/* Error Display */}
          {currentError && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
              <AlertCircle size={16} className="text-red-600" />
              <span className="text-sm text-red-700">{currentError}</span>
              <button
                onClick={() => {
                  clearError();
                  clearErrors();
                }}
                className="ml-auto text-red-600 hover:text-red-700"
              >
                ×
              </button>
            </div>
          )}

          {/* Data Management */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-gray-700">Data Management</h3>
            
            {/* Clear History */}
            <div className="space-y-2">
              <button
                onClick={handleClearHistory}
                disabled={isClearingHistory}
                className={`w-full flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                  showConfirmClearHistory
                    ? 'bg-red-600 text-white hover:bg-red-700'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {isClearingHistory ? (
                  <RefreshCw size={16} className="animate-spin" />
                ) : (
                  <Trash2 size={16} />
                )}
                {showConfirmClearHistory 
                  ? (isClearingHistory ? 'Clearing...' : 'Click to Confirm') 
                  : 'Clear Chat History'}
              </button>
              {showConfirmClearHistory && (
                <button
                  onClick={() => setShowConfirmClearHistory(false)}
                  className="w-full px-4 py-1 text-sm text-gray-600 hover:text-gray-800"
                >
                  Cancel
                </button>
              )}
            </div>

            {/* Reset Vector Store */}
            <div className="space-y-2">
              <button
                onClick={handleResetVectorStore}
                disabled={isResetting}
                className={`w-full flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                  showConfirmReset
                    ? 'bg-red-600 text-white hover:bg-red-700'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {isResetting ? (
                  <RefreshCw size={16} className="animate-spin" />
                ) : (
                  <RefreshCw size={16} />
                )}
                {showConfirmReset 
                  ? (isResetting ? 'Resetting...' : 'Click to Confirm') 
                  : 'Reset Document Store'}
              </button>
              {showConfirmReset && (
                <button
                  onClick={() => setShowConfirmReset(false)}
                  className="w-full px-4 py-1 text-sm text-gray-600 hover:text-gray-800"
                >
                  Cancel
                </button>
              )}
              <p className="text-xs text-gray-500">
                This will remove all uploaded documents and their embeddings
              </p>
            </div>
          </div>

          {/* Logout */}
          <div className="pt-4 border-t border-gray-200">
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-2 px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors"
            >
              <LogOut size={16} />
              Sign Out
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsPanel;