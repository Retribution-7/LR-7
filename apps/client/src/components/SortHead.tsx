import { ArrowDown, ArrowUp } from 'lucide-react';
import { TH } from './ui/table';

interface Props {
  label: string;
  field: string;
  sortBy: string;
  order: 'asc' | 'desc';
  onSort: (sortBy: string, order: 'asc' | 'desc') => void;
  className?: string;
}

export function SortHead({ label, field, sortBy, order, onSort, className }: Props) {
  const active = sortBy === field;
  return (
    <TH className={className} aria-sort={active ? (order === 'asc' ? 'ascending' : 'descending') : 'none'}>
      <button
        className="inline-flex items-center gap-1 hover:text-foreground"
        onClick={() => onSort(field, active && order === 'asc' ? 'desc' : 'asc')}
      >
        {label}
        {active && (order === 'asc' ? <ArrowUp className="h-3.5 w-3.5" /> : <ArrowDown className="h-3.5 w-3.5" />)}
      </button>
    </TH>
  );
}
