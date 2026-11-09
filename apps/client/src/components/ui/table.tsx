import type { HTMLAttributes, TdHTMLAttributes, ThHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export const Table = ({ className, ...p }: HTMLAttributes<HTMLTableElement>) => (
  <div className="w-full overflow-x-auto">
    <table className={cn('w-full text-sm', className)} {...p} />
  </div>
);
export const THead = (p: HTMLAttributes<HTMLTableSectionElement>) => <thead className="border-b bg-muted/60" {...p} />;
export const TBody = (p: HTMLAttributes<HTMLTableSectionElement>) => <tbody className="divide-y" {...p} />;
export const TR = ({ className, ...p }: HTMLAttributes<HTMLTableRowElement>) => (
  <tr className={cn('hover:bg-muted/40', className)} {...p} />
);
export const TH = ({ className, ...p }: ThHTMLAttributes<HTMLTableCellElement>) => (
  <th className={cn('h-10 px-3 text-left align-middle font-medium text-muted-foreground', className)} {...p} />
);
export const TD = ({ className, ...p }: TdHTMLAttributes<HTMLTableCellElement>) => (
  <td className={cn('px-3 py-2.5 align-middle', className)} {...p} />
);
