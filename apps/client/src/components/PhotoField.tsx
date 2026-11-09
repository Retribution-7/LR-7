import { useEffect, useMemo, useState } from 'react';
import { Photo } from './Photo';
import { Button } from './ui/button';

interface Props {
  kind: 'person' | 'company';
  currentPhoto?: string | null;
  file: File | null;
  removePhoto: boolean;
  onFile: (f: File | null) => void;
  onRemove: (v: boolean) => void;
}

const TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX = 5 * 1024 * 1024;

export function PhotoField({ kind, currentPhoto, file, removePhoto, onFile, onRemove }: Props) {
  const [error, setError] = useState<string>();
  const preview = useMemo(() => (file ? URL.createObjectURL(file) : null), [file]);
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

  const pick = (f: File | undefined) => {
    setError(undefined);
    if (!f) return;
    if (!TYPES.includes(f.type)) return setError('Допустимы файлы JPEG, PNG или WebP');
    if (f.size > MAX) return setError('Файл больше 5 МБ');
    onRemove(false);
    onFile(f);
  };

  const shown = preview ?? (removePhoto ? null : currentPhoto);

  return (
    <div className="space-y-1.5">
      <span className="text-sm font-medium">Фото</span>
      <div className="flex items-center gap-4">
        {preview ? (
          <img src={preview} alt="Предпросмотр" className="h-20 w-20 rounded-md object-cover" />
        ) : (
          <Photo src={shown} alt="Текущее фото" kind={kind} className="h-20 w-20" />
        )}
        <div className="flex flex-col items-start gap-2">
          <input
            type="file"
            accept={TYPES.join(',')}
            onChange={(e) => pick(e.target.files?.[0])}
            aria-label="Выбрать фото"
            className="max-w-full text-sm file:mr-3 file:rounded-md file:border file:bg-card file:px-3 file:py-1.5 file:text-sm hover:file:bg-muted"
          />
          {(file || (currentPhoto && !removePhoto)) && (
            <Button type="button" variant="ghost" size="sm" onClick={() => (file ? onFile(null) : onRemove(true))}>
              {file ? 'Отменить выбор' : 'Удалить фото'}
            </Button>
          )}
          {removePhoto && !file && <span className="text-xs text-muted-foreground">Фото будет удалено после сохранения</span>}
        </div>
      </div>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
