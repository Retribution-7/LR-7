import { z } from 'zod';
import { ageFrom } from './utils';

/** Клиентская валидация зеркалит правила сервера (Zod-схемы в server/src/validation). Поля формы — строки. */

const num = (v: string) => Number(v.replace(',', '.'));
const isDate = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s) && new Date(`${s}T00:00:00Z`).toISOString().slice(0, 10) === s;
const required = (label: string) => z.string().trim().min(1, `${label}: обязательное поле`);
const PHONE_RE = /^\+?[0-9\s\-()]{7,20}$/;

export const categoryFormSchema = z.object({
  name: required('Название').min(2, 'Название: минимум 2 символа').max(50, 'Название: максимум 50 символов'),
  hourlyRate: required('Ставка')
    .refine((v) => !Number.isNaN(num(v)), 'Ставка: введите число')
    .refine((v) => num(v) > 0, 'Ставка: должна быть больше 0')
    .refine((v) => num(v) <= 1_000_000, 'Ставка: слишком большое значение')
    .refine((v) => Math.abs(num(v) * 100 - Math.round(num(v) * 100)) < 1e-6, 'Ставка: не более 2 знаков после запятой'),
});

export const employeeFormSchema = z.object({
  fullName: required('Ф.И.О.')
    .min(5, 'Ф.И.О.: минимум 5 символов')
    .max(150, 'Ф.И.О.: максимум 150 символов')
    .regex(/^[\p{L}][\p{L}\s.'-]*$/u, 'Ф.И.О.: допустимы только буквы, пробелы, точка, дефис'),
  passportNumber: required('Номер паспорта').regex(/^[A-Za-z]{2}\d{7}$/, 'Номер паспорта: 2 латинские буквы и 7 цифр (MP1234567)'),
  birthDate: required('Дата рождения')
    .refine(isDate, 'Дата рождения: некорректная дата')
    .refine((v) => !isDate(v) || new Date(v) <= new Date(), 'Дата рождения: не может быть в будущем')
    .refine((v) => !isDate(v) || new Date(v) > new Date() || ageFrom(v) >= 18, 'Сотруднику должно быть не менее 18 лет'),
  workPhone: required('Рабочий телефон').regex(PHONE_RE, 'Телефон: цифры, пробелы, «+», «-», скобки (7–20 символов)'),
  categoryId: required('Категория'),
});

export const companyFormSchema = z.object({
  name: required('Название').min(2, 'Название: минимум 2 символа').max(150, 'Название: максимум 150 символов'),
  address: required('Адрес').min(5, 'Адрес: минимум 5 символов').max(255, 'Адрес: максимум 255 символов'),
  phone: required('Телефон').regex(PHONE_RE, 'Телефон: цифры, пробелы, «+», «-», скобки (7–20 символов)'),
});

export const workFormSchema = z.object({
  employeeId: required('Сотрудник'),
  companyId: required('Предприятие'),
  workDate: required('Дата работы')
    .refine(isDate, 'Дата работы: некорректная дата')
    .refine((v) => !isDate(v) || new Date(v) <= new Date(), 'Дата работы: не может быть в будущем'),
  hoursWorked: required('Часы')
    .refine((v) => !Number.isNaN(num(v)), 'Часы: введите число')
    .refine((v) => num(v) > 0, 'Часы: должно быть больше 0')
    .refine((v) => num(v) <= 24, 'Часы: не более 24')
    .refine((v) => Math.abs(num(v) * 100 - Math.round(num(v) * 100)) < 1e-6, 'Часы: не более 2 знаков после запятой'),
});

export type CategoryFormValues = z.infer<typeof categoryFormSchema>;
export type EmployeeFormValues = z.infer<typeof employeeFormSchema>;
export type CompanyFormValues = z.infer<typeof companyFormSchema>;
export type WorkFormValues = z.infer<typeof workFormSchema>;

export const toNumber = num;
