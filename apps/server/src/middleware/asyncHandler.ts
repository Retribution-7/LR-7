import { Request, RequestHandler, Response } from 'express';

/** Передаёт ошибки async-обработчиков в errorHandler (Express 4 сам этого не делает) */
export const ah =
  (fn: (req: Request, res: Response) => Promise<unknown>): RequestHandler =>
  (req, res, next) => {
    fn(req, res).catch(next);
  };
