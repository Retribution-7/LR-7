import { ErrorRequestHandler, RequestHandler } from 'express';
import multer from 'multer';
import { Prisma } from '../generated/prisma/client';
import { HttpError, ValidationError } from '../errors';

export const notFoundHandler: RequestHandler = (req, res) => {
  res.status(404).json({ error: 'NotFound', message: `Маршрут ${req.method} ${req.originalUrl} не найден` });
};

export const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  if (err instanceof ValidationError) {
    return res.status(400).json({ error: 'ValidationError', message: err.message, details: err.issues });
  }

  if (err instanceof HttpError) {
    return res.status(err.status).json({ error: err.name, message: err.message, details: err.details });
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    switch (err.code) {
      case 'P2002': {
        const target = (err.meta?.target as string[] | string | undefined) ?? [];
        const fields = Array.isArray(target) ? target.join(', ') : String(target);
        return res.status(409).json({
          error: 'UniqueConstraint',
          message: `Запись с таким значением уже существует (поле: ${fields})`,
          details: [{ path: fields, message: 'Значение должно быть уникальным' }],
        });
      }
      case 'P2003':
        return res.status(req.method === 'DELETE' ? 409 : 400).json({
          error: 'ForeignKeyConstraint',
          message:
            req.method === 'DELETE'
              ? 'Невозможно удалить запись: существуют связанные записи'
              : 'Указана несуществующая связанная запись (проверьте внешние ключи)',
        });
      case 'P2025':
        return res.status(404).json({ error: 'NotFound', message: 'Запись не найдена' });
    }
  }

  if (err instanceof multer.MulterError) {
    const message = err.code === 'LIMIT_FILE_SIZE' ? 'Файл слишком большой (максимум 5 МБ)' : `Ошибка загрузки файла: ${err.message}`;
    return res.status(400).json({ error: 'UploadError', message });
  }

  if (err?.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'BadRequest', message: 'Некорректный JSON в теле запроса' });
  }

  console.error(err);
  res.status(500).json({ error: 'InternalServerError', message: 'Внутренняя ошибка сервера' });
};
