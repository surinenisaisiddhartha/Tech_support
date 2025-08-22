// components/auth/LoginForm.tsx
import React, { useState } from 'react';
import { useAuthContext } from '../../contexts/AuthContext';
import { Eye, EyeOff, LogIn, Loader } from 'lucide-react';

interface LoginFormProps {
  onSuccess?: () => void;
  onSwitchToSignup?: () => void;
}

export const LoginForm: React.FC<LoginFormProps> = ({ onSuccess, onSwitchToSignup }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const { login, isLoading, error } = useAuthContext();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password) {
      return;
    }

    try {
      await login({ email, password });
      onSuccess?.();
    } catch (error) {
      console.error('Login failed:', error);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-xl p-6 w-full">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
          Welcome Back
        </h2>
        <p className="text-gray-600 mt-2">Sign in to your chatbot account</p>
      </div>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
            Email Address
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-colors"
            placeholder="Enter your email"
            autoComplete="email"
          />
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
            Password
          </label>
          <div className="relative">
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-colors"
              placeholder="Enter your password"
              autoComplete="current-password"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-lg text-sm">
            <strong>Error:</strong> {error}
          </div>
        )}

        <button
          type="submit"
          disabled={isLoading || !email || !password}
          className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-[1.02] disabled:transform-none"
        >
          {isLoading ? (
            <>
              <Loader size={16} className="animate-spin" />
              Signing in...
            </>
          ) : (
            <>
              <LogIn size={16} />
              Sign In
            </>
          )}
        </button>
      </form>

      <div className="relative my-6">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-300"></div>
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="px-2 bg-white text-gray-500">Don't have an account?</span>
        </div>
      </div>

      <button
        onClick={onSwitchToSignup}
        className="w-full py-2 px-4 text-purple-600 border border-purple-600 rounded-lg hover:bg-purple-50 transition-colors"
      >
        Create Account
      </button>
    </div>
  );
};