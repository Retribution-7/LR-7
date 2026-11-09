import 'dotenv/config';
import path from 'path';

export const config = {
  port: Number(process.env.PORT ?? 4000),
  clientOrigin: process.env.CLIENT_ORIGIN ?? 'http://localhost:5173',
  uploadDir: path.resolve(process.env.UPLOAD_DIR ?? 'uploads'),
};
