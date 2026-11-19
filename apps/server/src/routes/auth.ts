import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { Router } from 'express';
import { config } from '../config';
import { basePrisma, prisma } from '../db';
import { HttpError, ValidationError } from '../errors';
import { ah } from '../middleware/asyncHandler';
import { authenticate } from '../middleware/auth';
import {
  changePasswordSchema,
  forgotPasswordSchema,
  loginSchema,
  refreshTokenSchema,
  registerSchema,
  resetPasswordSchema,
} from '../validation/schemas';
import { signToken } from '../utils/jwt';
import { issueRefreshToken, revokeRefreshToken, revokeUserTokens, rotateRefreshToken } from '../utils/refresh';
import { toPublicUser } from '../utils/users';

const RESET_TTL_MS = 15 * 60 * 1000;

const sha256 = (s: string) => crypto.createHash('sha256').update(s).digest('hex');

const authPayload = async (user: { id: number; username: string; role: string | { name: string } }) => ({
  token: signToken({
    id: user.id,
    username: user.username,
    role: (typeof user.role === 'string' ? user.role : user.role.name) as 'admin' | 'user',
  }),
  refreshToken: await issueRefreshToken(user.id),
});

export const authRouter = Router();

authRouter.post(
  '/register',
  ah(async (req, res) => {
    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success) throw ValidationError.fromZod(parsed.error);
    const { username, password } = parsed.data;

    const existing = await basePrisma.user.findUnique({ where: { username } });
    if (existing) {
      throw new HttpError(409, 'Пользователь с таким логином уже существует', [
        { path: 'username', message: 'Логин уже занят' },
      ]);
    }

    const user = await prisma.user.create({
      data: {
        username,
        passwordHash: await bcrypt.hash(password, 10),
        role: { connect: { name: 'user' } },
      },
      include: { role: true },
    });

    res.status(201).json({
      ...(await authPayload(user)),
      user: toPublicUser(user),
    });
  }),
);

authRouter.post(
  '/login',
  ah(async (req, res) => {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) throw ValidationError.fromZod(parsed.error);
    const { username, password } = parsed.data;

    const user = await basePrisma.user.findUnique({ where: { username }, include: { role: true } });
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      throw new HttpError(401, 'Неверный логин или пароль');
    }

    res.json({
      ...(await authPayload(user)),
      user: toPublicUser(user),
    });
  }),
);

authRouter.post(
  '/refresh',
  ah(async (req, res) => {
    const parsed = refreshTokenSchema.safeParse(req.body);
    if (!parsed.success) throw ValidationError.fromZod(parsed.error);
    const { refreshToken, user } = await rotateRefreshToken(parsed.data.refreshToken);
    res.json({
      token: signToken({ id: user.id, username: user.username, role: user.role.name as 'admin' | 'user' }),
      refreshToken,
    });
  }),
);

authRouter.post(
  '/logout',
  ah(async (req, res) => {
    const parsed = refreshTokenSchema.safeParse(req.body);
    if (!parsed.success) throw ValidationError.fromZod(parsed.error);
    await revokeRefreshToken(parsed.data.refreshToken);
    res.json({ message: 'Сессия завершена' });
  }),
);

authRouter.get('/me', authenticate, ah(async (req, res) => {
  res.json(req.user);
}));

authRouter.post(
  '/change-password',
  authenticate,
  ah(async (req, res) => {
    const parsed = changePasswordSchema.safeParse(req.body);
    if (!parsed.success) throw ValidationError.fromZod(parsed.error);
    const { oldPassword, newPassword } = parsed.data;

    const user = await basePrisma.user.findUnique({ where: { id: req.user!.id } });
    if (!user || !(await bcrypt.compare(oldPassword, user.passwordHash))) {
      throw new ValidationError([{ path: 'oldPassword', message: 'Неверный текущий пароль' }]);
    }

    await basePrisma.user.update({
      where: { id: user.id },
      data: { passwordHash: await bcrypt.hash(newPassword, 10) },
    });
    await revokeUserTokens(user.id);
    res.json({ message: 'Пароль изменён', ...(await authPayload(req.user!)) });
  }),
);

authRouter.post(
  '/forgot-password',
  ah(async (req, res) => {
    const parsed = forgotPasswordSchema.safeParse(req.body);
    if (!parsed.success) throw ValidationError.fromZod(parsed.error);
    const { username } = parsed.data;

    const user = await basePrisma.user.findUnique({ where: { username } });
    if (user) {
      const token = crypto.randomBytes(32).toString('hex');
      await basePrisma.user.update({
        where: { id: user.id },
        data: {
          resetTokenHash: sha256(token),
          resetTokenExpiresAt: new Date(Date.now() + RESET_TTL_MS),
        },
      });
      console.log(`[reset] ${config.clientOrigin}/reset-password?token=${token}`);
    } else {
      console.log(`[reset] пользователь «${username}» не найден — ссылка не выдана`);
    }
    res.json({ message: 'Если указанный логин зарегистрирован, ссылка для восстановления отправлена' });
  }),
);

authRouter.post(
  '/reset-password',
  ah(async (req, res) => {
    const parsed = resetPasswordSchema.safeParse(req.body);
    if (!parsed.success) throw ValidationError.fromZod(parsed.error);
    const { token, newPassword } = parsed.data;

    const user = await basePrisma.user.findFirst({
      where: { resetTokenHash: sha256(token), resetTokenExpiresAt: { gt: new Date() } },
    });
    if (!user) {
      throw new HttpError(400, 'Ссылка для восстановления недействительна или истекла', [
        { path: 'token', message: 'Ссылка недействительна или истекла' },
      ]);
    }

    await basePrisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash: await bcrypt.hash(newPassword, 10),
        resetTokenHash: null,
        resetTokenExpiresAt: null,
      },
    });
    await revokeUserTokens(user.id);
    res.json({ message: 'Пароль восстановлен' });
  }),
);
