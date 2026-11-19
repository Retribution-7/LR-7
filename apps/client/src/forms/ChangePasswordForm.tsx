import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { FormField } from '@/components/FormField';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { ApiError } from '@/lib/api';
import { applyServerErrors } from '@/lib/forms';
import { changePasswordFormSchema, type ChangePasswordFormValues } from '@/lib/schemas';
import { useAuthStore } from '@/stores/authStore';
import { notifyError, notifySuccess } from '@/stores/notify';

export function ChangePasswordForm() {
  const changePassword = useAuthStore((s) => s.changePassword);
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<ChangePasswordFormValues>({ resolver: zodResolver(changePasswordFormSchema) });

  const onSubmit = handleSubmit(async (v) => {
    try {
      await changePassword(v.oldPassword, v.newPassword);
      notifySuccess('Пароль изменён');
      reset();
    } catch (e) {
      const err = e as ApiError;
      if (!applyServerErrors(err, setError, ['oldPassword', 'newPassword', 'confirmPassword'])) {
        notifyError('Не удалось изменить пароль', err.message);
      }
    }
  });

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      <FormField label="Текущий пароль" htmlFor="oldPassword" error={errors.oldPassword?.message}>
        <Input id="oldPassword" type="password" autoComplete="current-password" aria-invalid={!!errors.oldPassword} {...register('oldPassword')} />
      </FormField>
      <FormField label="Новый пароль" htmlFor="newPassword" error={errors.newPassword?.message}>
        <Input id="newPassword" type="password" autoComplete="new-password" aria-invalid={!!errors.newPassword} {...register('newPassword')} />
      </FormField>
      <FormField label="Подтверждение пароля" htmlFor="confirmPassword" error={errors.confirmPassword?.message}>
        <Input id="confirmPassword" type="password" autoComplete="new-password" aria-invalid={!!errors.confirmPassword} {...register('confirmPassword')} />
      </FormField>
      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Сохранение…' : 'Сменить пароль'}
      </Button>
    </form>
  );
}
