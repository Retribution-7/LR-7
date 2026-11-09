import { Loader2, SearchX } from 'lucide-react';
import { Button } from './ui/button';

export function ListState({ loading, error, empty, onRetry, emptyText = 'Ничего не найдено. Измените условия поиска или добавьте запись.' }: {
  loading: boolean;
  error: string | null;
  empty: boolean;
  onRetry: () => void;
  emptyText?: string;
}) {
  if (error) {
    return (
      <div className="flex flex-col items-center gap-3 px-4 py-10 text-center" role="alert">
        <p className="text-sm text-destructive">{error}</p>
        <Button variant="outline" size="sm" onClick={onRetry}>Повторить</Button>
      </div>
    );
  }
  if (loading && empty) {
    return (
      <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Загрузка…
      </div>
    );
  }
  if (empty) {
    return (
      <div className="flex flex-col items-center gap-2 px-4 py-10 text-center text-sm text-muted-foreground">
        <SearchX className="h-6 w-6" />
        {emptyText}
      </div>
    );
  }
  return null;
}
