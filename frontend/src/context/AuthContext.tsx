import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authApi } from '../api/client';

type UserRole = 'PARENT' | 'CHILD';

interface User {
  id: string;
  name: string;
  email?: string;
  role: UserRole;
  avatarUrl?: string;
  avatarPreset?: string;
  pointsBalance?: number;
  family?: {
    id: string;
    name: string;
    inviteCode: string;
  };
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isParent: boolean;
  isChild: boolean;
  login: (email: string, password: string) => Promise<void>;
  childLogin: (familyCode: string, pin: string) => Promise<void>;
  register: (email: string, password: string, name: string, familyName: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    try {
      const response = await authApi.getMe();
      if (response.data.success && response.data.data) {
        setUser(response.data.data as User);
      }
    } catch (error) {
      setUser(null);
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
    }
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      refreshUser().finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }
  }, [refreshUser]);

  const login = async (email: string, password: string) => {
    const response = await authApi.login({ email, password });
    if (response.data.success && response.data.data) {
      const { tokens, user: userData } = response.data.data as any;
      localStorage.setItem('accessToken', tokens.accessToken);
      localStorage.setItem('refreshToken', tokens.refreshToken);
      await refreshUser();
    } else {
      throw new Error(response.data.error?.message || 'Login failed');
    }
  };

  const childLogin = async (familyCode: string, pin: string) => {
    const response = await authApi.childLogin({ familyCode, pin });
    if (response.data.success && response.data.data) {
      const { tokens, user: userData } = response.data.data as any;
      localStorage.setItem('accessToken', tokens.accessToken);
      localStorage.setItem('refreshToken', tokens.refreshToken);
      await refreshUser();
    } else {
      throw new Error(response.data.error?.message || 'Login failed');
    }
  };

  const register = async (
    email: string,
    password: string,
    name: string,
    familyName: string
  ) => {
    const response = await authApi.register({ email, password, name, familyName });
    if (response.data.success && response.data.data) {
      const { tokens } = response.data.data as any;
      localStorage.setItem('accessToken', tokens.accessToken);
      localStorage.setItem('refreshToken', tokens.refreshToken);
      await refreshUser();
    } else {
      throw new Error(response.data.error?.message || 'Registration failed');
    }
  };

  const logout = () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    setUser(null);
  };

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated: !!user,
    isParent: user?.role === 'PARENT',
    isChild: user?.role === 'CHILD',
    login,
    childLogin,
    register,
    logout,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
