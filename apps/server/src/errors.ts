import { ZodError } from 'zod';

/** Ошибка с HTTP-статусом, которую errorHandler превращает в JSON-ответ */
export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
    public details?: unknown,
  ) {
    super(message);
    this.name = 'HttpError';
  }
}

export interface FieldIssue {
  path: string;
  message: string;
}

/** Ошибка валидации данных на уровне модели (бросается из расширения Prisma) */
export class ValidationError extends Error {
  issues: FieldIssue[];

  constructor(issues: FieldIssue[]) {
    super('Ошибка валидации данных');
    this.name = 'ValidationError';
    this.issues = issues;
  }

  static fromZod(error: ZodError) {
    return new ValidationError(
      error.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
    );
  }
}
