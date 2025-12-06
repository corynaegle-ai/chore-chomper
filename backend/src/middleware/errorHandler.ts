import { Request, Response, NextFunction } from 'express';
import { Prisma } from '@prisma/client';
import { ZodError } from 'zod';
import { errorResponse } from '../utils/helpers.js';
import { logger } from '../utils/logger.js';
import { isDev } from '../config/env.js';

export class AppError extends Error {
  public statusCode: number;
  public code: string;
  public details?: unknown;

  constructor(statusCode: number, code: string, message: string, details?: unknown) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }
}

export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json(errorResponse('NOT_FOUND', `Route ${req.method} ${req.path} not found`));
}

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  logger.error(err);

  // Custom AppError
  if (err instanceof AppError) {
    res.status(err.statusCode).json(
      errorResponse(err.code, err.message, err.details)
    );
    return;
  }

  // Zod validation error
  if (err instanceof ZodError) {
    res.status(400).json(
      errorResponse('VALIDATION_ERROR', 'Invalid input', err.flatten().fieldErrors)
    );
    return;
  }

  // Prisma errors
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    switch (err.code) {
      case 'P2002':
        res.status(409).json(
          errorResponse('DUPLICATE_ENTRY', 'A record with this value already exists')
        );
        return;
      case 'P2025':
        res.status(404).json(
          errorResponse('NOT_FOUND', 'Record not found')
        );
        return;
      default:
        res.status(500).json(
          errorResponse('DATABASE_ERROR', 'Database operation failed')
        );
        return;
    }
  }

  // Default server error
  res.status(500).json(
    errorResponse(
      'INTERNAL_ERROR',
      isDev ? err.message : 'An unexpected error occurred'
    )
  );
}
