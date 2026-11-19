import fs from 'fs';
import fsp from 'fs/promises';
import multer from 'multer';
import path from 'path';
import crypto from 'crypto';
import { config } from '../config';
import { HttpError } from '../errors';

fs.mkdirSync(config.uploadDir, { recursive: true });

const ALLOWED: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
};

export const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, config.uploadDir),
    filename: (_req, file, cb) =>
      cb(null, `${Date.now()}-${crypto.randomBytes(6).toString('hex')}${ALLOWED[file.mimetype] ?? ''}`),
  }),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED[file.mimetype]) cb(null, true);
    else cb(new HttpError(400, 'Допустимы только изображения JPEG, PNG или WebP'));
  },
});

export const publicPath = (filename: string) => `/uploads/${filename}`;

export async function removeUploaded(photo?: string | null) {
  if (!photo || !photo.startsWith('/uploads/')) return;
  try {
    await fsp.unlink(path.join(config.uploadDir, path.basename(photo)));
  } catch {
  }
}
