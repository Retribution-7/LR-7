import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { FormField } from '@/components/FormField';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { ApiError } from '@/lib/api';
import { applyServerErrors } from '@/lib/forms';
import { registerFormSchema, type RegisterFormValues } from '@/lib/schemas';
import { useAuthStore } from '@/stores/authStore';
import { notifyError, notifySuccess } from '@/stores/notify';

export default function RegisterPage() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const registerUser = useAuthStore((s) => s.register);
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormValues>({ resolver: zodResolver(registerFormSchema) });

  if (user) return <Navigate to="/employees" replace />;

  const onSubmit = handleSubmit(async (v) => {
    setFormError(null);
    try {
      await registerUser(v.username.trim().toLowerCase(), v.password);
      notifySuccess('Регистрация выполнена');
      navigate('/employees', { replace: true });
    } catch (e) {
      const err = e as ApiError;
      if (!applyServerErrors(err, setError, ['username', 'password', 'confirmPassword'])) setFormError(err.message);
    }
  });

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
      <div className="w-full max-w-sm rounded-lg border bg-card p-6 shadow-sm">
        <h1 className="mb-1 text-xl font-semibold">Регистрация</h1>
        <p className="mb-4 text-sm text-muted-foreground">Создание учётной записи пользователя</p>
        <form onSubmit={onSubmit} noValidate className="space-y-4">
          <FormField label="Логин" htmlFor="username" error={errors.username?.message}>
            <Input id="username" autoComplete="username" aria-invalid={!!errors.username} {...register('username')} />
          </FormField>
          <FormField label="Пароль" htmlFor="password" error={errors.password?.message}>
            <Input id="password" type="password" autoComplete="new-password" aria-invalid={!!errors.password} {...register('password')} />
          </FormField>
          <FormField label="Подтверждение пароля" htmlFor="confirmPassword" error={errors.confirmPassword?.message}>
            <Input id="confirmPassword" type="password" autoComplete="new-password" aria-invalid={!!errors.confirmPassword} {...register('confirmPassword')} />
          </FormField>
          {formError && (
            <p role="alert" className="text-sm text-destructive">
              {formError}
            </p>
          )}
          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? 'Регистрация…' : 'Зарегистрироваться'}
          </Button>
        </form>
        <div className="mt-4 text-sm">
          <Link to="/login" className="text-primary hover:underline">
            Уже есть учётная запись? Войти
          </Link>
        </div>
      </div>
    </div>
  );
}
