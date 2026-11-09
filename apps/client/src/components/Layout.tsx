import { BarChart3, Building2, ClipboardList, Menu, Tags, Users, X } from 'lucide-react';
import { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { cn } from '@/lib/utils';

const links = [
  { to: '/employees', label: 'Сотрудники', icon: Users },
  { to: '/companies', label: 'Предприятия', icon: Building2 },
  { to: '/works', label: 'Работы', icon: ClipboardList },
  { to: '/categories', label: 'Категории', icon: Tags },
  { to: '/report', label: 'Ведомость', icon: BarChart3 },
];

function Nav({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <nav className="flex flex-col gap-1 p-3">
      {links.map(({ to, label, icon: Icon }) => (
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

export function Layout() {
  const [open, setOpen] = useState(false);

  return (
    <div className="min-h-screen md:grid md:grid-cols-[14rem_1fr]">
      {/* Боковая панель — на широких экранах */}
      <aside className="hidden bg-sidebar text-sidebar-foreground md:block">
        <div className="sticky top-0">
          <div className="px-6 py-5 text-lg font-semibold text-white">Аудит</div>
          <Nav />
        </div>
      </aside>

      {/* Верхняя панель — на мобильных */}
      <header className="sticky top-0 z-40 flex items-center justify-between bg-sidebar px-4 py-3 text-white md:hidden">
        <span className="text-lg font-semibold">Аудит</span>
        <button onClick={() => setOpen((v) => !v)} aria-label={open ? 'Закрыть меню' : 'Открыть меню'} aria-expanded={open}>
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </header>
      {open && (
        <div className="bg-sidebar text-sidebar-foreground md:hidden">
          <Nav onNavigate={() => setOpen(false)} />
        </div>
      )}

      <main className="min-w-0 p-4 sm:p-6 lg:p-8">
        <Outlet />
      </main>
    </div>
  );
}
