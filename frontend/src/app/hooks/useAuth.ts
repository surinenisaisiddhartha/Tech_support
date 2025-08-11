// frontend/src/app/hooks/useAuth.ts
'use client';

import { useState } from 'react';
import { useAuthContext } from '../contexts/AuthContext';
import { LoginRequest, SignupRequest } from '../types';

export function useAuth() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const authContext = useAuthContext();

  const handleLogin = async (credentials: LoginRequest) => {
    setIsSubmitting(true);
    try {
      await authContext.login(credentials);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSignup = async (userData: SignupRequest) => {
    setIsSubmitting(true);
    try {
      await authContext.signup(userData);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLogout = () => {
    authContext.logout();
  };

  const handleSetDomainFilter = async (enabled: boolean) => {
    try {
      await authContext.setDomainFilter(enabled);
    } catch (error) {
      // Error is handled in context
      throw error;
    }
  };

  return {
    // Auth state
    user: authContext.user,
    isLoading: authContext.isLoading,
    isAuthenticated: authContext.isAuthenticated,
    error: authContext.error,
    
    // Auth actions
    login: handleLogin,
    signup: handleSignup,
    logout: handleLogout,
    setDomainFilter: handleSetDomainFilter,
    clearError: authContext.clearError,
    
    // Form state
    isSubmitting,
  };
}