import { Eye, Pencil, Trash2 } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { Button } from './ui/button';

export function RowActions({ onView, onEdit, onDelete, name }: { onView?: () => void; onEdit: () => void; onDelete?: () => void; name: string }) {
  const isAdmin = useAuthStore((s) => s.user?.role === 'admin');

  return (
    <div className="flex justify-end gap-1">
      {onView && (
        <Button variant="ghost" size="icon" onClick={onView} aria-label={`Подробнее: ${name}`} title="Подробнее">
          <Eye className="h-4 w-4" />
        </Button>
      )}
      <Button variant="ghost" size="icon" onClick={onEdit} aria-label={`Изменить: ${name}`} title="Изменить">
        <Pencil className="h-4 w-4" />
      </Button>
      {isAdmin && onDelete && (
        <Button variant="ghost" size="icon" onClick={onDelete} aria-label={`Удалить: ${name}`} title="Удалить" className="text-destructive hover:text-destructive">
          <Trash2 className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}
