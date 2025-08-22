// frontend/src/app/components/chat/FileUploadArea.tsx
'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Upload, File, X, Loader, AlertCircle, Check, Link2 } from 'lucide-react';
import { useFileManagement } from '../../hooks/useFileManagement';
import { UploadedFile, Message } from '../../types';
import { fileApi } from '../../lib/fileApi';

interface FileUploadAreaProps {
  onFileUploaded?: (file: UploadedFile, message?: Message) => void;
  disabled?: boolean;
}

const FileUploadArea: React.FC<FileUploadAreaProps> = ({ onFileUploaded, disabled }) => {
  const { isUploading, uploadError, clearErrors, handleFileUpload } = useFileManagement();
  const [dragActive, setDragActive] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // URL modal state
  const [showUrlModal, setShowUrlModal] = useState(false);
  const [urlValue, setUrlValue] = useState('');
  const [isUrlUploading, setIsUrlUploading] = useState(false);
  const [urlError, setUrlError] = useState<string | null>(null);
  const [urlSuccess, setUrlSuccess] = useState<string | null>(null);

  // Domain validation popups disabled; treat all errors uniformly
  const isDomainError = false;
  
  // Always show a lightweight banner for any error
  const shouldShowModal = false;
  const shouldShowBanner = !!uploadError || !!urlError;

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

  const handleFileButtonClick = () => {
    if (disabled) return;
    fileInputRef.current?.click();
  };

  const openUrlModal = () => {
    if (disabled) return;
    setUrlError(null);
    setUrlSuccess(null);
    setUrlValue('');
    setShowUrlModal(true);
  };

  const closeUrlModal = () => {
    setShowUrlModal(false);
  };

  const handleUrlUpload = async () => {
    if (!urlValue.trim()) {
      setUrlError('Please enter a valid URL');
      return;
    }
    try {
      setIsUrlUploading(true);
      setUrlError(null);
      const res = await fileApi.uploadUrl(urlValue.trim());
      setUrlSuccess(`URL ingested: ${res.title || res.url}`);
      // Optionally push a summary message to chat via onFileUploaded-like callback
      if (onFileUploaded) {
        const pseudoFile: UploadedFile = {
          id: Date.now().toString(),
          name: res.title || res.url,
          summary: res.summary,
          uploadTime: new Date(),
        };
        const msg: Message = {
          id: Date.now().toString(),
          type: 'assistant',
          content: `🔗 ${res.title || res.url} ingested successfully!\n\nSummary:\n${res.summary}`,
          timestamp: new Date(),
        };
        onFileUploaded(pseudoFile, msg);
      }
      // Close after short delay
      setTimeout(() => {
        setShowUrlModal(false);
        setUrlSuccess(null);
      }, 1200);
    } catch (e: any) {
      setUrlError(e?.message || 'Failed to ingest URL');
    } finally {
      setIsUrlUploading(false);
    }
  };

  return (
    <div className="w-full">
      {/* Error Display - Only show banner for non-domain errors */}
      {shouldShowBanner && (
        <div className="mb-4 flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
          <AlertCircle size={16} className="text-red-600 flex-shrink-0" />
          <span className="text-sm text-red-700 flex-1">{uploadError || urlError}</span>
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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
                {/* Upload file card */}
                <button
                  type="button"
                  onClick={handleFileButtonClick}
                  disabled={disabled}
                  className={`flex flex-col items-center justify-center gap-2 border rounded-lg p-4 transition ${disabled ? 'bg-gray-50 border-gray-200 text-gray-400' : 'hover:border-purple-400 hover:bg-purple-50 border-gray-200'}`}
                >
                  <div className={`p-3 rounded-full ${disabled ? 'bg-gray-200' : 'bg-purple-100'}`}>
                    <File size={24} className={disabled ? 'text-gray-400' : 'text-purple-600'} />
                  </div>
                  <span className="text-sm font-medium">Upload file</span>
                  <span className="text-xs text-gray-500">PDF only</span>
                </button>

                {/* Paste URL card */}
                <button
                  type="button"
                  onClick={openUrlModal}
                  disabled={disabled}
                  className={`flex flex-col items-center justify-center gap-2 border rounded-lg p-4 transition ${disabled ? 'bg-gray-50 border-gray-200 text-gray-400' : 'hover:border-purple-400 hover:bg-purple-50 border-gray-200'}`}
                >
                  <div className={`p-3 rounded-full ${disabled ? 'bg-gray-200' : 'bg-purple-100'}`}>
                    <Link2 size={24} className={disabled ? 'text-gray-400' : 'text-purple-600'} />
                  </div>
                  <span className="text-sm font-medium">Paste URL</span>
                  <span className="text-xs text-gray-500">Scrape and ingest</span>
                </button>
              </div>
               
               <div>
                <p className={`text-xs ${disabled ? 'text-gray-300' : 'text-gray-500'} mt-2`}>
                  Drag and drop a PDF anywhere in this area, or choose an option above
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

      {/* Floating URL Modal */}
      {showUrlModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={closeUrlModal} />
          <div className="relative bg-white rounded-lg shadow-xl w-full max-w-md mx-4 p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-800">Paste URL</h3>
              <button onClick={closeUrlModal} className="text-gray-500 hover:text-gray-700">
                <X size={18} />
              </button>
            </div>
            <div className="space-y-3">
              <input
                type="url"
                placeholder="https://example.com/article"
                value={urlValue}
                onChange={(e) => setUrlValue(e.target.value)}
                className="w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
              />
              <button
                type="button"
                onClick={handleUrlUpload}
                disabled={isUrlUploading}
                className={`w-full inline-flex items-center justify-center gap-2 text-sm font-medium rounded-md px-3 py-2 ${isUrlUploading ? 'bg-purple-300' : 'bg-purple-600 hover:bg-purple-700'} text-white`}
              >
                {isUrlUploading ? <Loader size={16} className="animate-spin" /> : <Link2 size={16} />}
                {isUrlUploading ? 'Uploading...' : 'No Upload'}
              </button>
              {urlSuccess && (
                <div className="flex items-center gap-2 p-2 bg-green-50 border border-green-200 rounded">
                  <Check size={14} className="text-green-600" />
                  <span className="text-xs text-green-700">{urlSuccess}</span>
                </div>
              )}
              {urlError && (
                <div className="flex items-center gap-2 p-2 bg-red-50 border border-red-200 rounded">
                  <AlertCircle size={14} className="text-red-600" />
                  <span className="text-xs text-red-700">{urlError}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FileUploadArea;