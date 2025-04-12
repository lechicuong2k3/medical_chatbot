const API_BASE_URL = 'http://100.114.35.49:8080';

interface RegisterData {
  username: string;
  full_name: string;
  email: string;
  password: string;
  is_active?: boolean;
  is_admin?: boolean;
}

interface LoginResponse {
  access_token: string;
  token_type: string;
  expires_in: string;
}

interface RegisterResponse {
  email: string;
  username: string;
  full_name: string;
  is_active: boolean;
}

const handleApiError = async (response: Response) => {
  if (!response.ok) {
    try {
      const errorData = await response.json();
      throw new Error(errorData.detail || errorData.message || 'Operation failed');
    } catch (e) {
      if (response.status === 0 || !response.status) {
        throw new Error('Network error. Please check your connection.');
      } else if (response.status === 422) {
        throw new Error('Invalid input. Please check your data.');
      } else if (response.status === 409) {
        throw new Error('Username or email already exists.');
      } else {
        throw new Error(`Request failed with status ${response.status}`);
      }
    }
  }
  return response;
};

export const authService = {
  async register(data: RegisterData): Promise<RegisterResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          ...data,
          is_active: true,
          is_admin: false,
        }),
      });

      await handleApiError(response);
      return response.json();
    } catch (error) {
      if (error instanceof TypeError && error.message === 'Failed to fetch') {
        throw new Error('Unable to connect to the server. Please check your connection.');
      }
      throw error;
    }
  },

  async login(username: string, password: string): Promise<LoginResponse> {
    try {
      const formData = new URLSearchParams();
      formData.append('grant_type', 'password');
      formData.append('username', username);
      formData.append('password', password);

      const response = await fetch(`${API_BASE_URL}/api/v1/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json',
        },
        body: formData,
      });

      await handleApiError(response);
      const data = await response.json();
      
      // Store the token in localStorage
      localStorage.setItem('auth_token', data.access_token);
      localStorage.setItem('token_expiry', new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString());
      return data;
    } catch (error) {
      if (error instanceof TypeError && error.message === 'Failed to fetch') {
        throw new Error('Unable to connect to the server. Please check your connection.');
      }
      throw error;
    }
  },

  async refreshToken(): Promise<LoginResponse> {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${API_BASE_URL}/api/v1/auth/refresh`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
        },
      });

      await handleApiError(response);
      const data = await response.json();
      localStorage.setItem('auth_token', data.access_token);
      localStorage.setItem('token_expiry', new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString());
      return data;
    } catch (error) {
      if (error instanceof TypeError && error.message === 'Failed to fetch') {
        throw new Error('Unable to connect to the server. Please check your connection.');
      }
      throw error;
    }
  },

  logout() {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('token_expiry');
  }
}; 