import 'dotenv/config';
import path from 'path';

const jwtSecret = process.env.JWT_SECRET;
if (!jwtSecret) throw new Error('JWT_SECRET не задан (добавьте его в apps/server/.env — см. .env.example)');

export const config = {
  port: Number(process.env.PORT ?? 4000),
  clientOrigin: process.env.CLIENT_ORIGIN ?? 'http://localhost:5173',
  uploadDir: path.resolve(process.env.UPLOAD_DIR ?? 'uploads'),
  jwtSecret,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? '12h',
  refreshTtlMs: Number(process.env.REFRESH_TTL_DAYS ?? 7) * 24 * 60 * 60 * 1000,
};
