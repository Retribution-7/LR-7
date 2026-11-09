import { z } from 'zod';

/** Полных лет на указанную дату (UTC) */
export function ageOn(birth: Date, ref: Date = new Date()): number {
  let age = ref.getUTCFullYear() - birth.getUTCFullYear();
  const m = ref.getUTCMonth() - birth.getUTCMonth();
  if (m < 0 || (m === 0 && ref.getUTCDate() < birth.getUTCDate())) age--;
  return age;
}

export const MIN_AGE = 18;
export const MAX_HOURS_PER_DAY = 24;

/** Строка ГГГГ-ММ-ДД (допускается полный ISO — берутся первые 10 символов) -> Date (UTC, полночь) */
const dateField = (label: string) =>
  z.preprocess(
    (v) => (typeof v === 'string' ? v.trim().slice(0, 10) : v),
    z
      .string({
        required_error: `${label}: обязательное поле`,
        invalid_type_error: `${label}: ожидается строка ГГГГ-ММ-ДД`,
      })
      .regex(/^\d{4}-\d{2}-\d{2}$/, `${label}: формат даты ГГГГ-ММ-ДД`)
      .refine(
        (s) => new Date(`${s}T00:00:00.000Z`).toISOString().slice(0, 10) === s,
        `${label}: несуществующая дата`,
      )
      .transform((s) => new Date(`${s}T00:00:00.000Z`)),
  );

const intId = (label: string) =>
  z.coerce
    .number({ invalid_type_error: `${label}: ожидается число` })
    .int(`${label}: ожидается целое число`)
    .positive(`${label}: должно быть положительным`);

const PHONE_RE = /^\+?[0-9\s\-()]{7,20}$/;
const phoneField = (label: string) =>
  z
    .string({ required_error: `${label}: обязательное поле` })
    .trim()
    .regex(PHONE_RE, `${label}: допустимы цифры, пробелы, «+», «-», скобки (7–20 символов)`);

const photoField = z.string().max(255).nullable().optional();

// ---------- Категория ----------
export const categorySchema = z.object({
  name: z
    .string({ required_error: 'Название: обязательное поле' })
    .trim()
    .min(2, 'Название: минимум 2 символа')
    .max(50, 'Название: максимум 50 символов'),
  hourlyRate: z.coerce
    .number({ invalid_type_error: 'Ставка: ожидается число' })
    .positive('Ставка: должна быть больше 0')
    .max(1_000_000, 'Ставка: слишком большое значение')
    // кастомный валидатор: не более 2 знаков после запятой
    .refine((v) => Math.abs(v * 100 - Math.round(v * 100)) < 1e-6, 'Ставка: не более 2 знаков после запятой'),
});

// ---------- Сотрудник ----------
export const employeeSchema = z.object({
  fullName: z
    .string({ required_error: 'Ф.И.О.: обязательное поле' })
    .trim()
    .min(5, 'Ф.И.О.: минимум 5 символов')
    .max(150, 'Ф.И.О.: максимум 150 символов')
    .regex(/^[\p{L}][\p{L}\s.'-]*$/u, 'Ф.И.О.: допустимы только буквы, пробелы, точка, дефис'),
  passportNumber: z
    .string({ required_error: 'Номер паспорта: обязательное поле' })
    .trim()
    .toUpperCase()
    .regex(/^[A-Z]{2}\d{7}$/, 'Номер паспорта: 2 латинские буквы и 7 цифр (например, MP1234567)'),
  birthDate: dateField('Дата рождения')
    // кастомные валидаторы
    .refine((d) => d.getTime() <= Date.now(), 'Дата рождения: не может быть в будущем')
    .refine((d) => ageOn(d) >= MIN_AGE, `Дата рождения: сотруднику должно быть не менее ${MIN_AGE} лет`)
    .refine((d) => ageOn(d) <= 100, 'Дата рождения: некорректный возраст'),
  workPhone: phoneField('Рабочий телефон'),
  categoryId: intId('Категория'),
  photo: photoField,
});

// ---------- Предприятие ----------
export const companySchema = z.object({
  name: z
    .string({ required_error: 'Название: обязательное поле' })
    .trim()
    .min(2, 'Название: минимум 2 символа')
    .max(150, 'Название: максимум 150 символов'),
  address: z
    .string({ required_error: 'Адрес: обязательное поле' })
    .trim()
    .min(5, 'Адрес: минимум 5 символов')
    .max(255, 'Адрес: максимум 255 символов'),
  phone: phoneField('Телефон'),
  photo: photoField,
});

// ---------- Работа ----------
export const workSchema = z.object({
  employeeId: intId('Сотрудник'),
  companyId: intId('Предприятие'),
  workDate: dateField('Дата работы').refine(
    (d) => d.getTime() <= Date.now(),
    'Дата работы: не может быть в будущем',
  ),
  hoursWorked: z.coerce
    .number({ invalid_type_error: 'Часы: ожидается число' })
    .positive('Часы: должно быть больше 0')
    .max(MAX_HOURS_PER_DAY, `Часы: не более ${MAX_HOURS_PER_DAY} за одну работу`)
    .refine((v) => Math.abs(v * 100 - Math.round(v * 100)) < 1e-6, 'Часы: не более 2 знаков после запятой'),
});

/** Схемы по имени модели Prisma — используются расширением клиента */
export const modelSchemas: Record<string, z.AnyZodObject> = {
  Category: categorySchema,
  Employee: employeeSchema,
  Company: companySchema,
  Work: workSchema,
};
