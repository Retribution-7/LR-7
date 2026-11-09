import { ArrowLeft, Pencil, Plus, Trash2 } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ConfirmDelete } from '@/components/ConfirmDelete';
import { Photo } from '@/components/Photo';
import { Button } from '@/components/ui/button';
import { Table, TBody, TD, THead, TR, TH } from '@/components/ui/table';
import { CompanyFormDialog } from '@/forms/CompanyForm';
import { WorkFormDialog } from '@/forms/WorkForm';
import { api } from '@/lib/api';
import type { Company, Paged, Work } from '@/lib/types';
import { useDetail } from '@/lib/useDetail';
import { formatDate, formatNumber } from '@/lib/utils';
import { useCompaniesStore } from '@/stores/entityStore';
import { useLookups } from '@/stores/lookups';
import { NotFoundBlock } from './EmployeeDetailPage';

export default function CompanyDetailPage() {
  const params = useParams();
  const id = Number(params.id);
  const navigate = useNavigate();
  const remove = useCompaniesStore((s) => s.remove);
  const loadLookups = useLookups((l) => l.load);
  const { data: company, loading, notFound, error, reload } = useDetail<Company>('companies', id);

  const [works, setWorks] = useState<Work[]>([]);
  const [editOpen, setEditOpen] = useState(false);
  const [workOpen, setWorkOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const loadWorks = useCallback(async () => {
    try {
      const res = await api.get<Paged<Work>>('/works', { params: { companyId: id, limit: 100, sortBy: 'workDate', order: 'desc' } });
      setWorks(res.data.data);
    } catch {
      setWorks([]);
    }
  }, [id]);

  useEffect(() => {
    void loadLookups();
    void loadWorks();
  }, [loadLookups, loadWorks]);

  const hours = useMemo(() => works.reduce((sum, w) => sum + w.hoursWorked, 0), [works]);

  if (!Number.isInteger(id) || id < 1 || notFound) return <NotFoundBlock what="Предприятие" back="К списку предприятий" to="/companies" />;
  if (error) return <p className="text-destructive" role="alert">{error}</p>;
  if (loading && !company) return <p className="text-muted-foreground">Загрузка…</p>;
  if (!company) return null;

  return (
    <>
      <Link to="/companies" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Предприятия
      </Link>

      <div className="rounded-lg border bg-card p-5 sm:p-6">
        <div className="flex flex-col gap-5 sm:flex-row">
          <Photo src={company.photo} alt={company.name} kind="company" className="h-48 w-48 shrink-0 self-center sm:self-start" />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <h1 className="text-2xl font-semibold tracking-tight">{company.name}</h1>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setEditOpen(true)}><Pencil className="h-4 w-4" /> Изменить</Button>
                <Button variant="outline" className="text-destructive hover:text-destructive" onClick={() => setDeleteOpen(true)}>
                  <Trash2 className="h-4 w-4" /> Удалить
                </Button>
              </div>
            </div>
            <dl className="mt-5 grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
              <div className="sm:col-span-2"><dt className="text-muted-foreground">Адрес</dt><dd className="font-medium">{company.address}</dd></div>
              <div><dt className="text-muted-foreground">Телефон</dt><dd className="font-medium">{company.phone}</dd></div>
              <div><dt className="text-muted-foreground">Всего часов проверки</dt><dd className="tnum font-medium">{formatNumber(hours)} ч</dd></div>
            </dl>
          </div>
        </div>
      </div>

      <div className="mt-6 flex items-center justify-between">
        <h2 className="text-lg font-semibold">Проверки предприятия</h2>
        <Button size="sm" onClick={() => setWorkOpen(true)}><Plus className="h-4 w-4" /> Добавить работу</Button>
      </div>
      <div className="mt-3 rounded-lg border bg-card">
        {works.length === 0 ? (
          <p className="p-6 text-center text-sm text-muted-foreground">Работ пока нет.</p>
        ) : (
          <Table>
            <THead>
              <TR><TH>Дата</TH><TH>Сотрудник</TH><TH>Часы</TH></TR>
            </THead>
            <TBody>
              {works.map((w) => (
                <TR key={w.id}>
                  <TD>{formatDate(w.workDate)}</TD>
                  <TD><Link to={`/employees/${w.employeeId}`} className="hover:text-primary hover:underline">{w.employee?.fullName}</Link></TD>
                  <TD>{formatNumber(w.hoursWorked)}</TD>
                </TR>
              ))}
            </TBody>
          </Table>
        )}
      </div>

      <CompanyFormDialog open={editOpen} onOpenChange={setEditOpen} item={company} onSaved={() => { void reload(); }} />
      <WorkFormDialog open={workOpen} onOpenChange={setWorkOpen} preset={{ companyId: String(company.id) }} onSaved={() => void loadWorks()} />
      <ConfirmDelete
        open={deleteOpen}
        title="Удалить предприятие?"
        description={`Предприятие «${company.name}» будет удалено вместе с фото. Если по нему есть выполненные работы, удалить его не получится.`}
        onConfirm={async () => { if (await remove(company.id)) navigate('/companies'); }}
        onClose={() => setDeleteOpen(false)}
      />
    </>
  );
}
