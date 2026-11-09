import * as D from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { forwardRef, type ComponentPropsWithoutRef, type ElementRef, type HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export const Dialog = D.Root;

export const DialogContent = forwardRef<ElementRef<typeof D.Content>, ComponentPropsWithoutRef<typeof D.Content>>(
  ({ className, children, ...props }, ref) => (
    <D.Portal>
      <D.Overlay className="anim-fade fixed inset-0 z-50 bg-foreground/40" />
      <D.Content
        ref={ref}
        className={cn(
          'anim-pop fixed left-1/2 top-1/2 z-50 max-h-[92vh] w-[calc(100vw-1.5rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-lg border bg-card p-5 shadow-lg sm:p-6',
          className,
        )}
        {...props}
      >
        {children}
        <D.Close className="absolute right-3 top-3 rounded-sm p-1 text-muted-foreground hover:bg-muted" aria-label="Закрыть">
          <X className="h-4 w-4" />
        </D.Close>
      </D.Content>
    </D.Portal>
  ),
);
DialogContent.displayName = 'DialogContent';

export const DialogHeader = ({ className, ...props }: HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('mb-4 space-y-1 pr-6', className)} {...props} />
);
export const DialogFooter = ({ className, ...props }: HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end', className)} {...props} />
);
export const DialogTitle = forwardRef<ElementRef<typeof D.Title>, ComponentPropsWithoutRef<typeof D.Title>>(
  ({ className, ...props }, ref) => <D.Title ref={ref} className={cn('text-lg font-semibold', className)} {...props} />,
);
DialogTitle.displayName = 'DialogTitle';
export const DialogDescription = forwardRef<ElementRef<typeof D.Description>, ComponentPropsWithoutRef<typeof D.Description>>(
  ({ className, ...props }, ref) => <D.Description ref={ref} className={cn('text-sm text-muted-foreground', className)} {...props} />,
);
DialogDescription.displayName = 'DialogDescription';
