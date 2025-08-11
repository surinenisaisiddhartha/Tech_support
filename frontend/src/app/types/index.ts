// frontend/src/app/types/index.ts

export interface User {
    id: string;
    email: string;
    username?: string;
    domain_filter?: boolean;
  }
  
  export interface AuthResponse {
    access_token: string;
    token_type: string;
    user: User;
  }
  
  export interface LoginRequest {
    email: string;
    password: string;
  }
  
  export interface SignupRequest {
    email: string;
    password: string;
    username: string;
  }
  
  export interface ChatRequest {
    query: string;
    filter_mode?: boolean;
  }
  
  export interface ChatResponse {
    answer: string;
    blocked?: boolean;
    is_tech?: boolean;
  }
  
  export interface UploadResponse {
    filename: string;
    summary: string;
  }
  
  export interface Message {
    id: string;
    type: 'user' | 'assistant';
    content: string;
    timestamp: Date;
    metadata?: {
      blocked?: boolean;
      is_tech?: boolean;
      retrieved?: any[];
    };
  }
  
  export interface UploadedFile {
    id: string;
    name: string;
    summary: string;
    uploadTime: Date;
  }
  
  export interface HistoryMessage {
    id: string;
    user_id: string;
    question: string;
    answer: string;
    timestamp: Date;
    metadata?: any;
  }
  
  export interface HistoryResponse {
    messages: HistoryMessage[];
  }
  
  export interface ApiError {
    error: string;
    detail?: string;
  }