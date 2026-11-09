import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { FormField } from '@/components/FormField';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import type { ApiError } from '@/lib/api';
import { applyServerErrors } from '@/lib/forms';
import { categoryFormSchema, toNumber, type CategoryFormValues } from '@/lib/schemas';
import type { Category } from '@/lib/types';
import { notifyError } from '@/stores/notify';
import { useCategoriesStore } from '@/stores/entityStore';

const empty: CategoryFormValues = { name: '', hourlyRate: '' };

export function CategoryFormDialog({ open, onOpenChange, item }: { open: boolean; onOpenChange: (o: boolean) => void; item?: Category | null }) {
  const save = useCategoriesStore((s) => s.save);
  const { register, handleSubmit, reset, setError, formState: { errors, isSubmitting } } = useForm<CategoryFormValues>({
    resolver: zodResolver(categoryFormSchema),
    defaultValues: empty,
  });

  useEffect(() => {
    if (open) reset(item ? { name: item.name, hourlyRate: String(item.hourlyRate) } : empty);
  }, [open, item, reset]);

  const onSubmit = handleSubmit(async (v) => {
    try {
      await save(item?.id ?? null, { name: v.name.trim(), hourlyRate: toNumber(v.hourlyRate) });
      onOpenChange(false);
    } catch (e) {
      const err = e as ApiError;
      if (!applyServerErrors(err, setError, ['name', 'hourlyRate'])) notifyError('Не удалось сохранить', err.message);
    }
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{item ? 'Редактирование категории' : 'Новая категория'}</DialogTitle>
          <DialogDescription>Категория определяет почасовую ставку сотрудника.</DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} noValidate className="space-y-4">
          <FormField label="Название" htmlFor="name" error={errors.name?.message}>
            <Input id="name" placeholder="1-я категория" aria-invalid={!!errors.name} {...register('name')} />
          </FormField>
          <FormField label="Ставка за 1 час, тыс. руб." htmlFor="hourlyRate" error={errors.hourlyRate?.message}>
            <Input id="hourlyRate" inputMode="decimal" placeholder="30" aria-invalid={!!errors.hourlyRate} {...register('hourlyRate')} />
          </FormField>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Отмена</Button>
            <Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Сохранение…' : 'Сохранить'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
