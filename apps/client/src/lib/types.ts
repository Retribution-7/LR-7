export interface Paged<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

export interface Category {
  id: number;
  name: string;
  hourlyRate: number;
  _count?: { employees: number };
}

export interface Employee {
  id: number;
  fullName: string;
  passportNumber: string;
  birthDate: string;
  workPhone: string;
  photo: string | null;
  categoryId: number;
  category?: Category;
  _count?: { works: number };
}

export interface Company {
  id: number;
  name: string;
  address: string;
  phone: string;
  photo: string | null;
  _count?: { works: number };
}

export interface Work {
  id: number;
  employeeId: number;
  companyId: number;
  workDate: string;
  hoursWorked: number;
  employee?: Pick<Employee, 'id' | 'fullName'> & Partial<Employee>;
  company?: Pick<Company, 'id' | 'name'> & Partial<Company>;
}

export interface PayrollRow {
  workId: number;
  employee: string;
  category: string;
  hourlyRate: number;
  workDate: string;
  hoursWorked: number;
  accrued: number;
}

export interface PayrollReport {
  year: number | null;
  month: number | null;
  companies: {
    company: { id: number; name: string };
    rows: PayrollRow[];
    totalHours: number;
    totalAccrued: number;
  }[];
  totalHours: number;
  totalAccrued: number;
}
