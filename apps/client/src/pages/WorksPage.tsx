import { Plus } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ConfirmDelete } from '@/components/ConfirmDelete';
import { FilterItem, ListToolbar, SelectFilter } from '@/components/ListToolbar';
import { PageHeader } from '@/components/PageHeader';
import { Pagination } from '@/components/Pagination';
import { Photo } from '@/components/Photo';
import { RowActions } from '@/components/RowActions';
import { SortHead } from '@/components/SortHead';
import { ListState } from '@/components/StateMessages';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Table, TBody, TD, THead, TR, TH } from '@/components/ui/table';
import { WorkFormDialog } from '@/forms/WorkForm';
import { useDetail } from '@/lib/useDetail';
import type { Work } from '@/lib/types';
import { formatDate, formatNumber } from '@/lib/utils';
import { useWorksStore } from '@/stores/entityStore';
import { useLookups } from '@/stores/lookups';

function WorkDetailDialog({ id, onClose }: { id: number; onClose: () => void }) {
  const { data, loading, notFound, error } = useDetail<Work>('works', id);
  const rate = data?.employee?.category?.hourlyRate ?? 0;

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Работа № {id}</DialogTitle>
          <DialogDescription>Подробные сведения о выполненной работе.</DialogDescription>
        </DialogHeader>
        {loading && <p className="text-sm text-muted-foreground">Загрузка…</p>}
        {notFound && <p className="text-sm text-destructive">Запись не найдена — возможно, она уже удалена.</p>}
        {error && <p className="text-sm text-destructive">{error}</p>}
        {data && (
          <div className="space-y-5">
            <dl className="grid grid-cols-3 gap-3 text-sm">
              <div><dt className="text-muted-foreground">Дата</dt><dd className="tnum font-medium">{formatDate(data.workDate)}</dd></div>
              <div><dt className="text-muted-foreground">Часов</dt><dd className="tnum font-medium">{formatNumber(data.hoursWorked)}</dd></div>
              <div><dt className="text-muted-foreground">Начислено, тыс. руб.</dt><dd className="tnum font-medium">{formatNumber(data.hoursWorked * rate)}</dd></div>
            </dl>
            <div className="grid gap-4 sm:grid-cols-2">
              <Link to={`/employees/${data.employeeId}`} onClick={onClose} className="flex gap-3 rounded-md border p-3 hover:bg-muted/50">
                <Photo src={data.employee?.photo} alt={data.employee?.fullName ?? ''} kind="person" className="h-16 w-16 shrink-0" />
                <div className="min-w-0 text-sm">
                  <div className="text-muted-foreground">Сотрудник</div>
                  <div className="font-medium">{data.employee?.fullName}</div>
                  <div className="text-muted-foreground">{data.employee?.category?.name}</div>
                </div>
              </Link>
              <Link to={`/companies/${data.companyId}`} onClick={onClose} className="flex gap-3 rounded-md border p-3 hover:bg-muted/50">
                <Photo src={data.company?.photo} alt={data.company?.name ?? ''} kind="company" className="h-16 w-16 shrink-0" />
                <div className="min-w-0 text-sm">
                  <div className="text-muted-foreground">Предприятие</div>
                  <div className="font-medium">{data.company?.name}</div>
                  <div className="text-muted-foreground">{data.company?.address}</div>
                </div>
              </Link>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default function WorksPage() {
  const s = useWorksStore();
  const employees = useLookups((l) => l.employees);
  const companies = useLookups((l) => l.companies);
  const loadLookups = useLookups((l) => l.load);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Work | null>(null);
  const [deleting, setDeleting] = useState<Work | null>(null);
  const [viewId, setViewId] = useState<number | null>(null);

  useEffect(() => {
    void s.load();
    void loadLookups();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const sortProps = { sortBy: s.params.sortBy, order: s.params.order, onSort: (sortBy: string, order: 'asc' | 'desc') => s.setParams({ sortBy, order }) };
  const f = s.params.filters;

  return (
    <>
      <PageHeader
        title="Работы"
        description="Кто, где и сколько часов проверял."
        action={
          <Button onClick={() => { setEditing(null); setFormOpen(true); }}>
            <Plus className="h-4 w-4" /> Добавить работу
          </Button>
        }
      />

      <ListToolbar
        search={s.params.search}
        onSearch={(v) => s.setParams({ search: v })}
        searchPlaceholder="Поиск по сотруднику или предприятию"
        sortOptions={[
          { value: 'workDate', label: 'Дата работы' },
          { value: 'hoursWorked', label: 'Часы' },
          { value: 'employee.fullName', label: 'Сотрудник' },
          { value: 'company.name', label: 'Предприятие' },
          { value: 'id', label: 'Порядок добавления' },
        ]}
        {...sortProps}
        onReset={s.resetParams}
      >
        <FilterItem label="Сотрудник" className="w-52">
          <SelectFilter label="Сотрудник" value={f.employeeId ?? ''} onChange={(v) => s.setFilter('employeeId', v)} options={employees.map((e) => ({ value: String(e.id), label: e.fullName }))} />
        </FilterItem>
        <FilterItem label="Предприятие" className="w-52">
          <SelectFilter label="Предприятие" value={f.companyId ?? ''} onChange={(v) => s.setFilter('companyId', v)} options={companies.map((c) => ({ value: String(c.id), label: c.name }))} />
        </FilterItem>
        <FilterItem label="Дата с" className="w-36">
          <Input type="date" value={f.dateFrom ?? ''} onChange={(e) => s.setFilter('dateFrom', e.target.value)} />
        </FilterItem>
        <FilterItem label="Дата по" className="w-36">
          <Input type="date" value={f.dateTo ?? ''} onChange={(e) => s.setFilter('dateTo', e.target.value)} />
        </FilterItem>
        <FilterItem label="Часов от" className="w-24">
          <Input type="number" min={0} value={f.hoursMin ?? ''} onChange={(e) => s.setFilter('hoursMin', e.target.value)} />
        </FilterItem>
        <FilterItem label="Часов до" className="w-24">
          <Input type="number" min={0} value={f.hoursMax ?? ''} onChange={(e) => s.setFilter('hoursMax', e.target.value)} />
        </FilterItem>
      </ListToolbar>

      <div className={`rounded-lg border bg-card ${s.loading ? 'opacity-70' : ''}`}>
        <Table>
          <THead>
            <TR>
              <SortHead label="Дата" field="workDate" {...sortProps} />
              <SortHead label="Сотрудник" field="employee.fullName" {...sortProps} />
              <SortHead label="Предприятие" field="company.name" className="hidden sm:table-cell" {...sortProps} />
              <SortHead label="Часы" field="hoursWorked" {...sortProps} />
              <TH className="w-36" />
            </TR>
          </THead>
          <TBody>
            {s.items.map((w) => (
              <TR key={w.id}>
                <TD className="whitespace-nowrap">{formatDate(w.workDate)}</TD>
                <TD>
                  <Link to={`/employees/${w.employeeId}`} className="hover:text-primary hover:underline">{w.employee?.fullName}</Link>
                </TD>
                <TD className="hidden sm:table-cell">
                  <Link to={`/companies/${w.companyId}`} className="hover:text-primary hover:underline">{w.company?.name}</Link>
                </TD>
                <TD>{formatNumber(w.hoursWorked)}</TD>
                <TD>
                  <RowActions
                    name={`работа № ${w.id}`}
                    onView={() => setViewId(w.id)}
                    onEdit={() => { setEditing(w); setFormOpen(true); }}
                    onDelete={() => setDeleting(w)}
                  />
                </TD>
              </TR>
            ))}
          </TBody>
        </Table>
        <ListState loading={s.loading} error={s.error} empty={s.items.length === 0} onRetry={s.load} />
        <Pagination page={s.params.page} pages={s.pages} total={s.total} limit={s.params.limit} onPage={(page) => s.setParams({ page })} onLimit={(limit) => s.setParams({ limit })} />
      </div>

      <WorkFormDialog open={formOpen} onOpenChange={setFormOpen} item={editing} />
      {viewId !== null && <WorkDetailDialog id={viewId} onClose={() => setViewId(null)} />}
      <ConfirmDelete
        open={!!deleting}
        title="Удалить работу?"
        description={deleting ? `Запись о работе ${formatDate(deleting.workDate)} (${deleting.employee?.fullName}, ${deleting.company?.name}) будет удалена.` : ''}
        onConfirm={() => s.remove(deleting!.id)}
        onClose={() => setDeleting(null)}
      />
    </>
  );
}
