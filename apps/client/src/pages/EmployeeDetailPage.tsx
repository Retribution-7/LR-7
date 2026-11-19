import { ArrowLeft, Pencil, Plus, Trash2 } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ConfirmDelete } from '@/components/ConfirmDelete';
import { Photo } from '@/components/Photo';
import { Button } from '@/components/ui/button';
import { Table, TBody, TD, THead, TR, TH } from '@/components/ui/table';
import { EmployeeFormDialog } from '@/forms/EmployeeForm';
import { WorkFormDialog } from '@/forms/WorkForm';
import { api } from '@/lib/api';
import type { Employee, Paged, Work } from '@/lib/types';
import { useDetail } from '@/lib/useDetail';
import { ageFrom, formatDate, formatNumber } from '@/lib/utils';
import { useEmployeesStore } from '@/stores/entityStore';
import { useLookups } from '@/stores/lookups';
import { useAuthStore } from '@/stores/authStore';

export function NotFoundBlock({ what, back, to }: { what: string; back: string; to: string }) {
  return (
    <div className="rounded-lg border bg-card p-8 text-center">
      <p className="text-lg font-medium">{what} не найден(а)</p>
      <p className="mt-1 text-sm text-muted-foreground">Возможно, запись была удалена или адрес указан неверно.</p>
      <Button asChild variant="outline" className="mt-4">
        <Link to={to}>{back}</Link>
      </Button>
    </div>
  );
}

export default function EmployeeDetailPage() {
  const params = useParams();
  const id = Number(params.id);
  const navigate = useNavigate();
  const remove = useEmployeesStore((s) => s.remove);
  const loadLookups = useLookups((l) => l.load);
  const { data: emp, loading, notFound, error, reload } = useDetail<Employee>('employees', id);

  const [works, setWorks] = useState<Work[]>([]);
  const [editOpen, setEditOpen] = useState(false);
  const [workOpen, setWorkOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const isAdmin = useAuthStore((s) => s.user?.role === 'admin');

  const loadWorks = useCallback(async () => {
    try {
      const res = await api.get<Paged<Work>>('/works', { params: { employeeId: id, limit: 100, sortBy: 'workDate', order: 'desc' } });
      setWorks(res.data.data);
    } catch {
      setWorks([]);
    }
  }, [id]);

  useEffect(() => {
    void loadLookups();
    void loadWorks();
  }, [loadLookups, loadWorks]);

  const totals = useMemo(() => {
    const hours = works.reduce((sum, w) => sum + w.hoursWorked, 0);
    return { hours, accrued: hours * (emp?.category?.hourlyRate ?? 0) };
  }, [works, emp]);

  if (!Number.isInteger(id) || id < 1 || notFound) return <NotFoundBlock what="Сотрудник" back="К списку сотрудников" to="/employees" />;
  if (error) return <p className="text-destructive" role="alert">{error}</p>;
  if (loading && !emp) return <p className="text-muted-foreground">Загрузка…</p>;
  if (!emp) return null;

  return (
    <>
      <Link to="/employees" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Сотрудники
      </Link>

      <div className="rounded-lg border bg-card p-5 sm:p-6">
        <div className="flex flex-col gap-5 sm:flex-row">
          <Photo src={emp.photo} alt={emp.fullName} kind="person" className="h-48 w-48 shrink-0 self-center sm:self-start" />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h1 className="text-2xl font-semibold tracking-tight">{emp.fullName}</h1>
                <p className="text-muted-foreground">{emp.category?.name}</p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setEditOpen(true)}><Pencil className="h-4 w-4" /> Изменить</Button>
                {isAdmin && (
                  <Button variant="outline" className="text-destructive hover:text-destructive" onClick={() => setDeleteOpen(true)}>
                    <Trash2 className="h-4 w-4" /> Удалить
                  </Button>
                )}
              </div>
            </div>
            <dl className="mt-5 grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
              <div><dt className="text-muted-foreground">Номер паспорта</dt><dd className="font-medium">{emp.passportNumber}</dd></div>
              <div><dt className="text-muted-foreground">Дата рождения</dt><dd className="font-medium">{formatDate(emp.birthDate)} ({ageFrom(emp.birthDate)} лет)</dd></div>
              <div><dt className="text-muted-foreground">Рабочий телефон</dt><dd className="font-medium">{emp.workPhone}</dd></div>
              <div><dt className="text-muted-foreground">Ставка за час</dt><dd className="tnum font-medium">{formatNumber(emp.category?.hourlyRate ?? 0)} тыс. руб.</dd></div>
              <div><dt className="text-muted-foreground">Всего отработано</dt><dd className="tnum font-medium">{formatNumber(totals.hours)} ч</dd></div>
              <div><dt className="text-muted-foreground">Начислено</dt><dd className="tnum font-medium">{formatNumber(totals.accrued)} тыс. руб.</dd></div>
            </dl>
          </div>
        </div>
      </div>

      <div className="mt-6 flex items-center justify-between">
        <h2 className="text-lg font-semibold">Выполненные работы</h2>
        <Button size="sm" onClick={() => setWorkOpen(true)}><Plus className="h-4 w-4" /> Добавить работу</Button>
      </div>
      <div className="mt-3 rounded-lg border bg-card">
        {works.length === 0 ? (
          <p className="p-6 text-center text-sm text-muted-foreground">Работ пока нет.</p>
        ) : (
          <Table>
            <THead>
              <TR><TH>Дата</TH><TH>Предприятие</TH><TH>Часы</TH><TH>Начислено, тыс. руб.</TH></TR>
            </THead>
            <TBody>
              {works.map((w) => (
                <TR key={w.id}>
                  <TD>{formatDate(w.workDate)}</TD>
                  <TD><Link to={`/companies/${w.companyId}`} className="hover:text-primary hover:underline">{w.company?.name}</Link></TD>
                  <TD>{formatNumber(w.hoursWorked)}</TD>
                  <TD>{formatNumber(w.hoursWorked * (emp.category?.hourlyRate ?? 0))}</TD>
                </TR>
              ))}
            </TBody>
          </Table>
        )}
      </div>

      <EmployeeFormDialog open={editOpen} onOpenChange={setEditOpen} item={emp} onSaved={() => { void reload(); void loadWorks(); }} />
      <WorkFormDialog open={workOpen} onOpenChange={setWorkOpen} preset={{ employeeId: String(emp.id) }} onSaved={() => void loadWorks()} />
      <ConfirmDelete
        open={deleteOpen}
        title="Удалить сотрудника?"
        description={`Сотрудник «${emp.fullName}» будет удалён вместе с фото. Если у него есть выполненные работы, удалить его не получится.`}
        onConfirm={async () => { if (await remove(emp.id)) navigate('/employees'); }}
        onClose={() => setDeleteOpen(false)}
      />
    </>
  );
}
