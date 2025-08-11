// frontend/src/app/components/chatbotInterface.tsx
"use client";
import React, { useState, useRef, useEffect } from "react";
import {
  Send,
  Upload,
  MessageSquare,
  FileText,
  Plus,
  Menu,
  X,
  File,
  Trash2,
  Loader,
  Settings,
  History,
  User,
  LogIn,
} from "lucide-react";

// Import custom hooks
import { useAuth } from "../hooks/useAuth";
import { useChat } from "../hooks/useChat";
import { useHistory } from "../hooks/useHistory";
import { useFileManagement } from "../hooks/useFileManagement";

// Import components
import { AuthModal } from "./auth/AuthModal";
import SettingsPanel from "./chat/SettingsPanel";
import ChatHistory from "./chat/ChatHistory";
import FileUploadArea from "./chat/FileUploadArea";

// Import types
import { Message, UploadedFile, HistoryMessage } from "../types";

// Types
type Mode = "chat" | "summary";

const Timestamp = ({ date }: { date: Date }) => {
  const [formatted, setFormatted] = useState("");
  useEffect(() => {
    setFormatted(date.toLocaleTimeString());
  }, [date]);
  return <span>{formatted}</span>;
};

const MessageBubble = ({ message }: { message: Message }) => (
  <div
    className={`flex ${
      message.type === "user" ? "justify-end" : "justify-start"
    } mb-4`}
  >
    <div
      className={`max-w-[80%] px-4 py-3 rounded-2xl ${
        message.type === "user"
          ? "bg-gradient-to-r from-purple-600 to-blue-600 text-white"
          : "bg-gray-100 text-gray-800 border border-gray-200"
      }`}
    >
      <div className="text-sm leading-relaxed whitespace-pre-wrap">
        {message.content}
      </div>
      <div
        className={`text-xs mt-2 flex items-center gap-2 ${
          message.type === "user" ? "text-purple-100" : "text-gray-500"
        }`}
      >
        <Timestamp date={message.timestamp} />
        {message.metadata && (
          <>
            {message.metadata.blocked && (
              <span className="bg-red-500 text-white px-1 py-0.5 rounded text-xs">
                Blocked
              </span>
            )}
            {message.metadata.is_tech !== undefined && (
              <span className={`px-1 py-0.5 rounded text-xs ${
                message.metadata.is_tech 
                  ? 'bg-green-500 text-white' 
                  : 'bg-yellow-500 text-white'
              }`}>
                {message.metadata.is_tech ? 'Tech' : 'General'}
              </span>
            )}
          </>
        )}
      </div>
    </div>
  </div>
);

type ChatMessagesProps = {
  messages: Message[];
  isLoading: boolean;
  messagesEndRef: React.RefObject<HTMLDivElement | null>;
};

const ChatMessages = React.memo(function ChatMessages({
  messages,
  isLoading,
  messagesEndRef,
}: ChatMessagesProps) {
  return (
    <div className="flex-grow flex flex-col justify-end space-y-4">
      {messages.map((message: Message) => (
        <MessageBubble key={message.id} message={message} />
      ))}
      {isLoading && (
        <div className="flex justify-start">
          <div className="bg-gray-100 border border-gray-200 px-4 py-3 rounded-2xl">
            <div className="flex items-center gap-2">
              <Loader size={16} className="animate-spin text-purple-600" />
              <span className="text-sm text-gray-600">Thinking...</span>
            </div>
          </div>
        </div>
      )}
      <div ref={messagesEndRef} />
    </div>
  );
});

const ChatbotInterface = () => {
  // UI State
  const [mode, setMode] = useState<Mode>("chat");
  const [inputValue, setInputValue] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [dragActive, setDragActive] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showSettingsPanel, setShowSettingsPanel] = useState(false);
  const [showHistoryPanel, setShowHistoryPanel] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<'login' | 'signup'>('login');

  // Custom hooks
  const { user, isAuthenticated, isLoading: authLoading, setDomainFilter } = useAuth();
    const { refreshHistory } = useHistory();
  const { messages, isLoading, sendMessageStream, clearMessages, addMessage } = useChat({ 
    onChatComplete: refreshHistory 
  });
  
  const { uploadedFiles, isUploading, deleteFile, handleFileUpload } = useFileManagement();

  // Refs
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () =>
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  useEffect(() => scrollToBottom(), [messages]);

  // Auth handlers
  const handleShowAuth = (mode: 'login' | 'signup') => {
    setAuthModalMode(mode);
    setShowAuthModal(true);
  };

  const handleRemoveFile = async (fileName: string) => {
    try {
      await deleteFile(fileName);
    } catch (error) {
      console.error("Error deleting file:", error);
      alert("Failed to delete file. Please try again.");
    }
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;
    
    if (!isAuthenticated) {
      handleShowAuth('login');
      return;
    }

    const query = inputValue;
    setInputValue("");
    
    // Always use domain-specific mode
    await sendMessageStream(query, true);
  };

  const handleFileUploadSuccess = (file: UploadedFile, message?: Message) => {
    if (mode === "summary" && message) {
      addMessage(message);
    }
    // Refresh history to include new interactions
    refreshHistory();
  };

  const handleFileUploadClick = () => {
    if (!isAuthenticated) {
      handleShowAuth('login');
      return;
    }
    fileInputRef.current?.click();
  };

  const handleHistoryMessageSelect = (historyMessage: HistoryMessage) => {
    // Add selected history message to current chat
    const userMessage: Message = {
      id: Date.now().toString(),
      type: "user",
      content: historyMessage.question,
      timestamp: new Date(historyMessage.timestamp),
    };
    
    const assistantMessage: Message = {
      id: (Date.now() + 1).toString(),
      type: "assistant",
      content: historyMessage.answer,
      timestamp: new Date(historyMessage.timestamp),
      metadata: historyMessage.metadata,
    };

    addMessage(userMessage);
    addMessage(assistantMessage);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isAuthenticated) return;
    setDragActive(e.type === "dragenter" || e.type === "dragover");
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (!isAuthenticated) {
      handleShowAuth('login');
      return;
    }
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files, handleFileUploadSuccess);
    }
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <div
        className={`${sidebarOpen ? "w-80" : "w-0"} transition-all duration-300 bg-white border-r border-gray-200 flex flex-col`}
      >
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
              Tech Support Bot
            </h1>
            <button
              onClick={() => setSidebarOpen(false)}
              className="p-1 hover:bg-gray-100 rounded-lg lg:hidden"
            >
              <X size={20} />
            </button>
          </div>

          {/* User Section */}
          <div className="mb-4">
            {isAuthenticated && user ? (
              <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                <User size={16} className="text-purple-600" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-700 truncate">
                    {user.username || user.email}
                  </p>
                  {user.username && (
                    <p className="text-xs text-gray-500 truncate">{user.email}</p>
                  )}
                </div>
                <button
                  onClick={() => setShowSettingsPanel(true)}
                  className="p-1 hover:bg-gray-200 rounded"
                  title="Settings"
                >
                  <Settings size={14} />
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <button
                  onClick={() => handleShowAuth('login')}
                  className="w-full flex items-center gap-2 px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                >
                  <LogIn size={16} />
                  Sign In
                </button>

              </div>
            )}
          </div>

          <button 
            onClick={clearMessages}
            className="w-full flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 transition-colors"
          >
            <Plus size={18} /> New Chat
          </button>
        </div>

        <div className="p-4 border-b border-gray-200">
          <div className="flex bg-gray-100 rounded-lg p-1 mb-3">
            <button
              onClick={() => setMode("chat")}
              className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-md transition-colors ${
                mode === "chat"
                  ? "bg-white text-purple-600 shadow-sm"
                  : "text-gray-600 hover:text-gray-800"
              }`}
            >
              <MessageSquare size={16} /> Chat
            </button>
            <button
              onClick={() => setMode("summary")}
              className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-md transition-colors ${
                mode === "summary"
                  ? "bg-white text-purple-600 shadow-sm"
                  : "text-gray-600 hover:text-gray-800"
              }`}
            >
              <FileText size={16} /> Summary
            </button>
          </div>

          {/* Action Buttons */}
          {isAuthenticated && (
            <button
              onClick={() => setShowHistoryPanel(true)}
              className="w-full flex items-center gap-2 px-3 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <History size={16} />
              Chat History
            </button>
          )}
        </div>

        <div className="flex-1 p-4 overflow-y-auto">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-700">
              Uploaded Documents
            </h3>
            <span className="text-xs text-gray-500">
              {uploadedFiles.length}
            </span>
          </div>

          {uploadedFiles.length === 0 ? (
            <div className="text-center py-4">
              <File size={32} className="text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-500">No documents uploaded</p>
              {isAuthenticated && (
                <p className="text-xs text-gray-400 mt-1">
                  Upload PDFs to get started
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              {uploadedFiles.map((file) => (
                <div
                  key={file.id}
                  className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg"
                >
                  <File size={16} className="text-blue-600 flex-shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-800 truncate">
                      {file.name}
                    </p>
                    <p className="text-xs text-gray-500">
                      {file.uploadTime.toLocaleDateString()}
                    </p>
                  </div>
                  <button
                    onClick={() => handleRemoveFile(file.name)}
                    className="p-1 text-gray-400 hover:text-red-600"
                    title="Delete file"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Chat area */}
      <div className="flex-1 flex flex-col min-h-0">
        <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {!sidebarOpen && (
              <button
                onClick={() => setSidebarOpen(true)}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <Menu size={20} />
              </button>
            )}
            <h2 className="text-lg font-semibold text-gray-800">
              {mode === "chat" ? "Chat Mode" : "Summary Mode"}
            </h2>
            
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">
              {uploadedFiles.length} documents
            </span>
            {!isAuthenticated && (
              <span className="text-xs text-orange-600 bg-orange-100 px-2 py-1 rounded">
                Sign in required
              </span>
            )}
          </div>
        </div>

        <div
          className="flex-1 overflow-y-auto p-4 flex flex-col"
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          {dragActive && isAuthenticated && (
            <div className="fixed inset-0 bg-purple-500 bg-opacity-20 border-2 border-dashed border-purple-400 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg p-8 text-center">
                <Upload size={48} className="text-purple-600 mx-auto mb-4" />
                <p className="text-lg font-semibold text-gray-800">
                  Drop your PDF here
                </p>
              </div>
            </div>
          )}



          <ChatMessages 
            messages={messages} 
            isLoading={isLoading} 
            messagesEndRef={messagesEndRef} 
          />
        </div>

        {/* Input */}
        <div className="bg-white border-t border-gray-200 p-4">
          <div className="flex items-end gap-3 max-w-4xl mx-auto">
            <input
              type="file"
              ref={fileInputRef}
              onChange={(e) => handleFileUpload(e.target.files, handleFileUploadSuccess)}
              accept=".pdf"
              className="hidden"
            />
            <button
              onClick={handleFileUploadClick}
              disabled={isUploading}
              className="flex-shrink-0 p-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 transition-colors disabled:opacity-50"
              title={!isAuthenticated ? "Sign in to upload files" : "Upload PDF"}
            >
              {isUploading ? (
                <Loader size={20} className="animate-spin" />
              ) : (
                <Upload size={20} />
              )}
            </button>
            <div className="flex-1 relative">
              <textarea
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                placeholder={
                  !isAuthenticated
                    ? "Sign in to start chatting..."
                    : mode === "chat"
                    ? "Ask a question about your documents..."
                    : "Upload documents to get summaries..."
                }
                disabled={!isAuthenticated}
                className="w-full p-3 pr-12 border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                rows={1}
                style={{ minHeight: "48px", maxHeight: "120px" }}
              />
              <button
                onClick={handleSendMessage}
                disabled={!inputValue.trim() || isLoading || !isAuthenticated}
                className="absolute right-2 bottom-2 p-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send size={16} />
              </button>
            </div>
          </div>
          <p className="text-xs text-gray-500 text-center mt-2">
            {!isAuthenticated 
              ? "Sign in to upload files and start chatting" 
              : "Upload PDFs to get started • Press Enter to send • Shift+Enter for new line"
            }
          </p>
        </div>
      </div>

      {/* Modals */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        initialMode={authModalMode}
      />

      {isAuthenticated && (
        <>
          <SettingsPanel
            isOpen={showSettingsPanel}
            onClose={() => setShowSettingsPanel(false)}
          />
          <ChatHistory
            isOpen={showHistoryPanel}
            onClose={() => setShowHistoryPanel(false)}
            onSelectMessage={handleHistoryMessageSelect}
          />
        </>
      )}
    </div>
  );
};

export default ChatbotInterface;