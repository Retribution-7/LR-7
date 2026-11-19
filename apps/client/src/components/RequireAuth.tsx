import type { JSX } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import type { Role } from '@/lib/types';

export function RequireAuth({ roles, children }: { roles?: Role[]; children: JSX.Element }) {
  const user = useAuthStore((s) => s.user);
  const initializing = useAuthStore((s) => s.initializing);

  if (initializing) return null;
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/employees" replace />;
  return children;
}
