import { UserRole } from '@prisma/client';

// JWT Payload
export interface JwtPayload {
  userId: string;
  familyId: string;
  role: UserRole;
  iat?: number;
  exp?: number;
}

// Express Request extension
declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

// API Response types
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: ApiError;
  pagination?: PaginationMeta;
}

export interface ApiError {
  code: string;
  message: string;
  details?: unknown;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

// Auth types
export interface RegisterInput {
  email: string;
  password: string;
  name: string;
  familyName: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface ChildLoginInput {
  familyCode: string;
  pin: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

// User types
export interface CreateChildInput {
  name: string;
  pin: string;
  phoneNumber?: string;
  avatarPreset?: string;
}

export interface UpdateUserInput {
  name?: string;
  phoneNumber?: string;
  avatarUrl?: string;
  avatarPreset?: string;
}

// Chore types
export interface CreateChoreTemplateInput {
  title: string;
  description?: string;
  points?: number;
  categoryId?: string;
  isRecurring?: boolean;
  recurrenceType?: 'DAILY' | 'WEEKLY' | 'MONTHLY';
  recurrenceRule?: {
    days?: string[];
    dayOfMonth?: number;
  };
  defaultAssigneeId?: string;
  requiresPhoto?: boolean;
  reminderTime?: string;
}

export interface CreateChoreInput {
  title: string;
  description?: string;
  points?: number;
  categoryId?: string;
  assignedToId: string;
  dueDate: string;
  dueTime?: string;
  requiresPhoto?: boolean;
}

export interface CompleteChoreInput {
  photoUrl?: string;
}

export interface VerifyChoreInput {
  approved: boolean;
  rejectionReason?: string;
}

// Category types
export interface CreateCategoryInput {
  name: string;
  color?: string;
  icon?: string;
}

// Reward types
export interface CreateRewardInput {
  name: string;
  description?: string;
  pointCost: number;
  imageUrl?: string;
  quantityAvailable?: number;
}

// Redemption types
export interface CreateRedemptionInput {
  rewardId: string;
}

export interface ReviewRedemptionInput {
  approved: boolean;
  notes?: string;
}

// Notification preferences
export interface NotificationPreferences {
  sms: boolean;
  email: boolean;
  push: boolean;
}
