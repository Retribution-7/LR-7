import * as S from '@radix-ui/react-select';
import { Check, ChevronDown } from 'lucide-react';
import { forwardRef, type ComponentPropsWithoutRef, type ElementRef } from 'react';
import { cn } from '@/lib/utils';

export const Select = S.Root;
export const SelectValue = S.Value;

export const SelectTrigger = forwardRef<ElementRef<typeof S.Trigger>, ComponentPropsWithoutRef<typeof S.Trigger>>(
  ({ className, children, ...props }, ref) => (
    <S.Trigger
      ref={ref}
      className={cn(
        'flex h-9 w-full items-center justify-between gap-2 rounded-md border bg-card px-3 text-sm data-[placeholder]:text-muted-foreground aria-[invalid=true]:border-destructive disabled:opacity-50',
        className,
      )}
      {...props}
    >
      <span className="truncate">{children}</span>
      <S.Icon asChild>
        <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
      </S.Icon>
    </S.Trigger>
  ),
);
SelectTrigger.displayName = 'SelectTrigger';

export const SelectContent = forwardRef<ElementRef<typeof S.Content>, ComponentPropsWithoutRef<typeof S.Content>>(
  ({ className, children, ...props }, ref) => (
    <S.Portal>
      <S.Content
        ref={ref}
        position="popper"
        sideOffset={4}
        className={cn(
          'z-[60] max-h-72 min-w-[var(--radix-select-trigger-width)] overflow-hidden rounded-md border bg-card shadow-md',
          className,
        )}
        {...props}
      >
        <S.Viewport className="p-1">{children}</S.Viewport>
      </S.Content>
    </S.Portal>
  ),
);
SelectContent.displayName = 'SelectContent';

export const SelectItem = forwardRef<ElementRef<typeof S.Item>, ComponentPropsWithoutRef<typeof S.Item>>(
  ({ className, children, ...props }, ref) => (
    <S.Item
      ref={ref}
      className={cn(
        'relative flex cursor-pointer select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none data-[highlighted]:bg-muted',
        className,
      )}
      {...props}
    >
      <span className="absolute left-2 flex h-4 w-4 items-center justify-center">
        <S.ItemIndicator>
          <Check className="h-4 w-4 text-primary" />
        </S.ItemIndicator>
      </span>
      <S.ItemText>{children}</S.ItemText>
    </S.Item>
  ),
);
SelectItem.displayName = 'SelectItem';
