import { useState } from 'react';
import { Button } from './ui/button';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
} from './ui/alert-dialog';

interface Props {
  open: boolean;
  title: string;
  description: string;
  onConfirm: () => Promise<unknown> | void;
  onClose: () => void;
}

export function ConfirmDelete({ open, title, description, onConfirm, onClose }: Props) {
  const [busy, setBusy] = useState(false);

  const confirm = async () => {
    setBusy(true);
    try {
      await onConfirm();
    } finally {
      setBusy(false);
      onClose();
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={(o) => !o && !busy && onClose()}>
      <AlertDialogContent>
        <AlertDialogTitle className="text-lg font-semibold">{title}</AlertDialogTitle>
        <AlertDialogDescription className="mt-2 text-sm text-muted-foreground">{description}</AlertDialogDescription>
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <AlertDialogCancel>Отмена</AlertDialogCancel>
          <Button variant="destructive" onClick={confirm} disabled={busy}>
            {busy ? 'Удаление…' : 'Удалить'}
          </Button>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  );
}
