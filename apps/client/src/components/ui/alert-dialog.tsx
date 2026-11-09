import * as A from '@radix-ui/react-alert-dialog';
import { forwardRef, type ComponentPropsWithoutRef, type ElementRef, type ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { Button } from './button';

export const AlertDialog = A.Root;

export const AlertDialogContent = forwardRef<ElementRef<typeof A.Content>, ComponentPropsWithoutRef<typeof A.Content>>(
  ({ className, ...props }, ref) => (
    <A.Portal>
      <A.Overlay className="anim-fade fixed inset-0 z-50 bg-foreground/40" />
      <A.Content
        ref={ref}
        className={cn(
          'anim-pop fixed left-1/2 top-1/2 z-50 w-[calc(100vw-1.5rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-lg border bg-card p-5 shadow-lg sm:p-6',
          className,
        )}
        {...props}
      />
    </A.Portal>
  ),
);
AlertDialogContent.displayName = 'AlertDialogContent';

export const AlertDialogTitle = A.Title;
export const AlertDialogDescription = A.Description;
export const AlertDialogCancel = ({ children }: { children: ReactNode }) => (
  <A.Cancel asChild>
    <Button variant="outline">{children}</Button>
  </A.Cancel>
);
