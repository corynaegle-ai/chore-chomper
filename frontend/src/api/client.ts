import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';

const API_URL = import.meta.env.VITE_API_URL || '/api';

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor to handle token refresh
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    // If 401 and not already retrying, try to refresh token
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem('refreshToken');
        if (!refreshToken) {
          throw new Error('No refresh token');
        }

        const response = await axios.post(`${API_URL}/auth/refresh`, {
          refreshToken,
        });

        const { accessToken, refreshToken: newRefreshToken } = response.data.data;
        localStorage.setItem('accessToken', accessToken);
        localStorage.setItem('refreshToken', newRefreshToken);

        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        // Refresh failed, clear tokens and redirect to login
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

// API response types
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
}

// Auth API
export const authApi = {
  register: (data: {
    email: string;
    password: string;
    name: string;
    familyName: string;
  }) => api.post<ApiResponse>('/auth/register', data),

  login: (data: { email: string; password: string }) =>
    api.post<ApiResponse>('/auth/login', data),

  childLogin: (data: { familyCode: string; pin: string }) =>
    api.post<ApiResponse>('/auth/child-login', data),

  joinFamily: (data: {
    email: string;
    password: string;
    name: string;
    inviteCode: string;
  }) => api.post<ApiResponse>('/auth/join', data),

  getMe: () => api.get<ApiResponse>('/auth/me'),

  logout: () => api.post<ApiResponse>('/auth/logout'),
};

// User API
export const userApi = {
  getAll: () => api.get<ApiResponse>('/users'),
  getChildren: () => api.get<ApiResponse>('/users/children'),
  getById: (id: string) => api.get<ApiResponse>(`/users/${id}`),
  createChild: (data: {
    name: string;
    pin: string;
    phoneNumber?: string;
    avatarPreset?: string;
  }) => api.post<ApiResponse>('/users/child', data),
  update: (id: string, data: {
    name?: string;
    phoneNumber?: string;
    avatarUrl?: string;
    avatarPreset?: string;
  }) => api.put<ApiResponse>(`/users/${id}`, data),
  resetPin: (id: string, pin: string) =>
    api.post<ApiResponse>(`/users/${id}/reset-pin`, { pin }),
  deactivate: (id: string) => api.delete<ApiResponse>(`/users/${id}`),
};

// Family API
export const familyApi = {
  get: () => api.get<ApiResponse>('/family'),
  update: (name: string) => api.put<ApiResponse>('/family', { name }),
  regenerateCode: () => api.post<ApiResponse>('/family/regenerate-code'),
  getStats: () => api.get<ApiResponse>('/family/stats'),
};
