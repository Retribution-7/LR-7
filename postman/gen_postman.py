import json

folders = []
scenarios = []
cur = None

def folder(name):
    global cur
    cur = {"name": name, "item": []}
    folders.append(cur)

def status_test(code):
    return f'pm.test("Статус {code}", () => pm.response.to.have.status({code}));'

def request(name, method, path, expected, status, body=None, tests="", pre="", formdata=None, auth=None, headers=None):
    events = []
    if pre:
        events.append({"listen": "prerequest", "script": {"type": "text/javascript", "exec": pre.strip().split("\n")}})
    code = status_test(status) + ("\n" + tests.strip() if tests else "")
    events.append({"listen": "test", "script": {"type": "text/javascript", "exec": code.split("\n")}})
    req = {"method": method, "header": [], "url": "{{baseUrl}}" + path}
    if auth == "none":
        req["auth"] = {"type": "noauth"}
    elif isinstance(auth, str):
        req["header"].append({"key": "Authorization", "value": "Bearer {{" + auth + "}}"})
    if headers:
        req["header"].extend(headers)
    if body is not None:
        req["header"].append({"key": "Content-Type", "value": "application/json"})
        req["body"] = {"mode": "raw", "raw": json.dumps(body, ensure_ascii=False, indent=2), "options": {"raw": {"language": "json"}}}
    if formdata is not None:
        req["body"] = {"mode": "formdata", "formdata": formdata}
    cur["item"].append({"name": name, "event": events, "request": req})
    shown = f"{method} {path}"
    scenarios.append((cur["name"], name, shown, expected))

SAVE = lambda var: f'pm.collectionVariables.set("{var}", pm.response.json().id);'

folder("0. Служебное")
request("Проверка доступности API", "GET", "/health", "API отвечает `{status: ok}`", 200,
        tests='pm.expect(pm.response.json().status).to.eql("ok");')
request("Несуществующий маршрут", "GET", "/unknown", "404 и JSON с сообщением", 404,
        tests='pm.expect(pm.response.json()).to.have.property("message");')

SAVE_USER_ID = lambda var: f'pm.collectionVariables.set("{var}", pm.response.json().user.id);'
SAVE_TOKEN = lambda var: f'pm.collectionVariables.set("{var}", pm.response.json().token);'
SAVE_REFRESH = lambda var: f'pm.collectionVariables.set("{var}", pm.response.json().refreshToken);'

folder("1. Авторизация")
request("Регистрация пользователя", "POST", "/auth/register", "201, `token`, `refreshToken`, `user.role` = \"user\"", 201,
        pre='pm.collectionVariables.set("testUser", "test" + Date.now());',
        body={"username": "{{testUser}}", "password": "Test1234"},
        tests=SAVE_TOKEN("testToken") + '\n' + SAVE_REFRESH("testRefreshToken") + '\n' + SAVE_USER_ID("testUserId") +
              '\npm.expect(pm.response.json().user.role).to.eql("user");')
request("Регистрация: дубликат логина", "POST", "/auth/register", "409, ошибка по полю `username`", 409,
        body={"username": "admin", "password": "Test1234"},
        tests='pm.expect(pm.response.json().details.some(x => x.path === "username")).to.be.true;')
request("Регистрация: слабый пароль", "POST", "/auth/register", "400, ошибка по полю `password`", 400,
        pre='pm.collectionVariables.set("testUser2", "test" + Date.now() + "x");',
        body={"username": "{{testUser2}}", "password": "123"},
        tests='pm.expect(pm.response.json().details.some(x => x.path === "password")).to.be.true;')
request("Регистрация: некорректный логин", "POST", "/auth/register", "400, ошибка по полю `username`", 400,
        body={"username": "логин с пробелами", "password": "Test1234"},
        tests='pm.expect(pm.response.json().details.some(x => x.path === "username")).to.be.true;')
request("Вход администратора", "POST", "/auth/login", "200, сохранён `token` и `refreshToken` администратора", 200,
        body={"username": "admin", "password": "Admin123"},
        tests=SAVE_TOKEN("token") + '\n' + SAVE_REFRESH("refreshToken") + '\n' + SAVE_USER_ID("adminId") +
              '\npm.expect(pm.response.json().user.role).to.eql("admin");')
request("Вход: неверный пароль", "POST", "/auth/login", "401 «Неверный логин или пароль»", 401,
        body={"username": "admin", "password": "WrongPass1"},
        tests='pm.expect(pm.response.json().message).to.eql("Неверный логин или пароль");')
request("Вход: несуществующий логин", "POST", "/auth/login", "401 (то же сообщение — без перебора пользователей)", 401,
        body={"username": "no_such_user", "password": "Test1234"},
        tests='pm.expect(pm.response.json().message).to.eql("Неверный логин или пароль");')
request("Вход: пустые поля", "POST", "/auth/login", "400, ошибки по полям", 400,
        body={"username": "", "password": ""},
        tests='const d = pm.response.json().details; pm.expect(d.some(x => x.path === "username")).to.be.true; pm.expect(d.some(x => x.path === "password")).to.be.true;')
request("Текущий пользователь", "GET", "/auth/me", "200 `{id, username, role: \"admin\"}`", 200,
        tests='const b = pm.response.json(); pm.expect(b.role).to.eql("admin"); pm.expect(b).to.have.property("username");')
request("Без токена", "GET", "/auth/me", "401", 401, auth="none")
request("Невалидный токен", "GET", "/categories", "401", 401,
        auth="none",
        headers=[{"key": "Authorization", "value": "Bearer abc.def.ghi"}])
request("Вход обычного пользователя", "POST", "/auth/login", "200, сохранён `userToken`", 200,
        body={"username": "user", "password": "User1234"},
        tests=SAVE_TOKEN("userToken") + '\n' + SAVE_REFRESH("userRefreshToken") + '\npm.expect(pm.response.json().user.role).to.eql("user");')
request("Обновление пары токенов (refresh)", "POST", "/auth/refresh", "200, новая пара `token` + `refreshToken` (ротация)", 200,
        auth="none",
        pre='pm.collectionVariables.set("usedRefreshToken", pm.collectionVariables.get("refreshToken"));',
        body={"refreshToken": "{{refreshToken}}"},
        tests=SAVE_TOKEN("token") + '\n' + SAVE_REFRESH("refreshToken") +
              '\npm.expect(pm.response.json().refreshToken).to.not.eql(pm.collectionVariables.get("usedRefreshToken"));')
request("Refresh: повторное использование старого токена", "POST", "/auth/refresh", "401 — токен уже отозван ротацией", 401,
        auth="none",
        body={"refreshToken": "{{usedRefreshToken}}"})
request("Refresh: мусорный токен", "POST", "/auth/refresh", "401", 401,
        auth="none",
        body={"refreshToken": "abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789"})
request("Refresh: пустое тело", "POST", "/auth/refresh", "400, ошибка по полю `refreshToken`", 400,
        auth="none",
        body={},
        tests='pm.expect(pm.response.json().details.some(x => x.path === "refreshToken")).to.be.true;')
request("Выход (logout)", "POST", "/auth/logout", "200, refresh-токен отозван", 200,
        auth="none",
        body={"refreshToken": "{{refreshToken}}"},
        tests='pm.expect(pm.response.json().message).to.eql("Сессия завершена");')
request("Refresh после выхода", "POST", "/auth/refresh", "401 — сессия завершена", 401,
        auth="none",
        body={"refreshToken": "{{refreshToken}}"})
request("Смена пароля (успех)", "POST", "/auth/change-password", "200, возвращена новая пара токенов", 200,
        auth="testToken",
        body={"oldPassword": "Test1234", "newPassword": "Test5678"},
        tests='pm.expect(pm.response.json().message).to.eql("Пароль изменён");\n' +
              SAVE_TOKEN("testToken") + '\n' + SAVE_REFRESH("testRefreshToken"))
request("Смена пароля: неверный текущий", "POST", "/auth/change-password", "400, ошибка по `oldPassword`", 400,
        auth="testToken",
        body={"oldPassword": "BadPass99", "newPassword": "Test9999"},
        tests='pm.expect(pm.response.json().details.some(x => x.path === "oldPassword")).to.be.true;')
request("Вход с новым паролем", "POST", "/auth/login", "200", 200,
        body={"username": "{{testUser}}", "password": "Test5678"},
        tests=SAVE_TOKEN("testToken") + '\n' + SAVE_REFRESH("testRefreshToken"))
request("Восстановление пароля: запрос ссылки", "POST", "/auth/forgot-password",
        "200, одинаковое сообщение; ссылка — в консоли сервера (вставьте токен в `resetToken`)", 200,
        body={"username": "{{testUser}}"},
        tests='pm.expect(pm.response.json().message).to.include("ссылка");')
request("Восстановление: несуществующий логин", "POST", "/auth/forgot-password",
        "200 с тем же сообщением (без перебора)", 200,
        body={"username": "no_such_user"},
        tests='pm.expect(pm.response.json().message).to.include("ссылка");')
request("Сброс пароля: мусорный токен", "POST", "/auth/reset-password",
        "400 «Ссылка недействительна или истекла»", 400,
        body={"token": "0000000000000000000000000000000000000000000000000000000000000000", "newPassword": "NewPass12"},
        tests='pm.expect(pm.response.json().details.some(x => x.path === "token")).to.be.true;')
request("Сброс пароля: слабый новый пароль", "POST", "/auth/reset-password",
        "400 по полю `newPassword`", 400,
        body={"token": "{{resetToken}}", "newPassword": "123"},
        tests='pm.expect(pm.response.json().details.some(x => x.path === "newPassword")).to.be.true;')
request("Сброс пароля (успех)", "POST", "/auth/reset-password",
        "200; `resetToken` вставляется вручную из консоли сервера", 200,
        body={"token": "{{resetToken}}", "newPassword": "NewPass12"},
        tests='pm.expect(pm.response.json().message).to.eql("Пароль восстановлен");')
request("Сброс пароля: повторный тем же токеном", "POST", "/auth/reset-password",
        "400 — токен одноразовый", 400,
        body={"token": "{{resetToken}}", "newPassword": "NewPass34"})
request("Вход с восстановленным паролем", "POST", "/auth/login", "200", 200,
        body={"username": "{{testUser}}", "password": "NewPass12"},
        tests=SAVE_TOKEN("testToken") + '\n' + SAVE_REFRESH("testRefreshToken"))
request("Список пользователей (админ)", "GET", "/users", "200, есть admin и user", 200,
        tests='const d = pm.response.json().data; pm.expect(d.some(u => u.username === "admin")).to.be.true; pm.expect(d.some(u => u.username === "user")).to.be.true;')
request("Список пользователей (user)", "GET", "/users", "403", 403, auth="userToken")
request("Смена роли", "PATCH", "/users/{{testUserId}}", "200, роль изменена", 200,
        body={"role": "admin"},
        tests='pm.expect(pm.response.json().role).to.eql("admin");')
request("Смена своей роли", "PATCH", "/users/{{adminId}}", "400 «Нельзя изменить собственную роль»", 400,
        body={"role": "user"},
        tests='pm.expect(pm.response.json().message).to.include("собственную роль");')
request("Удаление пользователя (админ)", "DELETE", "/users/{{testUserId}}", "200", 200)
request("Удаление себя", "DELETE", "/users/{{adminId}}", "400 «Нельзя удалить собственную учётную запись»", 400,
        tests='pm.expect(pm.response.json().message).to.include("собственную учётную запись");')

folder("2. Категории")
request("Создание категории", "POST", "/categories", "Запись создана, возвращён `id`", 201,
        body={"name": "Тестовая категория {{$timestamp}}", "hourlyRate": 40},
        tests=SAVE("categoryId") + '\npm.expect(pm.response.json().hourlyRate).to.eql(40);')
request("Создание: ставка ≤ 0 (валидация)", "POST", "/categories", "400, ошибка по полю `hourlyRate`", 400,
        body={"name": "Ошибка", "hourlyRate": -5},
        tests='const d = pm.response.json().details; pm.expect(d.some(x => x.path === "hourlyRate")).to.be.true;')
request("Создание: дубликат названия", "POST", "/categories", "409, нарушение уникальности", 409,
        body={"name": "1-я категория", "hourlyRate": 31})
request("Список: пагинация", "GET", "/categories?page=1&limit=2", "Не более 2 записей, есть `total`, `pages`", 200,
        tests='const b = pm.response.json(); pm.expect(b).to.have.keys(["data","total","page","limit","pages"]); pm.expect(b.data.length).to.be.at.most(2); pm.expect(b.limit).to.eql(2);')
request("Список: сортировка по ставке (убывание)", "GET", "/categories?sortBy=hourlyRate&order=desc", "Записи упорядочены по убыванию ставки", 200,
        tests='const v = pm.response.json().data.map(x => x.hourlyRate); pm.expect(v).to.eql([...v].sort((a,b) => b-a));')
request("Список: сортировка по недопустимому полю", "GET", "/categories?sortBy=secret", "400 с перечнем допустимых полей", 400)
request("Список: фильтр по диапазону ставки", "GET", "/categories?rateMin=20&rateMax=35", "Все ставки в диапазоне 20–35", 200,
        tests='pm.response.json().data.forEach(c => pm.expect(c.hourlyRate).to.be.within(20, 35));')
request("Список: поиск по названию", "GET", "/categories?search=категория", "Найдены записи, название содержит «категория»", 200,
        tests='const d = pm.response.json().data; pm.expect(d.length).to.be.above(0); d.forEach(c => pm.expect(c.name.toLowerCase()).to.include("категория"));')
request("Детали по ID", "GET", "/categories/{{categoryId}}", "Возвращена запись с счётчиком сотрудников", 200,
        tests='pm.expect(pm.response.json().id).to.eql(Number(pm.collectionVariables.get("categoryId")));')
request("Детали: записи нет", "GET", "/categories/999999", "404 и понятное сообщение", 404,
        tests='pm.expect(pm.response.json().message).to.include("не найден");')
request("Детали: некорректный id", "GET", "/categories/abc", "400 — id должен быть числом", 400)
request("Существование: HEAD (есть)", "HEAD", "/categories/{{categoryId}}", "200 без тела", 200)
request("Существование: HEAD (нет)", "HEAD", "/categories/999999", "404 без тела", 404)
request("Существование: GET /exists", "GET", "/categories/{{categoryId}}/exists", "`exists: true`", 200,
        tests='pm.expect(pm.response.json().exists).to.be.true;')
request("Обновление категории", "PUT", "/categories/{{categoryId}}", "Ставка изменена", 200,
        body={"hourlyRate": 42.5}, tests='pm.expect(pm.response.json().hourlyRate).to.eql(42.5);')
request("Обновление: записи нет", "PUT", "/categories/999999", "404", 404, body={"hourlyRate": 10})

PRE_EMP = 'pm.collectionVariables.set("passport", "TS" + Math.floor(1000000 + Math.random()*8999999));'
folder("3. Сотрудники")
request("Создание сотрудника", "POST", "/employees", "Запись создана, `category` подгружена", 201,
        pre=PRE_EMP,
        body={"fullName": "Тестов Иван Петрович", "passportNumber": "{{passport}}", "birthDate": "1990-05-12",
              "workPhone": "+375 29 111-22-33", "categoryId": "{{categoryId}}"},
        tests=SAVE("employeeId") + '\npm.expect(pm.response.json().category).to.have.property("name");')
request("Создание: паспорт неверного формата", "POST", "/employees", "400, ошибка по `passportNumber`", 400,
        body={"fullName": "Тестов Пётр", "passportNumber": "12345", "birthDate": "1990-05-12", "workPhone": "+375 29 111-22-33", "categoryId": "{{categoryId}}"},
        tests='pm.expect(pm.response.json().details.some(x => x.path === "passportNumber")).to.be.true;')
request("Создание: возраст меньше 18 (кастомный валидатор)", "POST", "/employees", "400, ошибка по `birthDate`", 400,
        body={"fullName": "Юный Сотрудник", "passportNumber": "TS0000001", "birthDate": "2020-01-01", "workPhone": "+375 29 111-22-33", "categoryId": "{{categoryId}}"},
        tests='pm.expect(pm.response.json().details.some(x => x.path === "birthDate")).to.be.true;')
request("Создание: дата рождения в будущем", "POST", "/employees", "400", 400,
        body={"fullName": "Будущий Сотрудник", "passportNumber": "TS0000002", "birthDate": "2999-01-01", "workPhone": "+375 29 111-22-33", "categoryId": "{{categoryId}}"})
request("Создание: дубликат паспорта", "POST", "/employees", "409, нарушение уникальности", 409,
        body={"fullName": "Двойник Тестов", "passportNumber": "{{passport}}", "birthDate": "1991-01-01", "workPhone": "+375 29 111-22-33", "categoryId": "{{categoryId}}"})
request("Создание: несуществующая категория", "POST", "/employees", "400 — внешний ключ не найден", 400,
        body={"fullName": "Без Категории", "passportNumber": "TS0000003", "birthDate": "1991-01-01", "workPhone": "+375 29 111-22-33", "categoryId": 999999})
request("Создание с фото (multipart)", "POST", "/employees", "201, в поле `photo` путь вида `/uploads/…` (выберите файл JPEG/PNG/WebP в Body → form-data)", 201,
        pre='pm.collectionVariables.set("passport2", "TS" + Math.floor(1000000 + Math.random()*8999999));',
        formdata=[{"key": "fullName", "value": "Фотов Алексей", "type": "text"},
                  {"key": "passportNumber", "value": "{{passport2}}", "type": "text"},
                  {"key": "birthDate", "value": "1985-03-20", "type": "text"},
                  {"key": "workPhone", "value": "+375 29 222-33-44", "type": "text"},
                  {"key": "categoryId", "value": "{{categoryId}}", "type": "text"},
                  {"key": "photo", "type": "file", "src": []}],
        tests=SAVE("employee2Id") + '\npm.expect(pm.response.json().photo).to.match(/^\\/uploads\\//);')
request("Список: пагинация", "GET", "/employees?page=2&limit=5", "Вторая страница по 5 записей", 200,
        tests='const b = pm.response.json(); pm.expect(b.page).to.eql(2); pm.expect(b.data.length).to.be.at.most(5);')
request("Список: сортировка по ФИО", "GET", "/employees?sortBy=fullName&order=asc&limit=50", "Успешный ответ, записи отсортированы по ФИО", 200,
        tests='pm.expect(pm.response.json().data.length).to.be.above(0);')
request("Список: сортировка по полю связанной таблицы", "GET", "/employees?sortBy=category.hourlyRate&order=desc", "Сортировка по ставке категории", 200)
request("Список: фильтр по нескольким полям", "GET", "/employees?categoryId={{categoryId}}&birthFrom=1980-01-01&birthTo=2000-12-31", "Категория совпадает и дата рождения в диапазоне", 200,
        tests='const d = pm.response.json().data; pm.expect(d.length).to.be.above(0); d.forEach(e => { pm.expect(e.categoryId).to.eql(Number(pm.collectionVariables.get("categoryId"))); pm.expect(e.birthDate.slice(0,10) >= "1980-01-01" && e.birthDate.slice(0,10) <= "2000-12-31").to.be.true; });')
request("Список: поиск по нескольким полям", "GET", "/employees?search=тестов", "Поиск без учёта регистра по ФИО, паспорту, телефону", 200,
        tests='const d = pm.response.json().data; pm.expect(d.length).to.be.above(0); d.forEach(e => pm.expect(e.fullName.toLowerCase()).to.include("тестов"));')
request("Список: поиск + фильтр + сортировка + пагинация", "GET", "/employees?search=тестов&categoryId={{categoryId}}&sortBy=birthDate&order=desc&page=1&limit=10", "Параметры комбинируются", 200)
request("Детали по ID", "GET", "/employees/{{employeeId}}", "Сотрудник с категорией и числом работ", 200,
        tests='const b = pm.response.json(); pm.expect(b).to.have.property("category"); pm.expect(b._count).to.have.property("works");')
request("Детали: записи нет", "GET", "/employees/999999", "404", 404)
request("Существование: HEAD", "HEAD", "/employees/{{employeeId}}", "200", 200)
request("Существование: GET /exists (нет записи)", "GET", "/employees/999999/exists", "200, `exists: false`", 200,
        tests='pm.expect(pm.response.json().exists).to.be.false;')
request("Обновление (PUT)", "PUT", "/employees/{{employeeId}}", "Телефон изменён", 200,
        body={"workPhone": "+375 44 999-88-77"}, tests='pm.expect(pm.response.json().workPhone).to.eql("+375 44 999-88-77");')
request("Обновление (PATCH): невалидное значение", "PATCH", "/employees/{{employeeId}}", "400, данные не сохранены", 400,
        body={"workPhone": "abc"})

folder("4. Предприятия")
request("Создание предприятия", "POST", "/companies", "Запись создана", 201,
        body={"name": "ООО «Тест-Аудит {{$timestamp}}»", "address": "г. Минск, ул. Тестовая, 1", "phone": "+375 17 123-45-67"},
        tests=SAVE("companyId"))
request("Создание: слишком короткий адрес", "POST", "/companies", "400, ошибка по `address`", 400,
        body={"name": "ООО «Ошибка»", "address": "1", "phone": "+375 17 123-45-67"},
        tests='pm.expect(pm.response.json().details.some(x => x.path === "address")).to.be.true;')
request("Список: фильтр по адресу и поиск", "GET", "/companies?address=Минск&search=тест", "Совпадение по адресу и названию", 200,
        tests='pm.response.json().data.forEach(c => pm.expect(c.address).to.include("Минск"));')
request("Список: сортировка и пагинация", "GET", "/companies?sortBy=name&order=desc&page=1&limit=3", "Не более 3 записей, сортировка по названию (убывание)", 200,
        tests='const b = pm.response.json(); pm.expect(b.data.length).to.be.at.most(3); pm.expect(b.limit).to.eql(3);')
request("Детали по ID", "GET", "/companies/{{companyId}}", "Предприятие найдено", 200)
request("Детали: записи нет", "GET", "/companies/999999", "404", 404)
request("Существование: HEAD", "HEAD", "/companies/{{companyId}}", "200", 200)
request("Обновление", "PUT", "/companies/{{companyId}}", "Адрес изменён", 200, body={"address": "г. Минск, ул. Новая, 5"},
        tests='pm.expect(pm.response.json().address).to.eql("г. Минск, ул. Новая, 5");')

folder("5. Работы")
request("Создание работы", "POST", "/works", "Запись создана", 201,
        body={"employeeId": "{{employeeId}}", "companyId": "{{companyId}}", "workDate": "2025-03-03", "hoursWorked": 8},
        tests=SAVE("workId") + '\npm.expect(pm.response.json().hoursWorked).to.eql(8);')
request("Создание: часы больше 24", "POST", "/works", "400, ошибка по `hoursWorked`", 400,
        body={"employeeId": "{{employeeId}}", "companyId": "{{companyId}}", "workDate": "2025-03-04", "hoursWorked": 25})
request("Создание: дата в будущем", "POST", "/works", "400, ошибка по `workDate`", 400,
        body={"employeeId": "{{employeeId}}", "companyId": "{{companyId}}", "workDate": "2999-01-01", "hoursWorked": 5})
request("Создание: за день больше 24 часов (кастомный валидатор)", "POST", "/works", "400 — у сотрудника уже 8 ч. за этот день, 8 + 17 > 24", 400,
        body={"employeeId": "{{employeeId}}", "companyId": "{{companyId}}", "workDate": "2025-03-03", "hoursWorked": 17},
        tests='pm.expect(pm.response.json().message).to.include("валидации");\npm.expect(pm.response.json().details[0].message).to.include("за день");')
request("Создание: несуществующий сотрудник", "POST", "/works", "400 — внешний ключ не найден", 400,
        body={"employeeId": 999999, "companyId": "{{companyId}}", "workDate": "2025-03-04", "hoursWorked": 4})
request("Список: пагинация", "GET", "/works?page=1&limit=5", "До 5 записей, подгружены сотрудник и предприятие", 200,
        tests='const b = pm.response.json(); pm.expect(b.data.length).to.be.at.most(5); pm.expect(b.data[0]).to.have.property("employee"); pm.expect(b.data[0]).to.have.property("company");')
request("Список: сортировка по ФИО сотрудника", "GET", "/works?sortBy=employee.fullName&order=asc&limit=50", "Сортировка по вложенному полю", 200)
request("Список: фильтр по нескольким полям", "GET", "/works?employeeId={{employeeId}}&companyId={{companyId}}&dateFrom=2025-01-01&dateTo=2025-12-31&hoursMin=4&hoursMax=10", "Все условия выполняются одновременно", 200,
        tests='const d = pm.response.json().data; pm.expect(d.length).to.be.above(0); d.forEach(w => { pm.expect(w.employeeId).to.eql(Number(pm.collectionVariables.get("employeeId"))); pm.expect(w.hoursWorked).to.be.within(4, 10); });')
request("Список: поиск по сотруднику и предприятию", "GET", "/works?search=тест", "Совпадение по ФИО сотрудника или названию предприятия", 200,
        tests='pm.expect(pm.response.json().data.length).to.be.above(0);')
request("Детали по ID", "GET", "/works/{{workId}}", "Работа с сотрудником (и его категорией) и предприятием", 200,
        tests='const b = pm.response.json(); pm.expect(b.employee).to.have.property("category"); pm.expect(b.company).to.have.property("address");')
request("Детали: записи нет", "GET", "/works/999999", "404", 404)
request("Существование: GET /exists", "GET", "/works/{{workId}}/exists", "`exists: true`", 200, tests='pm.expect(pm.response.json().exists).to.be.true;')
request("Обновление работы", "PUT", "/works/{{workId}}", "Часы изменены (проверка лимита учитывает саму запись)", 200,
        body={"hoursWorked": 6}, tests='pm.expect(pm.response.json().hoursWorked).to.eql(6);')

folder("6. Отчёт")
request("Ведомость начислений за год", "GET", "/reports/payroll?year=2025", "Группировка по предприятиям, итоги = сумме строк", 200,
        tests='const b = pm.response.json(); let sum = 0; b.companies.forEach(c => { c.rows.forEach(r => pm.expect(r.accrued).to.be.closeTo(r.hoursWorked * r.hourlyRate, 0.011)); sum += c.totalAccrued; }); pm.expect(b.totalAccrued).to.be.closeTo(sum, 0.011);')
request("Ведомость: некорректный месяц", "GET", "/reports/payroll?year=2025&month=13", "400", 400)

folder("7. Проверка прав")
request("DELETE сущности как user", "DELETE", "/works/{{workId}}", "403", 403, auth="userToken")
request("Обновление сущности как user", "PATCH", "/categories/{{categoryId}}", "200 (право user на изменение)", 200,
        auth="userToken",
        body={"hourlyRate": 41})

folder("8. Удаление и целостность")
request("Удаление категории с сотрудниками", "DELETE", "/categories/{{categoryId}}", "409 — нельзя удалить, есть сотрудники", 409,
        tests='pm.expect(pm.response.json().message).to.include("Невозможно удалить");')
request("Удаление сотрудника с работами", "DELETE", "/employees/{{employeeId}}", "409 — нельзя удалить, есть работы", 409,
        tests='pm.expect(pm.response.json().message).to.include("Невозможно удалить");')
request("Удаление предприятия с работами", "DELETE", "/companies/{{companyId}}", "409 — нельзя удалить, есть работы", 409)
request("Удаление работы", "DELETE", "/works/{{workId}}", "200, запись удалена", 200)
request("Повторное удаление работы", "DELETE", "/works/{{workId}}", "404 — записи уже нет", 404)
request("Проверка существования после удаления", "GET", "/works/{{workId}}/exists", "`exists: false`", 200, tests='pm.expect(pm.response.json().exists).to.be.false;')
request("Удаление сотрудника (фото) без работ", "DELETE", "/employees/{{employee2Id}}", "200 (если запрос «Создание с фото» выполнялся)", 200)
request("Удаление сотрудника", "DELETE", "/employees/{{employeeId}}", "200", 200)
request("Удаление предприятия", "DELETE", "/companies/{{companyId}}", "200", 200)
request("Удаление категории", "DELETE", "/categories/{{categoryId}}", "200", 200)

folder("9. Количество записей")
SAVE_TOTAL = lambda var: f'pm.collectionVariables.set("{var}", pm.response.json().total);'
request("Итоги: категории", "GET", "/categories?limit=1", "total сохранён", 200, tests=SAVE_TOTAL("cntCategories"))
request("Итоги: предприятия", "GET", "/companies?limit=1", "total сохранён", 200, tests=SAVE_TOTAL("cntCompanies"))
request("Итоги: сотрудники", "GET", "/employees?limit=1", "total сохранён", 200, tests=SAVE_TOTAL("cntEmployees"))
request("Итоги: работы", "GET", "/works?limit=1", "total сохранён", 200, tests=SAVE_TOTAL("cntWorks"))
request("Итоги: пользователи", "GET", "/users?limit=1", "total сохранён", 200, tests=SAVE_TOTAL("cntUsers"))
request("Суммарно не менее 50 записей", "GET", "/users?limit=1",
        "сумма `total` по всем разделам ≥ 50 (предметные + роли и пользователи)", 200,
        tests='const sum = Number(pm.collectionVariables.get("cntCategories")) + Number(pm.collectionVariables.get("cntCompanies")) + Number(pm.collectionVariables.get("cntEmployees")) + Number(pm.collectionVariables.get("cntWorks")) + Number(pm.collectionVariables.get("cntUsers")); pm.expect(sum).to.be.at.least(50);')

collection = {
    "info": {
        "name": "Аудит — REST API",
        "description": "Тесты ЛР №7-8, вариант 4. Перед запуском выполните `bun run db:seed` (или `db:seed-users`). Запускать папки по порядку (Collection Runner), каждый запрос содержит автотесты. Переменная `resetToken` заполняется вручную из консоли сервера (запрос «Восстановление пароля: запрос ссылки»).",
        "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json",
    },
    "auth": {"type": "bearer", "bearer": [{"key": "token", "value": "{{token}}", "type": "string"}]},
    "variable": [
        {"key": "baseUrl", "value": "http://localhost:4000/api"},
        {"key": "token", "value": ""},
        {"key": "userToken", "value": ""},
        {"key": "testToken", "value": ""},
        {"key": "refreshToken", "value": ""},
        {"key": "userRefreshToken", "value": ""},
        {"key": "testRefreshToken", "value": ""},
        {"key": "usedRefreshToken", "value": ""},
        {"key": "resetToken", "value": ""},
        {"key": "adminId", "value": ""},
        {"key": "testUserId", "value": ""},
    ],
    "item": folders,
}
with open("audit-api.postman_collection.json", "w", encoding="utf-8") as f:
    json.dump(collection, f, ensure_ascii=False, indent=2)

lines = []
last = None
n = 0
for fol, name, req, exp in scenarios:
    if fol != last:
        lines.append(f"\n#### {fol}\n")
        lines.append("| № | Сценарий | Запрос | Ожидаемый результат |")
        lines.append("|---|---|---|---|")
        last = fol
    n += 1
    lines.append(f"| {n} | {name} | `{req}` | {exp} |")
with open("scenarios.md", "w", encoding="utf-8") as f:
    f.write("\n".join(lines) + "\n")
print("requests:", n)
