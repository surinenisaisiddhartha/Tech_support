// frontend/src/app/components/ui/ErrorModal.tsx
'use client';

import React from 'react';
import { X, AlertTriangle } from 'lucide-react';

interface ErrorModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  message: string;
  type?: 'error' | 'warning';
}

export const ErrorModal: React.FC<ErrorModalProps> = ({ 
  isOpen, 
  onClose, 
  title,
  message,
  type = 'error'
}) => {
  if (!isOpen) return null;

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const iconColor = type === 'error' ? 'text-red-600' : 'text-yellow-600';
  const borderColor = type === 'error' ? 'border-red-200' : 'border-yellow-200';
  const bgColor = type === 'error' ? 'bg-red-50' : 'bg-yellow-50';

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={handleBackdropClick}
    >
      <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        {/* Header */}
        <div className={`flex items-center gap-3 p-4 border-b ${borderColor} ${bgColor} rounded-t-lg`}>
          <AlertTriangle size={24} className={iconColor} />
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          <button
            onClick={onClose}
            className="ml-auto p-1 hover:bg-white hover:bg-opacity-50 rounded-full transition-colors"
          >
            <X size={20} className="text-gray-600" />
          </button>
        </div>
        
        {/* Content */}
        <div className="p-4">
          <p className="text-gray-700 leading-relaxed">{message}</p>
        </div>
        
        {/* Footer */}
        <div className="flex justify-end p-4 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
};
