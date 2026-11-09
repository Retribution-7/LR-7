import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { FormField } from '@/components/FormField';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { ApiError } from '@/lib/api';
import { applyServerErrors } from '@/lib/forms';
import { toNumber, workFormSchema, type WorkFormValues } from '@/lib/schemas';
import type { Work } from '@/lib/types';
import { toInputDate } from '@/lib/utils';
import { useWorksStore } from '@/stores/entityStore';
import { useLookups } from '@/stores/lookups';
import { notifyError } from '@/stores/notify';

const empty: WorkFormValues = { employeeId: '', companyId: '', workDate: '', hoursWorked: '' };

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  item?: Work | null;
  /** предзаполнение при создании (например, со страницы сотрудника) */
  preset?: Partial<WorkFormValues>;
  onSaved?: () => void;
}

export function WorkFormDialog({ open, onOpenChange, item, preset, onSaved }: Props) {
  const save = useWorksStore((s) => s.save);
  const employees = useLookups((s) => s.employees);
  const companies = useLookups((s) => s.companies);

  const { register, control, handleSubmit, reset, setError, formState: { errors, isSubmitting } } = useForm<WorkFormValues>({
    resolver: zodResolver(workFormSchema),
    defaultValues: empty,
  });

  useEffect(() => {
    if (!open) return;
    reset(
      item
        ? {
            employeeId: String(item.employeeId),
            companyId: String(item.companyId),
            workDate: toInputDate(item.workDate),
            hoursWorked: String(item.hoursWorked),
          }
        : { ...empty, ...preset },
    );
  }, [open, item, preset, reset]);

  const onSubmit = handleSubmit(async (v) => {
    try {
      await save(item?.id ?? null, {
        employeeId: Number(v.employeeId),
        companyId: Number(v.companyId),
        workDate: v.workDate,
        hoursWorked: toNumber(v.hoursWorked),
      });
      onSaved?.();
      onOpenChange(false);
    } catch (e) {
      const err = e as ApiError;
      if (!applyServerErrors(err, setError, ['employeeId', 'companyId', 'workDate', 'hoursWorked'])) {
        notifyError('Не удалось сохранить', err.message);
      }
    }
  });

  const pickList = (name: 'employeeId' | 'companyId', options: { value: string; label: string }[], placeholder: string) => (
    <Controller
      control={control}
      name={name}
      render={({ field }) => (
        <Select value={field.value || undefined} onValueChange={field.onChange}>
          <SelectTrigger id={name} aria-invalid={!!errors[name]}>
            <SelectValue placeholder={placeholder} />
          </SelectTrigger>
          <SelectContent>
            {options.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    />
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{item ? 'Редактирование работы' : 'Новая работа'}</DialogTitle>
          <DialogDescription>Проверка предприятия сотрудником в указанный день.</DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} noValidate className="space-y-4">
          <FormField label="Сотрудник" htmlFor="employeeId" error={errors.employeeId?.message}>
            {pickList('employeeId', employees.map((e) => ({ value: String(e.id), label: e.fullName })), 'Выберите сотрудника')}
          </FormField>
          <FormField label="Предприятие" htmlFor="companyId" error={errors.companyId?.message}>
            {pickList('companyId', companies.map((c) => ({ value: String(c.id), label: c.name })), 'Выберите предприятие')}
          </FormField>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Дата работы" htmlFor="workDate" error={errors.workDate?.message}>
              <Input id="workDate" type="date" aria-invalid={!!errors.workDate} {...register('workDate')} />
            </FormField>
            <FormField label="Отработано часов" htmlFor="hoursWorked" error={errors.hoursWorked?.message}>
              <Input id="hoursWorked" inputMode="decimal" placeholder="8" aria-invalid={!!errors.hoursWorked} {...register('hoursWorked')} />
            </FormField>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Отмена</Button>
            <Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Сохранение…' : 'Сохранить'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
