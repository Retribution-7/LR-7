import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from './ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';

interface Props {
  page: number;
  pages: number;
  total: number;
  limit: number;
  onPage: (p: number) => void;
  onLimit: (l: number) => void;
}

export function Pagination({ page, pages, total, limit, onPage, onLimit }: Props) {
  const from = total === 0 ? 0 : (page - 1) * limit + 1;
  const to = Math.min(page * limit, total);
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t px-3 py-3 text-sm">
      <span className="tnum text-muted-foreground">
        {from}–{to} из {total}
      </span>
      <div className="flex items-center gap-2">
        <Select value={String(limit)} onValueChange={(v) => onLimit(Number(v))}>
          <SelectTrigger className="h-8 w-20" aria-label="Записей на странице">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {[10, 20, 50].map((n) => (
              <SelectItem key={n} value={String(n)}>
                {n}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button variant="outline" size="icon" disabled={page <= 1} onClick={() => onPage(page - 1)} aria-label="Предыдущая страница">
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="tnum min-w-[4.5rem] text-center">
          {page} / {pages}
        </span>
        <Button variant="outline" size="icon" disabled={page >= pages} onClick={() => onPage(page + 1)} aria-label="Следующая страница">
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
