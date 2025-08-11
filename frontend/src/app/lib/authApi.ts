// frontend/src/app/lib/authApi.ts
'use client';

import { apiClient } from './apiClient';
import { API_CONFIG } from './config';
import { AuthResponse, LoginRequest, SignupRequest, User } from '../types';

export const authApi = {
  async login(credentials: LoginRequest): Promise<AuthResponse> {
    const response = await apiClient.post<AuthResponse>(
      API_CONFIG.ENDPOINTS.AUTH.LOGIN,
      credentials
    );
    
    // Store token in localStorage
    if (response.access_token) {
      localStorage.setItem('access_token', response.access_token);
      localStorage.setItem('user', JSON.stringify(response.user));
    }
    
    return response;
  },

  async signup(userData: SignupRequest): Promise<AuthResponse> {
    const response = await apiClient.post<AuthResponse>(
      API_CONFIG.ENDPOINTS.AUTH.SIGNUP,
      userData
    );
    
    // Store token in localStorage
    if (response.access_token) {
      localStorage.setItem('access_token', response.access_token);
      localStorage.setItem('user', JSON.stringify(response.user));
    }
    
    return response;
  },

  async setDomainFilter(enabled: boolean): Promise<{ ok: boolean; domain_filter: boolean }> {
    return apiClient.post(`${API_CONFIG.ENDPOINTS.AUTH.SET_FILTER}?flag=${enabled}`);
  },

  logout(): void {
    localStorage.removeItem('access_token');
    localStorage.removeItem('user');
  },

  getCurrentUser(): User | null {
    if (typeof window === 'undefined') return null;
    
    const userStr = localStorage.getItem('user');
    if (!userStr) return null;
    
    try {
      return JSON.parse(userStr);
    } catch {
      return null;
    }
  },

  getToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('access_token');
  },

  isAuthenticated(): boolean {
    return !!this.getToken();
  }
};