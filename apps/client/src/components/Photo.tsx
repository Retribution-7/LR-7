import { Building2, User } from 'lucide-react';
import { fileUrl } from '@/lib/api';
import { cn } from '@/lib/utils';

/** Фото сущности или заглушка, если фото не загружено */
export function Photo({ src, alt, kind, className }: { src?: string | null; alt: string; kind: 'person' | 'company'; className?: string }) {
  const url = fileUrl(src);
  const Icon = kind === 'person' ? User : Building2;
  return url ? (
    <img src={url} alt={alt} loading="lazy" className={cn('rounded-md bg-muted object-cover', className)} />
  ) : (
    <div className={cn('flex items-center justify-center rounded-md bg-muted text-muted-foreground', className)} aria-label="Фото не загружено" role="img">
      <Icon className="h-1/2 w-1/2" />
    </div>
  );
}
