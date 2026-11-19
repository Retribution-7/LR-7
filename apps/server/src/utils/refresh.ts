import crypto from 'crypto';
import { config } from '../config';
import { basePrisma } from '../db';
import { HttpError } from '../errors';

const sha256 = (s: string) => crypto.createHash('sha256').update(s).digest('hex');

export interface RefreshedSession {
  refreshToken: string;
  user: { id: number; username: string; role: { name: string } };
}

export async function issueRefreshToken(userId: number): Promise<string> {
  const token = crypto.randomBytes(32).toString('hex');
  await basePrisma.refreshToken.create({
    data: { tokenHash: sha256(token), userId, expiresAt: new Date(Date.now() + config.refreshTtlMs) },
  });
  return token;
}

export async function rotateRefreshToken(token: string): Promise<RefreshedSession> {
  const stored = await basePrisma.refreshToken.findUnique({
    where: { tokenHash: sha256(token) },
    include: { user: { include: { role: true } } },
  });
  if (!stored || stored.expiresAt <= new Date()) {
    if (stored) await basePrisma.refreshToken.delete({ where: { id: stored.id } });
    throw new HttpError(401, 'Сессия недействительна или истекла — войдите заново');
  }
  await basePrisma.refreshToken.delete({ where: { id: stored.id } });
  return {
    refreshToken: await issueRefreshToken(stored.userId),
    user: { id: stored.user.id, username: stored.user.username, role: { name: stored.user.role.name } },
  };
}

export async function revokeRefreshToken(token: string): Promise<void> {
  await basePrisma.refreshToken.deleteMany({ where: { tokenHash: sha256(token) } });
}

export async function revokeUserTokens(userId: number): Promise<void> {
  await basePrisma.refreshToken.deleteMany({ where: { userId } });
}
