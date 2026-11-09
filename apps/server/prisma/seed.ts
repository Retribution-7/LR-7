/**
 * Заполнение БД исходными данными из prisma/seed-data.json.
 * Запуск: npm run db:seed (очищает таблицы и создаёт данные заново).
 * Записи создаются через расширенный клиент, поэтому проходят ту же валидацию, что и API.
 */
import fs from 'fs';
import path from 'path';
import { basePrisma, prisma } from '../src/db';

interface SeedData {
  categories: { name: string; hourlyRate: number }[];
  companies: { name: string; address: string; phone: string }[];
  employees: { fullName: string; passportNumber: string; birthDate: string; workPhone: string; categoryName: string }[];
  works: { employeePassport: string; companyName: string; workDate: string; hoursWorked: number }[];
}

async function main() {
  const data: SeedData = JSON.parse(fs.readFileSync(path.join(import.meta.dirname, 'seed-data.json'), 'utf-8'));

  await basePrisma.$executeRawUnsafe('TRUNCATE TABLE "works", "employees", "companies", "categories" RESTART IDENTITY CASCADE');

  const categoryIds = new Map<string, number>();
  for (const c of data.categories) {
    categoryIds.set(c.name, (await prisma.category.create({ data: c })).id);
  }

  const companyIds = new Map<string, number>();
  for (const c of data.companies) {
    companyIds.set(c.name, (await prisma.company.create({ data: c })).id);
  }

  const employeeIds = new Map<string, number>();
  for (const { categoryName, ...e } of data.employees) {
    const created = await prisma.employee.create({
      data: { ...e, categoryId: categoryIds.get(categoryName)! } as any,
    });
    employeeIds.set(e.passportNumber, created.id);
  }

  for (const w of data.works) {
    await prisma.work.create({
      data: {
        employeeId: employeeIds.get(w.employeePassport)!,
        companyId: companyIds.get(w.companyName)!,
        workDate: w.workDate,
        hoursWorked: w.hoursWorked,
      } as any,
    });
  }

  console.log(
    `Готово: категорий ${data.categories.length}, предприятий ${data.companies.length}, ` +
      `сотрудников ${data.employees.length}, работ ${data.works.length}`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => basePrisma.$disconnect());
