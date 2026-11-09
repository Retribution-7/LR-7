import { createCrudRouter } from './crud';

export const categoriesRouter = createCrudRouter({
  model: 'category',
  label: 'Категория',
  searchFields: ['name'],
  sortFields: ['id', 'name', 'hourlyRate'],
  defaultSort: 'id',
  filters: [
    { param: 'rateMin', field: 'hourlyRate', type: 'number', op: 'gte' },
    { param: 'rateMax', field: 'hourlyRate', type: 'number', op: 'lte' },
  ],
  include: { _count: { select: { employees: true } } },
  deleteConflictMessage: 'Невозможно удалить категорию: у неё есть сотрудники',
});

export const employeesRouter = createCrudRouter({
  model: 'employee',
  label: 'Сотрудник',
  searchFields: ['fullName', 'passportNumber', 'workPhone'],
  sortFields: ['id', 'fullName', 'birthDate', 'passportNumber', 'category.name', 'category.hourlyRate'],
  defaultSort: 'id',
  filters: [
    { param: 'categoryId', field: 'categoryId', type: 'int', op: 'equals' },
    { param: 'birthFrom', field: 'birthDate', type: 'date', op: 'gte' },
    { param: 'birthTo', field: 'birthDate', type: 'date', op: 'lte' },
  ],
  include: { category: true },
  detailInclude: { category: true, _count: { select: { works: true } } },
  hasPhoto: true,
  deleteConflictMessage: 'Невозможно удалить сотрудника: у него есть выполненные работы',
});

export const companiesRouter = createCrudRouter({
  model: 'company',
  label: 'Предприятие',
  searchFields: ['name', 'address', 'phone'],
  sortFields: ['id', 'name', 'address'],
  defaultSort: 'id',
  filters: [{ param: 'address', field: 'address', type: 'string', op: 'contains' }],
  include: { _count: { select: { works: true } } },
  hasPhoto: true,
  deleteConflictMessage: 'Невозможно удалить предприятие: по нему есть выполненные работы',
});

export const worksRouter = createCrudRouter({
  model: 'work',
  label: 'Работа',
  searchFields: ['employee.fullName', 'company.name'],
  sortFields: ['id', 'workDate', 'hoursWorked', 'employee.fullName', 'company.name'],
  defaultSort: 'id',
  filters: [
    { param: 'employeeId', field: 'employeeId', type: 'int', op: 'equals' },
    { param: 'companyId', field: 'companyId', type: 'int', op: 'equals' },
    { param: 'dateFrom', field: 'workDate', type: 'date', op: 'gte' },
    { param: 'dateTo', field: 'workDate', type: 'date', op: 'lte' },
    { param: 'hoursMin', field: 'hoursWorked', type: 'number', op: 'gte' },
    { param: 'hoursMax', field: 'hoursWorked', type: 'number', op: 'lte' },
  ],
  include: {
    employee: { select: { id: true, fullName: true } },
    company: { select: { id: true, name: true } },
  },
  detailInclude: { employee: { include: { category: true } }, company: true },
  deleteConflictMessage: 'Невозможно удалить работу',
});
