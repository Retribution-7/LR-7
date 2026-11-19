import { useEffect } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { RequireAuth } from '@/components/RequireAuth';
import { Toaster } from '@/components/ui/toaster';
import CategoriesPage from '@/pages/CategoriesPage';
import CompaniesPage from '@/pages/CompaniesPage';
import CompanyDetailPage from '@/pages/CompanyDetailPage';
import EmployeeDetailPage from '@/pages/EmployeeDetailPage';
import EmployeesPage from '@/pages/EmployeesPage';
import ForgotPasswordPage from '@/pages/ForgotPasswordPage';
import LoginPage from '@/pages/LoginPage';
import NotFoundPage from '@/pages/NotFoundPage';
import RegisterPage from '@/pages/RegisterPage';
import ReportPage from '@/pages/ReportPage';
import ResetPasswordPage from '@/pages/ResetPasswordPage';
import UsersPage from '@/pages/UsersPage';
import WorksPage from '@/pages/WorksPage';
import { useAuthStore } from '@/stores/authStore';

export default function App() {
  const init = useAuthStore((s) => s.init);

  useEffect(() => {
    void init();
  }, [init]);

  return (
    <>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />

        <Route
          element={
            <RequireAuth>
              <Layout />
            </RequireAuth>
          }
        >
          <Route index element={<Navigate to="/employees" replace />} />
          <Route path="employees" element={<EmployeesPage />} />
          <Route path="employees/:id" element={<EmployeeDetailPage />} />
          <Route path="companies" element={<CompaniesPage />} />
          <Route path="companies/:id" element={<CompanyDetailPage />} />
          <Route path="works" element={<WorksPage />} />
          <Route path="categories" element={<CategoriesPage />} />
          <Route path="report" element={<ReportPage />} />
          <Route
            path="users"
            element={
              <RequireAuth roles={['admin']}>
                <UsersPage />
              </RequireAuth>
            }
          />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
      <Toaster />
    </>
  );
}
