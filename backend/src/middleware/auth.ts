import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { errorResponse } from '../utils/helpers.js';
import type { JwtPayload } from '../types/index.js';
import { UserRole } from '@prisma/client';

/**
 * Verify JWT token and attach user to request
 */
export function authenticate(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json(errorResponse('UNAUTHORIZED', 'No token provided'));
    return;
  }

  const token = authHeader.substring(7);

  try {
    const payload = jwt.verify(token, env.JWT_SECRET) as JwtPayload;
    req.user = payload;
    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      res.status(401).json(errorResponse('TOKEN_EXPIRED', 'Token has expired'));
      return;
    }
    res.status(401).json(errorResponse('INVALID_TOKEN', 'Invalid token'));
  }
}

/**
 * Require parent role
 */
export function requireParent(req: Request, res: Response, next: NextFunction): void {
  if (!req.user) {
    res.status(401).json(errorResponse('UNAUTHORIZED', 'Authentication required'));
    return;
  }

  if (req.user.role !== UserRole.PARENT) {
    res.status(403).json(errorResponse('FORBIDDEN', 'Parent access required'));
    return;
  }

  next();
}

/**
 * Require child role
 */
export function requireChild(req: Request, res: Response, next: NextFunction): void {
  if (!req.user) {
    res.status(401).json(errorResponse('UNAUTHORIZED', 'Authentication required'));
    return;
  }

  if (req.user.role !== UserRole.CHILD) {
    res.status(403).json(errorResponse('FORBIDDEN', 'Child access required'));
    return;
  }

  next();
}

/**
 * Allow both parent and child
 */
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  if (!req.user) {
    res.status(401).json(errorResponse('UNAUTHORIZED', 'Authentication required'));
    return;
  }

  next();
}
