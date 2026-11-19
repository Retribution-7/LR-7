import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { FormField } from '@/components/FormField';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { ApiError } from '@/lib/api';
import { api, toApiError } from '@/lib/api';
import { applyServerErrors } from '@/lib/forms';
import { resetPasswordFormSchema, type ResetPasswordFormValues } from '@/lib/schemas';
import { notifySuccess } from '@/stores/notify';

export default function ResetPasswordPage() {
  const [params] = useSearchParams();
  const token = params.get('token');
  const navigate = useNavigate();
  const [tokenError, setTokenError] = useState(false);
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordFormValues>({ resolver: zodResolver(resetPasswordFormSchema) });

  const onSubmit = handleSubmit(async (v) => {
    try {
      await api.post('/auth/reset-password', { token, newPassword: v.newPassword });
      notifySuccess('Пароль восстановлен', 'Войдите с новым паролем');
      navigate('/login', { replace: true });
    } catch (e) {
      const err = e as ApiError;
      if (err.status === 400 && err.details?.some((d) => d.path === 'token')) {
        setTokenError(true);
        return;
      }
      if (!applyServerErrors(err, setError, ['newPassword', 'confirmPassword'])) setTokenError(true);
    }
  });

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
      <div className="w-full max-w-sm rounded-lg border bg-card p-6 shadow-sm">
        <h1 className="mb-1 text-xl font-semibold">Новый пароль</h1>
        <p className="mb-4 text-sm text-muted-foreground">Задайте новый пароль для учётной записи</p>
        {!token || tokenError ? (
          <div className="space-y-4">
            <p role="alert" className="text-sm text-destructive">
              Ссылка недействительна или истекла
            </p>
            <Link to="/forgot-password" className="text-sm text-primary hover:underline">
              Запросить новую ссылку
            </Link>
          </div>
        ) : (
          <form onSubmit={onSubmit} noValidate className="space-y-4">
            <FormField label="Новый пароль" htmlFor="newPassword" error={errors.newPassword?.message}>
              <Input id="newPassword" type="password" autoComplete="new-password" aria-invalid={!!errors.newPassword} {...register('newPassword')} />
            </FormField>
            <FormField label="Подтверждение пароля" htmlFor="confirmPassword" error={errors.confirmPassword?.message}>
              <Input id="confirmPassword" type="password" autoComplete="new-password" aria-invalid={!!errors.confirmPassword} {...register('confirmPassword')} />
            </FormField>
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? 'Сохранение…' : 'Сохранить пароль'}
            </Button>
          </form>
        )}
        <div className="mt-4 text-sm">
          <Link to="/login" className="text-primary hover:underline">
            Вернуться ко входу
          </Link>
        </div>
      </div>
    </div>
  );
}
