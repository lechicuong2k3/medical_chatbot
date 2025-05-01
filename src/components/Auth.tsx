import React, { useState } from 'react';
import './Auth.css';
import { authService } from '../services/auth';

interface AuthProps {
  onAuthSuccess: () => void;
}

const Auth: React.FC<AuthProps> = ({ onAuthSuccess }) => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    email: '',
    full_name: '',
  });
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const validateForm = () => {
    if (!formData.username.trim()) {
      throw new Error('Username is required');
    }
    if (!formData.password.trim()) {
      throw new Error('Password is required');
    }
    if (isSignUp) {
      if (!formData.email.trim()) {
        throw new Error('Email is required');
      }
      if (!formData.full_name.trim()) {
        throw new Error('Full name is required');
      }
      if (formData.password.length < 8) {
        throw new Error('Password must be at least 8 characters long');
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
        throw new Error('Please enter a valid email address');
      }
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear error when user starts typing
    if (error) {
      setError(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      // Validate form before submission
      validateForm();

      if (isSignUp) {
        // Handle Registration
        await authService.register({
          username: formData.username,
          password: formData.password,
          email: formData.email,
          full_name: formData.full_name,
        });
        // After successful registration, automatically log in
        await handleLogin();
      } else {
        // Handle Login
        await handleLogin();
      }
    } catch (err) {
      console.error('Auth error:', err);
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = async () => {
    try {
      await authService.login(formData.username, formData.password);
      onAuthSuccess();
    } catch (err) {
      console.error('Login error:', err);
      throw new Error(err instanceof Error ? err.message : 'Login failed. Please check your credentials.');
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-content">
        <h1 className="auth-title">
          Welcome back, Doctor
        </h1>
        <h2 className="auth-subtitle">
          Please sign in to continue
        </h2>
        
        {error && <div className="auth-error">{error}</div>}
        
        <form onSubmit={handleSubmit} className="auth-form">
          <div className="input-group">
            <label htmlFor="username">Username</label>
            <input
              type="text"
              id="username"
              name="username"
              placeholder="Username"
              value={formData.username}
              onChange={handleChange}
              required
              disabled={isLoading}
            />
          </div>
          
          {isSignUp && (
            <>
              <div className="input-group">
                <label htmlFor="email">Email</label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  placeholder="Email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  disabled={isLoading}
                />
              </div>
              
              <div className="input-group">
                <label htmlFor="full_name">Full Name</label>
                <input
                  type="text"
                  id="full_name"
                  name="full_name"
                  placeholder="Full Name"
                  value={formData.full_name}
                  onChange={handleChange}
                  required
                  disabled={isLoading}
                />
              </div>
            </>
          )}
          
          <div className="input-group">
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              name="password"
              placeholder="Password"
              value={formData.password}
              onChange={handleChange}
              required
              disabled={isLoading}
              minLength={8}
            />
          </div>

          <button 
            type="submit" 
            className={`auth-button ${isLoading ? 'loading' : ''}`}
            disabled={isLoading}
          >
            {isLoading ? 'Please wait...' : (isSignUp ? 'SIGN UP' : 'SIGN IN')}
          </button>
        </form>

        <div className="auth-footer">
          <p>
            {isSignUp ? 'Already have an account?' : 'Don\'t have an account?'}
            <button
              type="button"
              className="toggle-auth-button"
              onClick={() => {
                setIsSignUp(!isSignUp);
                setError(null);
                setFormData({
                  username: '',
                  password: '',
                  email: '',
                  full_name: '',
                });
              }}
              disabled={isLoading}
            >
              {isSignUp ? 'Sign In' : 'Sign Up'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Auth; 