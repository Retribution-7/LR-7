import type { ReactNode } from 'react';
import { Label } from './ui/label';

export function FormField({ label, error, htmlFor, children }: { label: string; error?: string; htmlFor?: string; children: ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
