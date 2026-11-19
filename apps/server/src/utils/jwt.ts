import jwt from 'jsonwebtoken';
import { config } from '../config';
import { HttpError } from '../errors';

export type Role = 'admin' | 'user';

export interface JwtPayload {
  sub: string;
  username: string;
  role: Role;
}

export function signToken(user: { id: number; username: string; role: Role }): string {
  const payload: JwtPayload = { sub: String(user.id), username: user.username, role: user.role };
  return jwt.sign(payload, config.jwtSecret, { expiresIn: config.jwtExpiresIn as jwt.SignOptions['expiresIn'] });
}

export function verifyToken(token: string): JwtPayload {
  try {
    return jwt.verify(token, config.jwtSecret) as JwtPayload;
  } catch {
    throw new HttpError(401, 'Недействительный или истёкший токен');
  }
}
