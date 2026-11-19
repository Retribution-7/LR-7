import { ArrowDownAZ, ArrowUpAZ, RotateCcw, Search } from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';

interface Props {
  search: string;
  onSearch: (v: string) => void;
  searchPlaceholder?: string;
  sortOptions: { value: string; label: string }[];
  sortBy: string;
  order: 'asc' | 'desc';
  onSort: (sortBy: string, order: 'asc' | 'desc') => void;
  onReset: () => void;
  children?: ReactNode; // фильтры конкретной страницы
}

export function ListToolbar({ search, onSearch, searchPlaceholder = 'Поиск', sortOptions, sortBy, order, onSort, onReset, children }: Props) {
  const [text, setText] = useState(search);
  useEffect(() => setText(search), [search]);
  useEffect(() => {
    if (text === search) return;
    const t = setTimeout(() => onSearch(text), 350);
    return () => clearTimeout(t);
  }, [text]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="mb-4 space-y-3 rounded-lg border bg-card p-3">
      <div className="flex flex-wrap gap-2">
        <div className="relative min-w-[12rem] flex-1">
          <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input value={text} onChange={(e) => setText(e.target.value)} placeholder={searchPlaceholder} className="pl-9" aria-label="Поиск" />
        </div>
        <div className="flex gap-2">
          <Select value={sortBy} onValueChange={(v) => onSort(v, order)}>
            <SelectTrigger className="w-48" aria-label="Сортировка">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {sortOptions.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="icon"
            className="h-9 w-9"
            onClick={() => onSort(sortBy, order === 'asc' ? 'desc' : 'asc')}
            aria-label={order === 'asc' ? 'По возрастанию' : 'По убыванию'}
            title={order === 'asc' ? 'По возрастанию' : 'По убыванию'}
          >
            {order === 'asc' ? <ArrowDownAZ className="h-4 w-4" /> : <ArrowUpAZ className="h-4 w-4" />}
          </Button>
        </div>
      </div>
      <div className="flex flex-wrap items-end gap-2">
        {children}
        <Button variant="ghost" size="sm" onClick={onReset} className="ml-auto">
          <RotateCcw className="h-3.5 w-3.5" /> Сбросить
        </Button>
      </div>
    </div>
  );
}

export function FilterItem({ label, children, className = 'w-40' }: { label: string; children: ReactNode; className?: string }) {
  return (
    <label className={`flex flex-col gap-1 text-xs text-muted-foreground ${className}`}>
      {label}
      {children}
    </label>
  );
}

export function SelectFilter({
  value,
  onChange,
  options,
  allLabel = 'Все',
  label,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  allLabel?: string;
  label: string;
}) {
  return (
    <Select value={value || 'all'} onValueChange={(v) => onChange(v === 'all' ? '' : v)}>
      <SelectTrigger aria-label={label}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">{allLabel}</SelectItem>
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
