/**
 * Генерирует prisma/seed-data.json (детерминированные тестовые данные, seed=42).
 * Запуск: npm run db:gen-data (или tsx prisma/gen-seed.ts). Затем: npm run db:seed.
 */
import fs from 'node:fs';
import path from 'node:path';

/** mulberry32 — детерминированный ПСЧ, одинаковый вывод при одинаковом seed */
function mulberry32(seed: number) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rng = mulberry32(42);
const randInt = (min: number, max: number) => min + Math.floor(rng() * (max - min + 1));
const pick = <T>(arr: T[]): T => arr[Math.floor(rng() * arr.length)];

const categories = [
  { name: '1-я категория', hourlyRate: 30 },
  { name: '2-я категория', hourlyRate: 22 },
  { name: '3-я категория', hourlyRate: 15 },
];

const names = [
  'Иванов Андрей Сергеевич', 'Петрова Елена Викторовна', 'Сидоров Максим Олегович', 'Козлова Ольга Николаевна',
  'Новиков Дмитрий Павлович', 'Морозова Анна Игоревна', 'Волков Артём Андреевич', 'Соколова Наталья Петровна',
  'Лебедев Игорь Валерьевич', 'Ковалёва Татьяна Александровна', 'Кравец Виталий Станиславович', 'Шевченко Ирина Леонидовна',
  'Бондаренко Сергей Михайлович', 'Захарова Мария Дмитриевна', 'Мельник Павел Юрьевич', 'Гришин Алексей Романович',
  'Жукова Светлана Борисовна', 'Тихонов Владислав Евгеньевич', 'Климова Екатерина Владимировна', 'Рябов Николай Анатольевич',
];

const companiesRaw: [string, string][] = [
  ['ООО «СтройГрад»', 'г. Минск, пр-т Независимости, 58'],
  ['ОАО «Белмашпром»', 'г. Минск, ул. Тимирязева, 12'],
  ['ЗАО «АгроТорг»', 'г. Брест, ул. Советская, 45'],
  ['ООО «ТехноЛайн»', 'г. Минск, ул. Притыцкого, 101'],
  ['ООО «Минск-Логистик»', 'г. Минск, ул. Могилёвская, 8'],
  ['ОАО «Гродно-Текстиль»', 'г. Гродно, ул. Ожешко, 22'],
  ['ЗАО «БелФарм-Опт»', 'г. Минск, ул. Роменская, 4'],
  ['ОАО «Витебский Мебельщик»', 'г. Витебск, ул. Ленина, 30'],
  ['ООО «Гомельдрев-Инвест»', 'г. Гомель, ул. Советская, 17'],
  ['ОАО «Брестская Кондитерская»', 'г. Брест, ул. Гоголя, 9'],
  ['ООО «Могилёвлифт-Сервис»', 'г. Могилёв, ул. Первомайская, 63'],
  ['ЗАО «Полесье-Агро»', 'г. Пинск, ул. Брестская, 71'],
];

const letters = ['MP', 'KH', 'HB', 'AB', 'MC', 'KB'];
const iso = (d: Date) => d.toISOString().slice(0, 10);

const usedPassports = new Set<string>();
const employees = names.map((fullName, i) => {
  let passportNumber: string;
  do {
    passportNumber = pick(letters) + Array.from({ length: 7 }, () => randInt(0, 9)).join('');
  } while (usedPassports.has(passportNumber));
  usedPassports.add(passportNumber);

  const birthDate = iso(new Date(Date.UTC(randInt(1966, 2002), randInt(1, 12), randInt(1, 28))));
  const workPhone = `+375 ${pick(['29', '33', '44', '25'])} ${randInt(100, 999)}-${randInt(10, 99)}-${randInt(10, 99)}`;
  return { fullName, passportNumber, birthDate, workPhone, categoryName: categories[i % 3].name };
});

const companies = companiesRaw.map(([name, address]) => ({
  name,
  address,
  phone: `+375 17 ${randInt(200, 399)}-${randInt(10, 99)}-${randInt(10, 99)}`,
}));

const start = Date.UTC(2026, 0, 12);
const seen = new Set<string>();
const works: { employeePassport: string; companyName: string; workDate: string; hoursWorked: number }[] = [];
while (works.length < 35) {
  const e = pick(employees);
  const d = new Date(start + randInt(0, 290) * 86_400_000);
  const key = `${e.passportNumber}|${iso(d)}`;
  if (d.getUTCDay() >= 5 || seen.has(key)) continue;
  seen.add(key);
  works.push({
    employeePassport: e.passportNumber,
    companyName: pick(companies).name,
    workDate: iso(d),
    hoursWorked: pick([2, 3, 4, 4.5, 5, 6, 7, 8]),
  });
}
works.sort((a, b) => a.workDate.localeCompare(b.workDate));

const data = { categories, companies, employees, works };
fs.writeFileSync(path.join(import.meta.dirname, 'seed-data.json'), JSON.stringify(data, null, 2) + '\n', 'utf-8');

const counts = Object.fromEntries(Object.entries(data).map(([k, v]) => [k, v.length]));
console.log(counts, 'total', Object.values(counts).reduce((a, b) => a + b, 0));
