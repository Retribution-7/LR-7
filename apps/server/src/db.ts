import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { Prisma, PrismaClient } from './generated/prisma/client';
import { ValidationError } from './errors';
import { MAX_HOURS_PER_DAY, modelSchemas } from './validation/schemas';

// Decimal по умолчанию сериализуется в строку — отдаём числом
(Prisma.Decimal.prototype as any).toJSON = function (this: Prisma.Decimal) {
  return this.toNumber();
};

/** «Чистый» клиент без расширений (для служебных запросов внутри валидаторов и сидера) */
export const basePrisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

function validate(model: string, data: unknown, partial: boolean): any {
  const schema = modelSchemas[model];
  if (!schema) return data;
  const result = (partial ? schema.partial() : schema).safeParse(data);
  if (!result.success) throw ValidationError.fromZod(result.error);
  return result.data;
}

/** Кастомный валидатор: суммарно за день у сотрудника не более 24 часов */
async function assertDailyLimit(employeeId: number, workDate: Date, hours: number, excludeId?: number) {
  const agg = await basePrisma.work.aggregate({
    _sum: { hoursWorked: true },
    where: { employeeId, workDate, ...(excludeId ? { id: { not: excludeId } } : {}) },
  });
  const already = Number(agg._sum.hoursWorked ?? 0);
  if (already + hours > MAX_HOURS_PER_DAY) {
    throw new ValidationError([
      {
        path: 'hoursWorked',
        message: `Сотрудник уже отработал ${already} ч. за ${workDate.toISOString().slice(0, 10)}; суммарно за день не более ${MAX_HOURS_PER_DAY} ч.`,
      },
    ]);
  }
}

/**
 * Клиент с валидацией на уровне моделей: любая запись (create/update)
 * проходит через Zod-схему модели, а для Work — ещё и через проверку суточного лимита часов.
 */
export const prisma = basePrisma.$extends({
  name: 'model-validation',
  query: {
    $allModels: {
      async create({ model, args, query }) {
        const data = validate(model, args.data, false);
        if (model === 'Work') {
          await assertDailyLimit(data.employeeId, data.workDate, data.hoursWorked);
        }
        return query({ ...args, data } as typeof args);
      },
      async update({ model, args, query }) {
        const data = validate(model, args.data, true);
        if (model === 'Work') {
          const current = await basePrisma.work.findUnique({
            where: args.where as Prisma.WorkWhereUniqueInput,
          });
          if (current) {
            await assertDailyLimit(
              data.employeeId ?? current.employeeId,
              data.workDate ?? current.workDate,
              data.hoursWorked ?? Number(current.hoursWorked),
              current.id,
            );
          }
        }
        return query({ ...args, data } as typeof args);
      },
    },
  },
});
