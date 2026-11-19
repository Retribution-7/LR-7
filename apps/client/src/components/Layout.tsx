import { BarChart3, Building2, ClipboardList, LogOut, Menu, Tags, UserCircle2, Users, Users2, X } from 'lucide-react';
import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/stores/authStore';

const links = [
  { to: '/employees', label: 'Сотрудники', icon: Users },
  { to: '/companies', label: 'Предприятия', icon: Building2 },
  { to: '/works', label: 'Работы', icon: ClipboardList },
  { to: '/categories', label: 'Категории', icon: Tags },
  { to: '/report', label: 'Ведомость', icon: BarChart3 },
];

const adminLinks = [{ to: '/users', label: 'Пользователи', icon: Users2 }];

function Nav({ onNavigate }: { onNavigate?: () => void }) {
  const role = useAuthStore((s) => s.user?.role);
  const items = role === 'admin' ? [...links, ...adminLinks] : links;

  return (
    <nav className="flex flex-col gap-1 p-3">
      {items.map(({ to, label, icon: Icon }) => (
        <NavLink
          key={to}
          to={to}
          onClick={onNavigate}
          className={({ isActive }) =>
            cn(
              'flex items-center gap-3 rounded-md px-3 py-2 text-sm text-sidebar-foreground/80 hover:bg-white/10',
              isActive && 'bg-white/10 font-medium text-white shadow-[inset_3px_0_0_hsl(var(--primary))]',
            )
          }
        >
          <Icon className="h-4 w-4" />
          {label}
        </NavLink>
      ))}
    </nav>
  );
}

function UserBlock({ onNavigate }: { onNavigate?: () => void }) {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavigate();
  if (!user) return null;

  return (
    <div className="mt-auto border-t border-white/10 p-3">
      <div className="flex items-center gap-2 px-2 py-1">
        <UserCircle2 className="h-5 w-5 shrink-0" />
        <div className="min-w-0">
          <div className="truncate text-sm font-medium text-white">{user.username}</div>
          <div className="text-xs text-sidebar-foreground/70">
            {user.role === 'admin' ? 'Администратор' : 'Пользователь'}
          </div>
        </div>
      </div>
      <div className="mt-1 flex flex-col gap-1">
        <NavLink
          to="/profile"
          onClick={onNavigate}
          className={({ isActive }) =>
            cn(
              'flex items-center gap-3 rounded-md px-3 py-2 text-sm text-sidebar-foreground/80 hover:bg-white/10',
              isActive && 'bg-white/10 font-medium text-white',
            )
          }
        >
          <UserCircle2 className="h-4 w-4" />
          Профиль
        </NavLink>
        <button
          onClick={() => {
            logout();
            navigate('/login', { replace: true });
            onNavigate?.();
          }}
          className="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-sidebar-foreground/80 hover:bg-white/10"
        >
          <LogOut className="h-4 w-4" />
          Выйти
        </button>
      </div>
    </div>
  );
}

export function Layout() {
  const [open, setOpen] = useState(false);

  return (
    <div className="min-h-screen md:grid md:grid-cols-[14rem_1fr]">
      
      <aside className="hidden bg-sidebar text-sidebar-foreground md:block">
        <div className="sticky top-0 flex h-screen flex-col">
          <div className="px-6 py-5 text-lg font-semibold text-white">Аудит</div>
          <Nav />
          <UserBlock />
        </div>
      </aside>

      
      <header className="sticky top-0 z-40 flex items-center justify-between bg-sidebar px-4 py-3 text-white md:hidden">
        <span className="text-lg font-semibold">Аудит</span>
        <button onClick={() => setOpen((v) => !v)} aria-label={open ? 'Закрыть меню' : 'Открыть меню'} aria-expanded={open}>
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </header>
      {open && (
        <div className="flex min-h-[calc(100vh-3.25rem)] flex-col bg-sidebar text-sidebar-foreground md:hidden">
          <Nav onNavigate={() => setOpen(false)} />
          <UserBlock onNavigate={() => setOpen(false)} />
        </div>
      )}

      <main className="min-w-0 p-4 sm:p-6 lg:p-8">
        <Outlet />
      </main>
    </div>
  );
}
