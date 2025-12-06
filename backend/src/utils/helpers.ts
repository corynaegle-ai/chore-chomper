import { nanoid } from 'nanoid';
import type { ApiResponse, ApiError, PaginationMeta } from '../types/index.js';

/**
 * Generate a family invite code (6 characters, uppercase alphanumeric)
 */
export function generateFamilyCode(): string {
  return nanoid(6).toUpperCase();
}

/**
 * Generate a unique ID
 */
export function generateId(): string {
  return nanoid();
}

/**
 * Create a success API response
 */
export function successResponse<T>(data: T, pagination?: PaginationMeta): ApiResponse<T> {
  return {
    success: true,
    data,
    ...(pagination && { pagination }),
  };
}

/**
 * Create an error API response
 */
export function errorResponse(code: string, message: string, details?: unknown): ApiResponse {
  return {
    success: false,
    error: {
      code,
      message,
      ...(details && { details }),
    },
  };
}

/**
 * Calculate pagination metadata
 */
export function calculatePagination(
  page: number,
  limit: number,
  total: number
): PaginationMeta {
  return {
    page,
    limit,
    total,
    pages: Math.ceil(total / limit),
  };
}

/**
 * Parse pagination query params
 */
export function parsePagination(
  pageStr?: string,
  limitStr?: string
): { page: number; limit: number; skip: number } {
  const page = Math.max(1, parseInt(pageStr || '1', 10));
  const limit = Math.min(100, Math.max(1, parseInt(limitStr || '20', 10)));
  const skip = (page - 1) * limit;
  return { page, limit, skip };
}

/**
 * Validate PIN format (4 digits)
 */
export function isValidPin(pin: string): boolean {
  return /^\d{4}$/.test(pin);
}

/**
 * Validate time format (HH:mm)
 */
export function isValidTime(time: string): boolean {
  return /^([01]\d|2[0-3]):([0-5]\d)$/.test(time);
}

/**
 * Format date to YYYY-MM-DD
 */
export function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

/**
 * Get start of day
 */
export function startOfDay(date: Date = new Date()): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Get end of day
 */
export function endOfDay(date: Date = new Date()): Date {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

/**
 * Check if a date is today
 */
export function isToday(date: Date): boolean {
  const today = new Date();
  return (
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear()
  );
}

/**
 * Get day of week name
 */
export function getDayOfWeek(date: Date): string {
  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  return days[date.getDay()];
}
