import { Navigate, Route, Routes } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { Toaster } from '@/components/ui/toaster';
import CategoriesPage from '@/pages/CategoriesPage';
import CompaniesPage from '@/pages/CompaniesPage';
import CompanyDetailPage from '@/pages/CompanyDetailPage';
import EmployeeDetailPage from '@/pages/EmployeeDetailPage';
import EmployeesPage from '@/pages/EmployeesPage';
import NotFoundPage from '@/pages/NotFoundPage';
import ReportPage from '@/pages/ReportPage';
import WorksPage from '@/pages/WorksPage';

export default function App() {
  return (
    <>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Navigate to="/employees" replace />} />
          <Route path="employees" element={<EmployeesPage />} />
          <Route path="employees/:id" element={<EmployeeDetailPage />} />
          <Route path="companies" element={<CompaniesPage />} />
          <Route path="companies/:id" element={<CompanyDetailPage />} />
          <Route path="works" element={<WorksPage />} />
          <Route path="categories" element={<CategoriesPage />} />
          <Route path="report" element={<ReportPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
      <Toaster />
    </>
  );
}
