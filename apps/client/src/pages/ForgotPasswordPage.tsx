import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router-dom';
import { FormField } from '@/components/FormField';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { api, toApiError } from '@/lib/api';
import { forgotPasswordFormSchema, type ForgotPasswordFormValues } from '@/lib/schemas';
import { notifyError } from '@/stores/notify';

export default function ForgotPasswordPage() {
  const [sent, setSent] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordFormValues>({ resolver: zodResolver(forgotPasswordFormSchema) });

  const onSubmit = handleSubmit(async (v) => {
    try {
      await api.post('/auth/forgot-password', { username: v.username.trim() });
      setSent(true);
    } catch (e) {
      notifyError('Не удалось отправить запрос', toApiError(e).message);
    }
  });

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
      <div className="w-full max-w-sm rounded-lg border bg-card p-6 shadow-sm">
        <h1 className="mb-1 text-xl font-semibold">Восстановление пароля</h1>
        <p className="mb-4 text-sm text-muted-foreground">Укажите логин учётной записи</p>
        {sent ? (
          <div className="space-y-4">
            <p className="text-sm">
              Если указанный логин зарегистрирован, ссылка для восстановления отправлена.
            </p>
            <p className="text-sm text-muted-foreground">Ссылка выводится в консоль сервера.</p>
          </div>
        ) : (
          <form onSubmit={onSubmit} noValidate className="space-y-4">
            <FormField label="Логин" htmlFor="username" error={errors.username?.message}>
              <Input id="username" autoComplete="username" aria-invalid={!!errors.username} {...register('username')} />
            </FormField>
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? 'Отправка…' : 'Восстановить пароль'}
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
