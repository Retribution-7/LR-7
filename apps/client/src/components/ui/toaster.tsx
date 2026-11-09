import * as T from '@radix-ui/react-toast';
import { CheckCircle2, CircleAlert, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useNotify } from '@/stores/notify';

export function Toaster() {
  const { toasts, dismiss } = useNotify();
  return (
    <T.Provider swipeDirection="right">
      {toasts.map((t) => (
        <T.Root
          key={t.id}
          open
          duration={t.type === 'error' ? 8000 : 4000}
          onOpenChange={(open) => !open && dismiss(t.id)}
          className={cn(
            'anim-toast flex items-start gap-3 rounded-md border bg-card p-3 pr-8 shadow-lg',
            t.type === 'error' ? 'border-destructive/50' : 'border-primary/40',
          )}
        >
          {t.type === 'error' ? (
            <CircleAlert className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
          ) : (
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          )}
          <div className="space-y-0.5">
            <T.Title className="text-sm font-medium">{t.title}</T.Title>
            {t.description && <T.Description className="text-sm text-muted-foreground">{t.description}</T.Description>}
          </div>
          <T.Close className="absolute right-2 top-2 rounded-sm p-0.5 text-muted-foreground hover:bg-muted" aria-label="Закрыть">
            <X className="h-3.5 w-3.5" />
          </T.Close>
        </T.Root>
      ))}
      <T.Viewport className="fixed bottom-0 right-0 z-[100] flex w-full max-w-sm flex-col gap-2 p-4 outline-none" />
    </T.Provider>
  );
}
