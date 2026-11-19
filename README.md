# Аудит: учёт работ сотрудников аудиторской фирмы

Лабораторная работа № 7, вариант 4 («АУДИТ»). Веб-приложение с многоуровневой архитектурой:
**PostgreSQL → Prisma → Express (REST API) → React**.

## Стек

| Слой | Технологии |
|---|---|
| БД | PostgreSQL |
| ORM | Prisma (схема, миграции, расширение клиента для валидации) |
| Сервер | Node.js, Express, TypeScript, Zod, multer |
| Клиент | React, TypeScript, Vite, Zustand, React Router, Axios |
| UI | Radix UI (компоненты в стиле shadcn/ui) + Tailwind CSS |
| Формы | React Hook Form + Zod |
| Тесты API | Postman |

## Структура репозитория

```
apps/server/   REST API (prisma/schema.prisma, src/, prisma/seed.ts, prisma/seed-data.json)
apps/client/   React-приложение (src/pages, src/stores, src/forms, src/components)
postman/       коллекция Postman и генератор (gen_postman.py)
```

## База данных

Четыре таблицы. Предприятие вынесено из «Работы» в отдельную сущность, чтобы не дублировать данные
(из исходного задания взяты сотрудники, категории и работа).

```
categories (id, name, hourlyRate)
   1 ──< employees (id, fullName, passportNumber, birthDate, workPhone, photo, categoryId)
              1 ──< works (id, employeeId, companyId, workDate, hoursWorked) >── 1
                                                                companies (id, name, address, phone, photo)

roles (id, name)            — служебные таблицы пользователей и ролей
   1 ──< users (id, username, passwordHash, resetTokenHash, resetTokenExpiresAt, roleId)
              1 ──< refresh_tokens (id, tokenHash, userId, expiresAt, createdAt)
```

- Связи: категория 1:M сотрудники; сотрудники M:N предприятия через таблицу `works`.
- Все внешние ключи с `ON DELETE RESTRICT`: удалить категорию с сотрудниками, а также сотрудника или предприятие
  с работами нельзя (API отвечает 409, клиент показывает уведомление).
- 3НФ: повторяющиеся данные вынесены в справочники, неключевые поля зависят только от ключа.

## Запуск

Требуется Node.js 20+ и PostgreSQL.

```bash
# 1. База данных
createdb audit            # или создайте БД через pgAdmin

# 2. Сервер
cd server
npm install
cp .env.example .env      # укажите DATABASE_URL и JWT_SECRET
npx prisma migrate dev --name init
npm run db:seed           # заполнение из prisma/seed-data.json (70 записей) + пользователи
npm run dev               # http://localhost:4000/api

# 3. Клиент (в другом терминале)
cd client
npm install
npm run dev               # http://localhost:5173
```

Переменные окружения сервера: `DATABASE_URL`, `PORT`, `CLIENT_ORIGIN`, `UPLOAD_DIR`, `JWT_SECRET`
(обязательна — сервер не стартует без неё), `JWT_EXPIRES_IN` (время жизни access-токена, например `12h`),
`REFRESH_TTL_DAYS` (время жизни refresh-токена в днях, по умолчанию 7).

Вместо бэкапа БД используется **функция заполнения из JSON-файла**: `npm run db:seed` очищает таблицы и создаёт
3 категории, 12 предприятий, 20 сотрудников и 35 работ (всего 70 записей), а также роли и учётных
пользователей. Записи проходят ту же валидацию, что и API. Пользователей можно досеять отдельно:
`npm run db:seed-users` (идемпотентно).

**Учётные данные после сида:**

| Логин | Пароль | Роль |
|---|---|---|
| `admin` | `Admin123` | admin |
| `user` | `User1234` | user |

**Объём БД:** 74 записи (70 предметных + 2 роли + 2 пользователя) — не менее 50 по условию.
Контрольный запрос:

```sql
SELECT (SELECT count(*) FROM categories)+(SELECT count(*) FROM companies)+
       (SELECT count(*) FROM employees)+(SELECT count(*) FROM works)+
       (SELECT count(*) FROM roles)+(SELECT count(*) FROM users);
```

## REST API

**Все `/api/*`, кроме `/api/auth/*` и `/api/health`, требуют заголовок `Authorization: Bearer <token>`.**
Удаление записей сущностей и управление пользователями (`/api/users*`) доступны только роли `admin`;
остальные авторизованные пользователи (`user`) могут читать данные и создавать/изменять записи.

### Аутентификация и пользователи

| Метод | Путь | Назначение | Тело | Ответ |
|---|---|---|---|---|
| POST | `/api/auth/register` | регистрация (роль `user`, авто-вход) | `{username, password}` | 201 `{token, refreshToken, user}` |
| POST | `/api/auth/login` | вход | `{username, password}` | 200 `{token, refreshToken, user}` |
| POST | `/api/auth/refresh` | обновление пары токенов (ротация) | `{refreshToken}` | 200 `{token, refreshToken}` |
| POST | `/api/auth/logout` | выход (отзыв refresh-токена) | `{refreshToken}` | 200 `{message}` |
| GET | `/api/auth/me` | текущий пользователь | — | 200 `{id, username, role}` |
| POST | `/api/auth/change-password` | смена своего пароля | `{oldPassword, newPassword}` | 200 `{message, token, refreshToken}` |
| POST | `/api/auth/forgot-password` | запрос ссылки восстановления | `{username}` | 200 `{message}` (одинаковый всегда; ссылка выводится в консоль сервера) |
| POST | `/api/auth/reset-password` | сброс пароля по токену | `{token, newPassword}` | 200 `{message}` |

JWT выдаётся парой: короткий access-токен (`JWT_EXPIRES_IN`, подставляется в `Authorization: Bearer`) и
refresh-токен (`REFRESH_TTL_DAYS`, хранится в БД в виде SHA-256-хэша). При обновлении refresh-токен
заменяется новым (ротация), повторное использование старого — 401. Смена и сброс пароля отзывают все
refresh-токены пользователя (другие сессии завершаются). Клиент обновляет пару автоматически в
Axios-интерсепторе при получении 401.
| GET | `/api/users` | список пользователей (admin) | — | `{data, total, page, limit, pages}` |
| PATCH | `/api/users/:id` | смена роли (admin) | `{role: 'admin'\|'user'}` | 200 `{id, username, role}` |
| DELETE | `/api/users/:id` | удаление пользователя (admin) | — | 200 `{message, id}` |

Правила: логин 3–30 символов (латиница, цифры, `_ . -`), пароль 8–72 символов (буква + цифра).
Ошибки: 400 (валидация, `details` по полям), 401 (неверный логин/пароль, нет/недействительный токен),
403 (недостаточно прав), 409 (дубликат логина). Админ не может изменить свою роль или удалить себя (400).
Токен восстановления пароля одноразовый, срок действия — 15 минут.

### Сущности

Для `categories`, `employees`, `companies`, `works`:

| Метод | Путь | Назначение |
|---|---|---|
| POST | `/api/<res>` | создание (для `employees` и `companies` — JSON или multipart с файлом `photo`) |
| GET | `/api/<res>?page=&limit=` | список с пагинацией → `{data, total, page, limit, pages}` |
| GET | `/api/<res>?sortBy=&order=asc\|desc` | сортировка (в т. ч. по полям связанных таблиц: `category.name`, `employee.fullName`) |
| GET | `/api/<res>?<фильтры>` | фильтрация по нескольким полям одновременно |
| GET | `/api/<res>?search=` | поиск без учёта регистра сразу по нескольким полям |
| GET | `/api/<res>/:id` | детали (404, если записи нет) |
| HEAD | `/api/<res>/:id` | проверка существования: 200 / 404 |
| GET | `/api/<res>/:id/exists` | `{ id, exists }` |
| PUT, PATCH | `/api/<res>/:id` | обновление |
| DELETE | `/api/<res>/:id` | удаление (409, если есть связанные записи) |
| GET | `/api/reports/payroll?year=&month=&companyId=` | ведомость начислений из индивидуального задания |

Фильтры: `categories` — `rateMin`, `rateMax`; `employees` — `categoryId`, `birthFrom`, `birthTo`;
`companies` — `address`; `works` — `employeeId`, `companyId`, `dateFrom`, `dateTo`, `hoursMin`, `hoursMax`.

Ошибки приходят в формате `{ error, message, details? }` с кодами 400 (валидация), 404, 409 (уникальность, связанные записи), 500.

### Валидация на уровне моделей

В Prisma нет встроенных валидаторов, поэтому используется **расширение Prisma Client** (`server/src/db.ts`): перед каждым
`create` и `update` данные проходят Zod-схему модели (`server/src/validation/schemas.ts`). Встроенные правила: типы, длины,
формат паспорта и телефона, диапазоны. Пользовательские: возраст не менее 18 лет, даты не в будущем, не более 2 знаков
после запятой, **суммарно не более 24 часов в день у одного сотрудника** (запрос к БД).

## Клиент

- Адаптивный интерфейс: боковая панель на широких экранах, меню-гамбургер на мобильных, таблицы с адаптивными столбцами.
- Состояние: Zustand (по стору на сущность, единая фабрика `stores/entityStore.ts`, сторы уведомлений и справочников,
  `stores/authStore.ts` — сессия пользователя).
- Роутинг: `/employees`, `/employees/:id`, `/companies`, `/companies/:id`, `/works`, `/categories`, `/report`,
  `/profile` (смена пароля), `/users` (только admin); публичные страницы `/login`, `/register`,
  `/forgot-password`, `/reset-password`.
- Авторизация: JWT хранится в localStorage, подставляется Axios-интерсептором (`Authorization: Bearer`);
  при 401 — выход и редирект на `/login`. Восстановление пароля: ссылка из консоли сервера открывает
  `/reset-password?token=…`.
- Разграничение по ролям: пункт «Пользователи» и кнопки «Удалить» видны только администратору.
- Для каждой сущности: список (поиск, сортировка, фильтры, пагинация), добавление и редактирование в диалоговых формах,
  подтверждение удаления, уведомление при невозможности удаления.
- Валидация форм на клиенте (React Hook Form + Zod) плюс отображение ошибок сервера у полей.
- Подробные сведения с фото: страницы сотрудника и предприятия, диалог подробностей работы.
- HTTP-запросы — Axios (`client/src/lib/api.ts`).

## Тестирование в Postman

1. Запустите сервер и выполните `npm run db:seed` (или `npm run db:seed-users` для дозаливки пользователей).
2. Импортируйте коллекцию: [postman/audit-api.postman_collection.json](postman/audit-api.postman_collection.json)
   (файл сценариев: [postman/scenarios.md](postman/scenarios.md)).
3. Запустите коллекцию через **Collection Runner** по порядку: в каждом запросе есть автотесты (`pm.test`),
   id созданных записей и токены сохраняются в переменные коллекции. В запросе «Создание с фото» выберите файл
   в поле `photo` (без файла запрос вернёт 201 и проверка поля `photo` не пройдёт).
4. Переменная `baseUrl` по умолчанию `http://localhost:4000/api`. Переменная `token` заполняется автоматически
   запросом «Вход администратора» (collection-level Bearer). Для сценариев сброса пароля скопируйте токен из
   консоли сервера в переменную `resetToken` вручную.
5. Сценарии «Проверка прав» и «Удаление» подтверждают матрицу ролей и сохранность функциональности ЛР № 7
   (CRUD сущностей, отчёт, фото, 409 на связанные записи). Сценарий «Количество записей» проверяет,
   что в БД не менее 50 записей.

### Тестовые сценарии
#### 0. Служебное

| № | Сценарий | Запрос | Ожидаемый результат |
|---|---|---|---|
| 1 | Проверка доступности API | `GET /health` | API отвечает `{status: ok}` |
| 2 | Несуществующий маршрут | `GET /unknown` | 404 и JSON с сообщением |

#### 1. Авторизация

| № | Сценарий | Запрос | Ожидаемый результат |
|---|---|---|---|
| 3 | Регистрация пользователя | `POST /auth/register` | 201, `token`, `refreshToken`, `user.role` = "user" |
| 4 | Регистрация: дубликат логина | `POST /auth/register` | 409, ошибка по полю `username` |
| 5 | Регистрация: слабый пароль | `POST /auth/register` | 400, ошибка по полю `password` |
| 6 | Регистрация: некорректный логин | `POST /auth/register` | 400, ошибка по полю `username` |
| 7 | Вход администратора | `POST /auth/login` | 200, сохранён `token` и `refreshToken` администратора |
| 8 | Вход: неверный пароль | `POST /auth/login` | 401 «Неверный логин или пароль» |
| 9 | Вход: несуществующий логин | `POST /auth/login` | 401 (то же сообщение — без перебора пользователей) |
| 10 | Вход: пустые поля | `POST /auth/login` | 400, ошибки по полям |
| 11 | Текущий пользователь | `GET /auth/me` | 200 `{id, username, role: "admin"}` |
| 12 | Без токена | `GET /auth/me` | 401 |
| 13 | Невалидный токен | `GET /categories` | 401 |
| 14 | Вход обычного пользователя | `POST /auth/login` | 200, сохранён `userToken` |
| 15 | Обновление пары токенов (refresh) | `POST /auth/refresh` | 200, новая пара `token` + `refreshToken` (ротация) |
| 16 | Refresh: повторное использование старого токена | `POST /auth/refresh` | 401 — токен уже отозван ротацией |
| 17 | Refresh: мусорный токен | `POST /auth/refresh` | 401 |
| 18 | Refresh: пустое тело | `POST /auth/refresh` | 400, ошибка по полю `refreshToken` |
| 19 | Выход (logout) | `POST /auth/logout` | 200, refresh-токен отозван |
| 20 | Refresh после выхода | `POST /auth/refresh` | 401 — сессия завершена |
| 21 | Смена пароля (успех) | `POST /auth/change-password` | 200, возвращена новая пара токенов |
| 22 | Смена пароля: неверный текущий | `POST /auth/change-password` | 400, ошибка по `oldPassword` |
| 23 | Вход с новым паролем | `POST /auth/login` | 200 |
| 24 | Восстановление пароля: запрос ссылки | `POST /auth/forgot-password` | 200, одинаковое сообщение; ссылка — в консоли сервера (вставьте токен в `resetToken`) |
| 25 | Восстановление: несуществующий логин | `POST /auth/forgot-password` | 200 с тем же сообщением (без перебора) |
| 26 | Сброс пароля: мусорный токен | `POST /auth/reset-password` | 400 «Ссылка недействительна или истекла» |
| 27 | Сброс пароля: слабый новый пароль | `POST /auth/reset-password` | 400 по полю `newPassword` |
| 28 | Сброс пароля (успех) | `POST /auth/reset-password` | 200; `resetToken` вставляется вручную из консоли сервера |
| 29 | Сброс пароля: повторный тем же токеном | `POST /auth/reset-password` | 400 — токен одноразовый |
| 30 | Вход с восстановленным паролем | `POST /auth/login` | 200 |
| 31 | Список пользователей (админ) | `GET /users` | 200, есть admin и user |
| 32 | Список пользователей (user) | `GET /users` | 403 |
| 33 | Смена роли | `PATCH /users/{{testUserId}}` | 200, роль изменена |
| 34 | Смена своей роли | `PATCH /users/{{adminId}}` | 400 «Нельзя изменить собственную роль» |
| 35 | Удаление пользователя (админ) | `DELETE /users/{{testUserId}}` | 200 |
| 36 | Удаление себя | `DELETE /users/{{adminId}}` | 400 «Нельзя удалить собственную учётную запись» |

#### 2. Категории

| № | Сценарий | Запрос | Ожидаемый результат |
|---|---|---|---|
| 37 | Создание категории | `POST /categories` | Запись создана, возвращён `id` |
| 38 | Создание: ставка ≤ 0 (валидация) | `POST /categories` | 400, ошибка по полю `hourlyRate` |
| 39 | Создание: дубликат названия | `POST /categories` | 409, нарушение уникальности |
| 40 | Список: пагинация | `GET /categories?page=1&limit=2` | Не более 2 записей, есть `total`, `pages` |
| 41 | Список: сортировка по ставке (убывание) | `GET /categories?sortBy=hourlyRate&order=desc` | Записи упорядочены по убыванию ставки |
| 42 | Список: сортировка по недопустимому полю | `GET /categories?sortBy=secret` | 400 с перечнем допустимых полей |
| 43 | Список: фильтр по диапазону ставки | `GET /categories?rateMin=20&rateMax=35` | Все ставки в диапазоне 20–35 |
| 44 | Список: поиск по названию | `GET /categories?search=категория` | Найдены записи, название содержит «категория» |
| 45 | Детали по ID | `GET /categories/{{categoryId}}` | Возвращена запись с счётчиком сотрудников |
| 46 | Детали: записи нет | `GET /categories/999999` | 404 и понятное сообщение |
| 47 | Детали: некорректный id | `GET /categories/abc` | 400 — id должен быть числом |
| 48 | Существование: HEAD (есть) | `HEAD /categories/{{categoryId}}` | 200 без тела |
| 49 | Существование: HEAD (нет) | `HEAD /categories/999999` | 404 без тела |
| 50 | Существование: GET /exists | `GET /categories/{{categoryId}}/exists` | `exists: true` |
| 51 | Обновление категории | `PUT /categories/{{categoryId}}` | Ставка изменена |
| 52 | Обновление: записи нет | `PUT /categories/999999` | 404 |

#### 3. Сотрудники

| № | Сценарий | Запрос | Ожидаемый результат |
|---|---|---|---|
| 53 | Создание сотрудника | `POST /employees` | Запись создана, `category` подгружена |
| 54 | Создание: паспорт неверного формата | `POST /employees` | 400, ошибка по `passportNumber` |
| 55 | Создание: возраст меньше 18 (кастомный валидатор) | `POST /employees` | 400, ошибка по `birthDate` |
| 56 | Создание: дата рождения в будущем | `POST /employees` | 400 |
| 57 | Создание: дубликат паспорта | `POST /employees` | 409, нарушение уникальности |
| 58 | Создание: несуществующая категория | `POST /employees` | 400 — внешний ключ не найден |
| 59 | Создание с фото (multipart) | `POST /employees` | 201, в поле `photo` путь вида `/uploads/…` (выберите файл JPEG/PNG/WebP в Body → form-data) |
| 60 | Список: пагинация | `GET /employees?page=2&limit=5` | Вторая страница по 5 записей |
| 61 | Список: сортировка по ФИО | `GET /employees?sortBy=fullName&order=asc&limit=50` | Успешный ответ, записи отсортированы по ФИО |
| 62 | Список: сортировка по полю связанной таблицы | `GET /employees?sortBy=category.hourlyRate&order=desc` | Сортировка по ставке категории |
| 63 | Список: фильтр по нескольким полям | `GET /employees?categoryId={{categoryId}}&birthFrom=1980-01-01&birthTo=2000-12-31` | Категория совпадает и дата рождения в диапазоне |
| 64 | Список: поиск по нескольким полям | `GET /employees?search=тестов` | Поиск без учёта регистра по ФИО, паспорту, телефону |
| 65 | Список: поиск + фильтр + сортировка + пагинация | `GET /employees?search=тестов&categoryId={{categoryId}}&sortBy=birthDate&order=desc&page=1&limit=10` | Параметры комбинируются |
| 66 | Детали по ID | `GET /employees/{{employeeId}}` | Сотрудник с категорией и числом работ |
| 67 | Детали: записи нет | `GET /employees/999999` | 404 |
| 68 | Существование: HEAD | `HEAD /employees/{{employeeId}}` | 200 |
| 69 | Существование: GET /exists (нет записи) | `GET /employees/999999/exists` | 200, `exists: false` |
| 70 | Обновление (PUT) | `PUT /employees/{{employeeId}}` | Телефон изменён |
| 71 | Обновление (PATCH): невалидное значение | `PATCH /employees/{{employeeId}}` | 400, данные не сохранены |

#### 4. Предприятия

| № | Сценарий | Запрос | Ожидаемый результат |
|---|---|---|---|
| 72 | Создание предприятия | `POST /companies` | Запись создана |
| 73 | Создание: слишком короткий адрес | `POST /companies` | 400, ошибка по `address` |
| 74 | Список: фильтр по адресу и поиск | `GET /companies?address=Минск&search=тест` | Совпадение по адресу и названию |
| 75 | Список: сортировка и пагинация | `GET /companies?sortBy=name&order=desc&page=1&limit=3` | Не более 3 записей, сортировка по названию (убывание) |
| 76 | Детали по ID | `GET /companies/{{companyId}}` | Предприятие найдено |
| 77 | Детали: записи нет | `GET /companies/999999` | 404 |
| 78 | Существование: HEAD | `HEAD /companies/{{companyId}}` | 200 |
| 79 | Обновление | `PUT /companies/{{companyId}}` | Адрес изменён |

#### 5. Работы

| № | Сценарий | Запрос | Ожидаемый результат |
|---|---|---|---|
| 80 | Создание работы | `POST /works` | Запись создана |
| 81 | Создание: часы больше 24 | `POST /works` | 400, ошибка по `hoursWorked` |
| 82 | Создание: дата в будущем | `POST /works` | 400, ошибка по `workDate` |
| 83 | Создание: за день больше 24 часов (кастомный валидатор) | `POST /works` | 400 — у сотрудника уже 8 ч. за этот день, 8 + 17 > 24 |
| 84 | Создание: несуществующий сотрудник | `POST /works` | 400 — внешний ключ не найден |
| 85 | Список: пагинация | `GET /works?page=1&limit=5` | До 5 записей, подгружены сотрудник и предприятие |
| 86 | Список: сортировка по ФИО сотрудника | `GET /works?sortBy=employee.fullName&order=asc&limit=50` | Сортировка по вложенному полю |
| 87 | Список: фильтр по нескольким полям | `GET /works?employeeId={{employeeId}}&companyId={{companyId}}&dateFrom=2025-01-01&dateTo=2025-12-31&hoursMin=4&hoursMax=10` | Все условия выполняются одновременно |
| 88 | Список: поиск по сотруднику и предприятию | `GET /works?search=тест` | Совпадение по ФИО сотрудника или названию предприятия |
| 89 | Детали по ID | `GET /works/{{workId}}` | Работа с сотрудником (и его категорией) и предприятием |
| 90 | Детали: записи нет | `GET /works/999999` | 404 |
| 91 | Существование: GET /exists | `GET /works/{{workId}}/exists` | `exists: true` |
| 92 | Обновление работы | `PUT /works/{{workId}}` | Часы изменены (проверка лимита учитывает саму запись) |

#### 6. Отчёт

| № | Сценарий | Запрос | Ожидаемый результат |
|---|---|---|---|
| 93 | Ведомость начислений за год | `GET /reports/payroll?year=2025` | Группировка по предприятиям, итоги = сумме строк |
| 94 | Ведомость: некорректный месяц | `GET /reports/payroll?year=2025&month=13` | 400 |

#### 7. Проверка прав

| № | Сценарий | Запрос | Ожидаемый результат |
|---|---|---|---|
| 95 | DELETE сущности как user | `DELETE /works/{{workId}}` | 403 |
| 96 | Обновление сущности как user | `PATCH /categories/{{categoryId}}` | 200 (право user на изменение) |

#### 8. Удаление и целостность

| № | Сценарий | Запрос | Ожидаемый результат |
|---|---|---|---|
| 97 | Удаление категории с сотрудниками | `DELETE /categories/{{categoryId}}` | 409 — нельзя удалить, есть сотрудники |
| 98 | Удаление сотрудника с работами | `DELETE /employees/{{employeeId}}` | 409 — нельзя удалить, есть работы |
| 99 | Удаление предприятия с работами | `DELETE /companies/{{companyId}}` | 409 — нельзя удалить, есть работы |
| 100 | Удаление работы | `DELETE /works/{{workId}}` | 200, запись удалена |
| 101 | Повторное удаление работы | `DELETE /works/{{workId}}` | 404 — записи уже нет |
| 102 | Проверка существования после удаления | `GET /works/{{workId}}/exists` | `exists: false` |
| 103 | Удаление сотрудника (фото) без работ | `DELETE /employees/{{employee2Id}}` | 200 (если запрос «Создание с фото» выполнялся) |
| 104 | Удаление сотрудника | `DELETE /employees/{{employeeId}}` | 200 |
| 105 | Удаление предприятия | `DELETE /companies/{{companyId}}` | 200 |
| 106 | Удаление категории | `DELETE /categories/{{categoryId}}` | 200 |

#### 9. Количество записей

| № | Сценарий | Запрос | Ожидаемый результат |
|---|---|---|---|
| 107 | Итоги: категории | `GET /categories?limit=1` | total сохранён |
| 108 | Итоги: предприятия | `GET /companies?limit=1` | total сохранён |
| 109 | Итоги: сотрудники | `GET /employees?limit=1` | total сохранён |
| 110 | Итоги: работы | `GET /works?limit=1` | total сохранён |
| 111 | Итоги: пользователи | `GET /users?limit=1` | total сохранён |
| 112 | Суммарно не менее 50 записей | `GET /users?limit=1` | сумма `total` по всем разделам ≥ 50 (предметные + роли и пользователи) |
