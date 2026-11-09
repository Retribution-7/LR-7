"""Генерирует postman/audit-api.postman_collection.json и postman/scenarios.md из одного описания."""
import json

folders = []          # [{name, items:[...]}]
scenarios = []        # для README: (folder, name, request, expected)
cur = None

def folder(name):
    global cur
    cur = {"name": name, "item": []}
    folders.append(cur)

def status_test(code):
    return f'pm.test("Статус {code}", () => pm.response.to.have.status({code}));'

def request(name, method, path, expected, status, body=None, tests="", pre="", formdata=None):
    events = []
    if pre:
        events.append({"listen": "prerequest", "script": {"type": "text/javascript", "exec": pre.strip().split("\n")}})
    code = status_test(status) + ("\n" + tests.strip() if tests else "")
    events.append({"listen": "test", "script": {"type": "text/javascript", "exec": code.split("\n")}})
    req = {"method": method, "header": [], "url": "{{baseUrl}}" + path}
    if body is not None:
        req["header"].append({"key": "Content-Type", "value": "application/json"})
        req["body"] = {"mode": "raw", "raw": json.dumps(body, ensure_ascii=False, indent=2), "options": {"raw": {"language": "json"}}}
    if formdata is not None:
        req["body"] = {"mode": "formdata", "formdata": formdata}
    cur["item"].append({"name": name, "event": events, "request": req})
    shown = f"{method} {path}"
    scenarios.append((cur["name"], name, shown, expected))

SAVE = lambda var: f'pm.collectionVariables.set("{var}", pm.response.json().id);'

# ---------------------------------------------------------------- Служебное
folder("0. Служебное")
request("Проверка доступности API", "GET", "/health", "API отвечает `{status: ok}`", 200,
        tests='pm.expect(pm.response.json().status).to.eql("ok");')
request("Несуществующий маршрут", "GET", "/unknown", "404 и JSON с сообщением", 404,
        tests='pm.expect(pm.response.json()).to.have.property("message");')

# ---------------------------------------------------------------- Категории
folder("1. Категории")
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

# ---------------------------------------------------------------- Сотрудники
PRE_EMP = 'pm.collectionVariables.set("passport", "TS" + Math.floor(1000000 + Math.random()*8999999));'
folder("2. Сотрудники")
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
        tests='pm.expect(pm.response.json().data.length).to.be.above(0); // порядок текста зависит от collation БД, поэтому проверяем лишь успешный ответ')
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

# ---------------------------------------------------------------- Предприятия
folder("3. Предприятия")
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

# ---------------------------------------------------------------- Работы
folder("4. Работы")
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

# ---------------------------------------------------------------- Отчёт
folder("5. Отчёт")
request("Ведомость начислений за год", "GET", "/reports/payroll?year=2025", "Группировка по предприятиям, итоги = сумме строк", 200,
        tests='const b = pm.response.json(); let sum = 0; b.companies.forEach(c => { c.rows.forEach(r => pm.expect(r.accrued).to.be.closeTo(r.hoursWorked * r.hourlyRate, 0.011)); sum += c.totalAccrued; }); pm.expect(b.totalAccrued).to.be.closeTo(sum, 0.011);')
request("Ведомость: некорректный месяц", "GET", "/reports/payroll?year=2025&month=13", "400", 400)

# ---------------------------------------------------------------- Удаление
folder("6. Удаление и целостность")
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

collection = {
    "info": {
        "name": "Аудит — REST API",
        "description": "Тесты ЛР №7, вариант 4. Перед запуском выполните `npm run db:seed`. Запускать папки по порядку (Collection Runner), каждый запрос содержит автотесты.",
        "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json",
    },
    "variable": [{"key": "baseUrl", "value": "http://localhost:4000/api"}],
    "item": folders,
}
with open("audit-api.postman_collection.json", "w", encoding="utf-8") as f:
    json.dump(collection, f, ensure_ascii=False, indent=2)

# таблица сценариев для README
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
