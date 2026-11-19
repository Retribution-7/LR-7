import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { FormField } from '@/components/FormField';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { ApiError } from '@/lib/api';
import { applyServerErrors } from '@/lib/forms';
import { loginFormSchema, type LoginFormValues } from '@/lib/schemas';
import { useAuthStore } from '@/stores/authStore';
import { notifyError } from '@/stores/notify';

export default function LoginPage() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const login = useAuthStore((s) => s.login);
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({ resolver: zodResolver(loginFormSchema) });

  if (user) return <Navigate to="/employees" replace />;

  const onSubmit = handleSubmit(async (v) => {
    setFormError(null);
    try {
      await login(v.username.trim(), v.password);
      navigate('/employees', { replace: true });
    } catch (e) {
      const err = e as ApiError;
      if (!applyServerErrors(err, setError, ['username', 'password'])) setFormError(err.message);
    }
  });

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
      <div className="w-full max-w-sm rounded-lg border bg-card p-6 shadow-sm">
        <h1 className="mb-1 text-xl font-semibold">Вход в систему</h1>
        <p className="mb-4 text-sm text-muted-foreground">Учёт работ сотрудников аудиторской фирмы</p>
        <form onSubmit={onSubmit} noValidate className="space-y-4">
          <FormField label="Логин" htmlFor="username" error={errors.username?.message}>
            <Input id="username" autoComplete="username" aria-invalid={!!errors.username} {...register('username')} />
          </FormField>
          <FormField label="Пароль" htmlFor="password" error={errors.password?.message}>
            <Input id="password" type="password" autoComplete="current-password" aria-invalid={!!errors.password} {...register('password')} />
          </FormField>
          {formError && (
            <p role="alert" className="text-sm text-destructive">
              {formError}
            </p>
          )}
          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? 'Вход…' : 'Войти'}
          </Button>
        </form>
        <div className="mt-4 flex flex-col gap-1 text-sm">
          <Link to="/forgot-password" className="text-primary hover:underline">
            Забыли пароль?
          </Link>
          <Link to="/register" className="text-primary hover:underline">
            Нет учётной записи? Регистрация
          </Link>
        </div>
      </div>
    </div>
  );
}
