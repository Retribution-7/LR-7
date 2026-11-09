# Сервер: аудиторская фирма (вариант 4)

Express + Prisma + PostgreSQL, TypeScript.

## Запуск

```bash
npm install
cp .env.example .env        # укажите DATABASE_URL
npx prisma migrate dev --name init
npm run db:seed             # 70 записей из prisma/seed-data.json
npm run dev                 # http://localhost:4000/api
```

## Эндпоинты

Для `categories`, `employees`, `companies`, `works`:

| Метод | Путь | Описание |
|---|---|---|
| GET | `/api/<res>?page=&limit=&sortBy=&order=&search=&<фильтры>` | список |
| GET | `/api/<res>/:id` | детали (404, если нет) |
| HEAD | `/api/<res>/:id` | 200 / 404 без тела |
| GET | `/api/<res>/:id/exists` | `{ id, exists }` |
| POST | `/api/<res>` | создание (employees, companies: multipart с полем `photo`) |
| PUT/PATCH | `/api/<res>/:id` | обновление (`removePhoto=true` удаляет фото) |
| DELETE | `/api/<res>/:id` | удаление (409, если есть связанные записи) |
| GET | `/api/reports/payroll?year=&month=&companyId=` | ведомость начислений |

Фильтры: categories — `rateMin`, `rateMax`; employees — `categoryId`, `birthFrom`, `birthTo`;
companies — `address`; works — `employeeId`, `companyId`, `dateFrom`, `dateTo`, `hoursMin`, `hoursMax`.

Формат ошибок: `{ error, message, details? }`; коды 400 / 404 / 409 / 500.
