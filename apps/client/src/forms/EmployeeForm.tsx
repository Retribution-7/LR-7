import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { FormField } from '@/components/FormField';
import { PhotoField } from '@/components/PhotoField';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { ApiError } from '@/lib/api';
import { applyServerErrors } from '@/lib/forms';
import { employeeFormSchema, type EmployeeFormValues } from '@/lib/schemas';
import type { Employee } from '@/lib/types';
import { toInputDate } from '@/lib/utils';
import { useEmployeesStore } from '@/stores/entityStore';
import { useLookups } from '@/stores/lookups';
import { notifyError } from '@/stores/notify';

const empty: EmployeeFormValues = { fullName: '', passportNumber: '', birthDate: '', workPhone: '', categoryId: '' };

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  item?: Employee | null;
  onSaved?: () => void;
}

export function EmployeeFormDialog({ open, onOpenChange, item, onSaved }: Props) {
  const save = useEmployeesStore((s) => s.save);
  const categories = useLookups((s) => s.categories);
  const [file, setFile] = useState<File | null>(null);
  const [removePhoto, setRemovePhoto] = useState(false);

  const { register, control, handleSubmit, reset, setError, formState: { errors, isSubmitting } } = useForm<EmployeeFormValues>({
    resolver: zodResolver(employeeFormSchema),
    defaultValues: empty,
  });

  useEffect(() => {
    if (!open) return;
    reset(
      item
        ? {
            fullName: item.fullName,
            passportNumber: item.passportNumber,
            birthDate: toInputDate(item.birthDate),
            workPhone: item.workPhone,
            categoryId: String(item.categoryId),
          }
        : empty,
    );
    setFile(null);
    setRemovePhoto(false);
  }, [open, item, reset]);

  const onSubmit = handleSubmit(async (v) => {
    const fd = new FormData();
    fd.append('fullName', v.fullName.trim());
    fd.append('passportNumber', v.passportNumber.trim().toUpperCase());
    fd.append('birthDate', v.birthDate);
    fd.append('workPhone', v.workPhone.trim());
    fd.append('categoryId', v.categoryId);
    if (file) fd.append('photo', file);
    else if (removePhoto) fd.append('removePhoto', 'true');

    try {
      await save(item?.id ?? null, fd);
      onSaved?.();
      onOpenChange(false);
    } catch (e) {
      const err = e as ApiError;
      if (!applyServerErrors(err, setError, ['fullName', 'passportNumber', 'birthDate', 'workPhone', 'categoryId'])) {
        notifyError('Не удалось сохранить', err.message);
      }
    }
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{item ? 'Редактирование сотрудника' : 'Новый сотрудник'}</DialogTitle>
          <DialogDescription>Все поля, кроме фото, обязательны.</DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} noValidate className="space-y-4">
          <FormField label="Ф.И.О." htmlFor="fullName" error={errors.fullName?.message}>
            <Input id="fullName" placeholder="Иванов Андрей Сергеевич" aria-invalid={!!errors.fullName} {...register('fullName')} />
          </FormField>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Номер паспорта" htmlFor="passportNumber" error={errors.passportNumber?.message}>
              <Input id="passportNumber" placeholder="MP1234567" className="uppercase" aria-invalid={!!errors.passportNumber} {...register('passportNumber')} />
            </FormField>
            <FormField label="Дата рождения" htmlFor="birthDate" error={errors.birthDate?.message}>
              <Input id="birthDate" type="date" aria-invalid={!!errors.birthDate} {...register('birthDate')} />
            </FormField>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Рабочий телефон" htmlFor="workPhone" error={errors.workPhone?.message}>
              <Input id="workPhone" type="tel" placeholder="+375 29 123-45-67" aria-invalid={!!errors.workPhone} {...register('workPhone')} />
            </FormField>
            <FormField label="Категория" htmlFor="categoryId" error={errors.categoryId?.message}>
              <Controller
                control={control}
                name="categoryId"
                render={({ field }) => (
                  <Select value={field.value || undefined} onValueChange={field.onChange}>
                    <SelectTrigger id="categoryId" aria-invalid={!!errors.categoryId}>
                      <SelectValue placeholder="Выберите" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((c) => (
                        <SelectItem key={c.id} value={String(c.id)}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </FormField>
          </div>
          <PhotoField kind="person" currentPhoto={item?.photo} file={file} removePhoto={removePhoto} onFile={setFile} onRemove={setRemovePhoto} />
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Отмена</Button>
            <Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Сохранение…' : 'Сохранить'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
