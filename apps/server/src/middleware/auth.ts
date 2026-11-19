import { RequestHandler } from 'express';
import { basePrisma } from '../db';
import { HttpError } from '../errors';
import { Role, verifyToken } from '../utils/jwt';

export type { Role };

export interface AuthUser {
  id: number;
  username: string;
  role: Role;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export const authenticate: RequestHandler = async (req, _res, next) => {
  try {
    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) {
      throw new HttpError(401, 'Требуется авторизация: передайте Bearer-токен');
    }
    const payload = verifyToken(header.slice(7));
    const user = await basePrisma.user.findUnique({
      where: { id: Number(payload.sub) },
      include: { role: true },
    });
    if (!user) throw new HttpError(401, 'Пользователь не найден');
    req.user = { id: user.id, username: user.username, role: user.role.name as Role };
    next();
  } catch (e) {
    next(e);
  }
};

export const requireRole =
  (...roles: Role[]): RequestHandler =>
  (req, _res, next) => {
    if (!req.user) return next(new HttpError(401, 'Требуется авторизация'));
    if (!roles.includes(req.user.role)) {
      return next(new HttpError(403, `Недостаточно прав: требуется роль ${roles.join(' или ')}`));
    }
    next();
  };
