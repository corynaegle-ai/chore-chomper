import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";

const API_URL = "/api";

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem("accessToken");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        const refreshToken = localStorage.getItem("refreshToken");
        if (!refreshToken) throw new Error("No refresh token");

        const response = await axios.post(`${API_URL}/auth/refresh`, { refreshToken });
        const { accessToken, refreshToken: newRefreshToken } = response.data.data;
        localStorage.setItem("accessToken", accessToken);
        localStorage.setItem("refreshToken", newRefreshToken);
        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        localStorage.removeItem("accessToken");
        localStorage.removeItem("refreshToken");
        window.location.href = "/login";
        return Promise.reject(refreshError);
      }
    }
    return Promise.reject(error);
  }
);

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: { code: string; message: string; details?: unknown };
}

// Types
export interface User {
  id: string;
  name: string;
  email?: string;
  role: 'PARENT' | 'CHILD';
  pointsBalance: number;
  avatarPreset?: string;
  avatarUrl?: string;
  phoneNumber?: string;
  isActive: boolean;
  family?: Family;
}

export interface Family {
  id: string;
  name: string;
  inviteCode: string;
}

export interface Category {
  id: string;
  familyId: string;
  name: string;
  color: string;
  icon: string;
  createdAt: string;
  _count?: {
    chores: number;
    choreTemplates: number;
  };
}


export interface Chore {
  id: string;
  name: string;
  description?: string;
  pointValue: number;
  status: 'PENDING' | 'COMPLETED' | 'VERIFIED' | 'REJECTED';
  dueDate?: string;
  completedAt?: string;
  verifiedAt?: string;
  photoUrl?: string;
  completionNotes?: string;
  verificationNotes?: string;
  assignedTo: {
    id: string;
    name: string;
    avatarPreset?: string;
    avatarUrl?: string;
  };
  category?: Category;
  verifiedBy?: {
    id: string;
    name: string;
  };
}

export interface FamilyStats {
  parents: number;
  children: number;
  chores: {
    pending: number;
    awaitingVerification: number;
    completed: number;
  };
  pendingRedemptions: number;
}

// Auth API
export const authApi = {
  register: (data: { email: string; password: string; name: string; familyName: string }) =>
    api.post<ApiResponse>("/auth/register", data),
  login: (data: { email: string; password: string }) =>
    api.post<ApiResponse>("/auth/login", data),
  childLogin: (data: { familyCode: string; pin: string }) =>
    api.post<ApiResponse>("/auth/child-login", data),
  joinFamily: (data: { email: string; password: string; name: string; inviteCode: string }) =>
    api.post<ApiResponse>("/auth/join", data),
  getMe: () => api.get<ApiResponse>("/auth/me"),
  logout: () => api.post<ApiResponse>("/auth/logout"),
};

// User API
export const userApi = {
  getAll: () => api.get<ApiResponse<User[]>>("/users"),
  getChildren: () => api.get<ApiResponse<User[]>>("/users/children"),
  getById: (id: string) => api.get<ApiResponse<User>>(`/users/${id}`),
  createChild: (data: { name: string; pin: string; phoneNumber?: string; avatarPreset?: string }) =>
    api.post<ApiResponse<User>>("/users/child", data),
  update: (id: string, data: { name?: string; phoneNumber?: string; avatarUrl?: string; avatarPreset?: string }) =>
    api.put<ApiResponse<User>>(`/users/${id}`, data),
  resetPin: (id: string, pin: string) =>
    api.post<ApiResponse>(`/users/${id}/reset-pin`, { pin }),
  deactivate: (id: string) => api.delete<ApiResponse>(`/users/${id}`),
};

// Family API
export const familyApi = {
  get: () => api.get<ApiResponse<Family>>("/family"),
  update: (name: string) => api.put<ApiResponse<Family>>("/family", { name }),
  regenerateCode: () => api.post<ApiResponse<Family>>("/family/regenerate-code"),
  getStats: () => api.get<ApiResponse<FamilyStats>>("/family/stats"),
};

// Chore API
export const choreApi = {
  getAll: (params?: { status?: string; assignedToId?: string; categoryId?: string }) =>
    api.get<ApiResponse<Chore[]>>("/chores", { params }),
  getById: (id: string) => api.get<ApiResponse<Chore>>(`/chores/${id}`),
  getMy: (status?: string) =>
    api.get<ApiResponse<Chore[]>>("/chores/my", { params: status ? { status } : undefined }),
  getPendingVerification: () => api.get<ApiResponse<Chore[]>>("/chores/pending-verification"),
  create: (data: {
    name: string;
    description?: string;
    categoryId?: string;
    assignedToId: string;
    pointValue?: number;
    dueDate?: string;
  }) => api.post<ApiResponse<Chore>>("/chores", data),
  update: (id: string, data: {
    name?: string;
    description?: string;
    categoryId?: string | null;
    assignedToId?: string;
    pointValue?: number;
    dueDate?: string | null;
  }) => api.put<ApiResponse<Chore>>(`/chores/${id}`, data),
  complete: (id: string, data?: { photoUrl?: string; notes?: string }) =>
    api.post<ApiResponse<Chore>>(`/chores/${id}/complete`, data || {}),
  addPhoto: (id: string, photoUrl: string) =>
    api.post<ApiResponse<Chore>>(`/chores/${id}/add-photo`, { photoUrl }),
  verify: (id: string, data: { approved: boolean; feedback?: string; pointsPenalty?: number }) =>
    api.post<ApiResponse<Chore>>(`/chores/${id}/verify`, data),
  reset: (id: string) => api.post<ApiResponse<Chore>>(`/chores/${id}/reset`),
  delete: (id: string) => api.delete<ApiResponse>(`/chores/${id}`),
  bulkDelete: (ids: string[]) => api.delete<ApiResponse>("/chores/bulk", { data: { ids } }),
};

// Category API
export const categoryApi = {
  getAll: () => api.get<ApiResponse<Category[]>>("/categories"),
  getById: (id: string) => api.get<ApiResponse<Category>>(`/categories/${id}`),
  create: (data: { name: string; color?: string; icon?: string }) =>
    api.post<ApiResponse<Category>>("/categories", data),
  update: (id: string, data: { name?: string; color?: string; icon?: string }) =>
    api.put<ApiResponse<Category>>(`/categories/${id}`, data),
  delete: (id: string) => api.delete<ApiResponse>(`/categories/${id}`),
};

// Reward Types
export interface Reward {
  id: string;
  familyId: string;
  name: string;
  description?: string;
  pointCost: number;
  imageUrl?: string;
  quantityAvailable?: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  _count?: {
    redemptions: number;
  };
}

// Reward API
export const rewardApi = {
  getAll: (includeInactive?: boolean) =>
    api.get<ApiResponse<Reward[]>>("/rewards", { params: includeInactive ? { includeInactive: "true" } : undefined }),
  getById: (id: string) => api.get<ApiResponse<Reward>>(`/rewards/${id}`),
  create: (data: {
    name: string;
    description?: string;
    pointCost: number;
    imageUrl?: string;
    quantityAvailable?: number;
    isActive?: boolean;
  }) => api.post<ApiResponse<Reward>>("/rewards", data),
  update: (id: string, data: {
    name?: string;
    description?: string;
    pointCost?: number;
    imageUrl?: string;
    quantityAvailable?: number;
    isActive?: boolean;
  }) => api.put<ApiResponse<Reward>>(`/rewards/${id}`, data),
  delete: (id: string) => api.delete<ApiResponse>(`/rewards/${id}`),
};


// Redemption Types
export interface Redemption {
  id: string;
  childId: string;
  rewardId: string;
  pointsSpent: number;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'FULFILLED';
  notes?: string;
  requestedAt: string;
  reviewedAt?: string;
  reviewedById?: string;
  fulfilledAt?: string;
  child?: {
    id: string;
    name: string;
    avatarUrl?: string;
  };
  reward?: {
    id: string;
    name: string;
    pointCost: number;
    imageUrl?: string;
  };
  reviewedBy?: {
    id: string;
    name: string;
  };
}

// Redemption API
export const redemptionApi = {
  getAll: (status?: string) =>
    api.get<ApiResponse<Redemption[]>>("/redemptions", { params: status ? { status } : undefined }),
  getPendingCount: () =>
    api.get<ApiResponse<{ count: number }>>("/redemptions/pending"),
  request: (data: { rewardId: string; notes?: string }) =>
    api.post<ApiResponse<Redemption>>("/redemptions", data),
  review: (id: string, data: { status: 'APPROVED' | 'REJECTED'; notes?: string }) =>
    api.put<ApiResponse<Redemption>>(`/redemptions/${id}/review`, data),
  fulfill: (id: string) =>
    api.put<ApiResponse<Redemption>>(`/redemptions/${id}/fulfill`),
};
