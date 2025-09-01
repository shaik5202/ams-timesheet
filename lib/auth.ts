import jwt from 'jsonwebtoken';
import { JWTPayload } from './types';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

export function generateToken(payload: Omit<JWTPayload, 'iat' | 'exp'>): string {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: '7d',
  });
}

export function verifyToken(token: string): JWTPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JWTPayload;
  } catch {
    return null;
  }
}

export function setAuthCookie(res: Response, token: string): void {
  res.headers.set('Set-Cookie', `auth-token=${token}; HttpOnly; Path=/; Max-Age=${7 * 24 * 60 * 60}; SameSite=Strict; Secure=${process.env.NODE_ENV === 'production'}`);
}

export function clearAuthCookie(res: Response): void {
  res.headers.set('Set-Cookie', 'auth-token=; HttpOnly; Path=/; Max-Age=0; SameSite=Strict');
}


