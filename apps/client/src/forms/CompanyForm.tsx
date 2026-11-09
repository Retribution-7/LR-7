import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { FormField } from '@/components/FormField';
import { PhotoField } from '@/components/PhotoField';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import type { ApiError } from '@/lib/api';
import { applyServerErrors } from '@/lib/forms';
import { companyFormSchema, type CompanyFormValues } from '@/lib/schemas';
import type { Company } from '@/lib/types';
import { useCompaniesStore } from '@/stores/entityStore';
import { notifyError } from '@/stores/notify';

const empty: CompanyFormValues = { name: '', address: '', phone: '' };

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  item?: Company | null;
  onSaved?: () => void;
}

export function CompanyFormDialog({ open, onOpenChange, item, onSaved }: Props) {
  const save = useCompaniesStore((s) => s.save);
  const [file, setFile] = useState<File | null>(null);
  const [removePhoto, setRemovePhoto] = useState(false);

  const { register, handleSubmit, reset, setError, formState: { errors, isSubmitting } } = useForm<CompanyFormValues>({
    resolver: zodResolver(companyFormSchema),
    defaultValues: empty,
  });

  useEffect(() => {
    if (!open) return;
    reset(item ? { name: item.name, address: item.address, phone: item.phone } : empty);
    setFile(null);
    setRemovePhoto(false);
  }, [open, item, reset]);

  const onSubmit = handleSubmit(async (v) => {
    const fd = new FormData();
    fd.append('name', v.name.trim());
    fd.append('address', v.address.trim());
    fd.append('phone', v.phone.trim());
    if (file) fd.append('photo', file);
    else if (removePhoto) fd.append('removePhoto', 'true');

    try {
      await save(item?.id ?? null, fd);
      onSaved?.();
      onOpenChange(false);
    } catch (e) {
      const err = e as ApiError;
      if (!applyServerErrors(err, setError, ['name', 'address', 'phone'])) notifyError('Не удалось сохранить', err.message);
    }
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{item ? 'Редактирование предприятия' : 'Новое предприятие'}</DialogTitle>
          <DialogDescription>Предприятие, которое проверяют сотрудники фирмы.</DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} noValidate className="space-y-4">
          <FormField label="Название" htmlFor="name" error={errors.name?.message}>
            <Input id="name" placeholder="ООО «СтройГрад»" aria-invalid={!!errors.name} {...register('name')} />
          </FormField>
          <FormField label="Адрес" htmlFor="address" error={errors.address?.message}>
            <Input id="address" placeholder="г. Минск, пр-т Независимости, 58" aria-invalid={!!errors.address} {...register('address')} />
          </FormField>
          <FormField label="Телефон" htmlFor="phone" error={errors.phone?.message}>
            <Input id="phone" type="tel" placeholder="+375 17 234-56-78" aria-invalid={!!errors.phone} {...register('phone')} />
          </FormField>
          <PhotoField kind="company" currentPhoto={item?.photo} file={file} removePhoto={removePhoto} onFile={setFile} onRemove={setRemovePhoto} />
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Отмена</Button>
            <Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Сохранение…' : 'Сохранить'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
