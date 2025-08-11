// frontend/src/app/components/chat/FileUploadArea.tsx
'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Upload, File, X, Loader, AlertCircle, Check } from 'lucide-react';
import { useFileManagement } from '../../hooks/useFileManagement';
import { UploadedFile, Message } from '../../types';
import { ErrorModal } from '../ui/ErrorModal';

interface FileUploadAreaProps {
  onFileUploaded?: (file: UploadedFile, message?: Message) => void;
  disabled?: boolean;
}

const FileUploadArea: React.FC<FileUploadAreaProps> = ({ onFileUploaded, disabled }) => {
  const { isUploading, uploadError, clearErrors, handleFileUpload } = useFileManagement();
  const [dragActive, setDragActive] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Check if the error is a domain validation error
  const isDomainError = uploadError && (
    uploadError.includes('tech support') || 
    uploadError.includes('troubleshooting') ||
    uploadError.includes('software') ||
    uploadError.includes('hardware')
  );
  
  // Show modal for domain validation errors, banner for other errors
  const shouldShowModal = isDomainError && uploadError;
  const shouldShowBanner = uploadError && !isDomainError;

  // Show modal when there's a domain validation error
  useEffect(() => {
    if (shouldShowModal) {
      setShowErrorModal(true);
    }
  }, [shouldShowModal]);

  const handleCloseErrorModal = () => {
    setShowErrorModal(false);
    clearErrors();
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (disabled) return;
    
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (disabled || !e.dataTransfer.files || e.dataTransfer.files.length === 0) return;

    await processFiles(e.dataTransfer.files);
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (disabled || !e.target.files || e.target.files.length === 0) return;
    
    await processFiles(e.target.files);
  };

  const processFiles = async (files: FileList) => {
    const file = files[0];
    
    // Validate file type
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      clearErrors();
      // You might want to show a specific error for invalid file types
      return;
    }

    // Clear previous states
    clearErrors();
    setUploadSuccess(null);

    try {
      const uploadedFile = await handleFileUpload(files, (file, message) => {
        setUploadSuccess(`Successfully uploaded: ${file.name}`);
        if (onFileUploaded) {
          onFileUploaded(file, message);
        }
        
        // Clear success message after 3 seconds
        setTimeout(() => setUploadSuccess(null), 3000);
      });
    } catch (error) {
      // Error is handled by the hook
    }

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleButtonClick = () => {
    if (disabled) return;
    fileInputRef.current?.click();
  };

  return (
    <div className="w-full">
      {/* Error Display - Only show banner for non-domain errors */}
      {shouldShowBanner && (
        <div className="mb-4 flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
          <AlertCircle size={16} className="text-red-600 flex-shrink-0" />
          <span className="text-sm text-red-700 flex-1">{uploadError}</span>
          <button
            onClick={clearErrors}
            className="text-red-600 hover:text-red-700"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Success Display */}
      {uploadSuccess && (
        <div className="mb-4 flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
          <Check size={16} className="text-green-600 flex-shrink-0" />
          <span className="text-sm text-green-700">{uploadSuccess}</span>
        </div>
      )}

      {/* Upload Area */}
      <div
        className={`relative border-2 border-dashed rounded-lg p-6 text-center transition-all ${
          dragActive
            ? 'border-purple-400 bg-purple-50'
            : disabled
            ? 'border-gray-200 bg-gray-50'
            : 'border-gray-300 hover:border-purple-400 hover:bg-purple-50'
        } ${disabled ? 'cursor-not-allowed' : 'cursor-pointer'}`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={handleButtonClick}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf"
          onChange={handleFileSelect}
          className="hidden"
          disabled={disabled}
        />

        <div className="flex flex-col items-center gap-3">
          {isUploading ? (
            <>
              <Loader size={32} className="animate-spin text-purple-600" />
              <p className="text-sm font-medium text-purple-600">Uploading...</p>
              <p className="text-xs text-gray-500">
                Processing your PDF document...
              </p>
            </>
          ) : (
            <>
              <div className={`p-3 rounded-full ${
                disabled ? 'bg-gray-200' : 'bg-purple-100'
              }`}>
                {dragActive ? (
                  <Upload size={24} className="text-purple-600" />
                ) : (
                  <File size={24} className={disabled ? 'text-gray-400' : 'text-purple-600'} />
                )}
              </div>
              
              <div>
                <p className={`text-sm font-medium ${
                  disabled ? 'text-gray-400' : 'text-gray-700'
                }`}>
                  {dragActive 
                    ? 'Drop your PDF here'
                    : 'Upload PDF Document'
                  }
                </p>
                <p className={`text-xs ${
                  disabled ? 'text-gray-300' : 'text-gray-500'
                } mt-1`}>
                  Drag and drop or click to browse
                </p>
              </div>

              {!disabled && (
                <div className="flex items-center gap-4 text-xs text-gray-400">
                  <span>PDF files only</span>
                  <span>•</span>
                  <span>Max 50MB</span>
                </div>
              )}
            </>
          )}
        </div>

        {/* Drag overlay */}
        {dragActive && !disabled && (
          <div className="absolute inset-0 bg-purple-500 bg-opacity-10 border-2 border-purple-400 rounded-lg flex items-center justify-center">
            <div className="bg-white rounded-lg p-4 shadow-lg">
              <Upload size={32} className="text-purple-600 mx-auto mb-2" />
              <p className="text-sm font-medium text-purple-600">
                Drop your PDF here
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Instructions */}
      {!disabled && (
        <div className="mt-3 text-center">
          <p className="text-xs text-gray-500">
            Supported formats: PDF • 
            Your documents will be processed for tech support queries
          </p>
        </div>
      )}

      {/* Error Modal for Domain Validation */}
      <ErrorModal
        isOpen={showErrorModal}
        onClose={handleCloseErrorModal}
        title="Invalid Document Type"
        message={uploadError || ""}
        type="warning"
      />
    </div>
  );
};

export default FileUploadArea;