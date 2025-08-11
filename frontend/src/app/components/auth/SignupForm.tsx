// components/auth/SignupForm.tsx
import React, { useState } from 'react';
import { useAuthContext } from '../../contexts/AuthContext';
import { Eye, EyeOff, UserPlus, Loader, Check, X } from 'lucide-react';

interface SignupFormProps {
  onSuccess?: () => void;
  onSwitchToLogin?: () => void;
}

export const SignupForm: React.FC<SignupFormProps> = ({ onSuccess, onSwitchToLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const { signup, isLoading, error } = useAuthContext();

  const passwordsMatch = password === confirmPassword;
  const passwordValid = password.length >= 6;
  const emailValid = email.includes('@') && email.includes('.');
  const usernameValid = username.length >= 2;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!emailValid || !passwordValid || !passwordsMatch || !usernameValid) {
      return;
    }

    try {
      await signup({ email, password, username });
      onSuccess?.();
    } catch (error) {
      console.error('Signup failed:', error);
    }
  };

  const ValidationIndicator = ({ isValid, text }: { isValid: boolean; text: string }) => (
    <div className="flex items-center gap-1 text-xs">
      {isValid ? (
        <Check size={12} className="text-green-500" />
      ) : (
        <X size={12} className="text-red-400" />
      )}
      <span className={isValid ? 'text-green-600' : 'text-red-500'}>{text}</span>
    </div>
  );

  return (
    <div className="bg-white rounded-lg shadow-xl p-6 w-full">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
          Join Tech Support Bot
        </h2>
        <p className="text-gray-600 mt-2">Create your account to get started</p>
      </div>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1">
            Username
          </label>
          <input
            id="username"
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-colors ${
              username && !usernameValid ? 'border-red-300' : 'border-gray-300'
            }`}
            placeholder="Enter your username"
            autoComplete="username"
          />
          {username && (
            <div className="mt-1">
              <ValidationIndicator isValid={usernameValid} text="At least 2 characters" />
            </div>
          )}
        </div>

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
            className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-colors ${
              email && !emailValid ? 'border-red-300' : 'border-gray-300'
            }`}
            placeholder="Enter your email"
            autoComplete="email"
          />
          {email && (
            <div className="mt-1">
              <ValidationIndicator isValid={emailValid} text="Valid email format" />
            </div>
          )}
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
              className={`w-full px-3 py-2 pr-10 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-colors ${
                password && !passwordValid ? 'border-red-300' : 'border-gray-300'
              }`}
              placeholder="Enter your password"
              autoComplete="new-password"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          {password && (
            <div className="mt-1">
              <ValidationIndicator isValid={passwordValid} text="At least 6 characters" />
            </div>
          )}
        </div>

        <div>
          <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
            Confirm Password
          </label>
          <div className="relative">
            <input
              id="confirmPassword"
              type={showConfirmPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              className={`w-full px-3 py-2 pr-10 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-colors ${
                confirmPassword && !passwordsMatch ? 'border-red-300' : 'border-gray-300'
              }`}
              placeholder="Confirm your password"
              autoComplete="new-password"
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
            >
              {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          {confirmPassword && (
            <div className="mt-1">
              <ValidationIndicator isValid={passwordsMatch} text="Passwords match" />
            </div>
          )}
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-lg text-sm">
            <strong>Error:</strong> {error}
          </div>
        )}

        <button
          type="submit"
          disabled={isLoading || !emailValid || !passwordValid || !passwordsMatch || !usernameValid}
          className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-[1.02] disabled:transform-none"
        >
          {isLoading ? (
            <>
              <Loader size={16} className="animate-spin" />
              Creating account...
            </>
          ) : (
            <>
              <UserPlus size={16} />
              Create Account
            </>
          )}
        </button>
      </form>

      <div className="relative my-6">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-300"></div>
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="px-2 bg-white text-gray-500">Already have an account?</span>
        </div>
      </div>

      <button
        onClick={onSwitchToLogin}
        className="w-full py-2 px-4 text-purple-600 border border-purple-600 rounded-lg hover:bg-purple-50 transition-colors"
      >
        Sign In Instead
      </button>
    </div>
  );
};