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
import { Input } from '@/components/ui/input';
import { Table, TBody, TD, THead, TR, TH } from '@/components/ui/table';
import { EmployeeFormDialog } from '@/forms/EmployeeForm';
import type { Employee } from '@/lib/types';
import { formatDate } from '@/lib/utils';
import { useEmployeesStore } from '@/stores/entityStore';
import { useLookups } from '@/stores/lookups';

export default function EmployeesPage() {
  const s = useEmployeesStore();
  const categories = useLookups((l) => l.categories);
  const loadLookups = useLookups((l) => l.load);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Employee | null>(null);
  const [deleting, setDeleting] = useState<Employee | null>(null);

  useEffect(() => {
    void s.load();
    void loadLookups();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const sortProps = { sortBy: s.params.sortBy, order: s.params.order, onSort: (sortBy: string, order: 'asc' | 'desc') => s.setParams({ sortBy, order }) };

  return (
    <>
      <PageHeader
        title="Сотрудники"
        description="Аудиторы фирмы и их категории."
        action={
          <Button onClick={() => { setEditing(null); setFormOpen(true); }}>
            <Plus className="h-4 w-4" /> Добавить сотрудника
          </Button>
        }
      />

      <ListToolbar
        search={s.params.search}
        onSearch={(v) => s.setParams({ search: v })}
        searchPlaceholder="Поиск по Ф.И.О., паспорту, телефону"
        sortOptions={[
          { value: 'fullName', label: 'Ф.И.О.' },
          { value: 'birthDate', label: 'Дата рождения' },
          { value: 'passportNumber', label: 'Номер паспорта' },
          { value: 'category.name', label: 'Категория' },
          { value: 'category.hourlyRate', label: 'Ставка категории' },
          { value: 'id', label: 'Порядок добавления' },
        ]}
        {...sortProps}
        onReset={s.resetParams}
      >
        <FilterItem label="Категория">
          <SelectFilter
            label="Категория"
            value={s.params.filters.categoryId ?? ''}
            onChange={(v) => s.setFilter('categoryId', v)}
            options={categories.map((c) => ({ value: String(c.id), label: c.name }))}
          />
        </FilterItem>
        <FilterItem label="Родился с">
          <Input type="date" value={s.params.filters.birthFrom ?? ''} onChange={(e) => s.setFilter('birthFrom', e.target.value)} />
        </FilterItem>
        <FilterItem label="Родился по">
          <Input type="date" value={s.params.filters.birthTo ?? ''} onChange={(e) => s.setFilter('birthTo', e.target.value)} />
        </FilterItem>
      </ListToolbar>

      <div className={`rounded-lg border bg-card ${s.loading ? 'opacity-70' : ''}`}>
        <Table>
          <THead>
            <TR>
              <SortHead label="Сотрудник" field="fullName" {...sortProps} />
              <SortHead label="Паспорт" field="passportNumber" className="hidden md:table-cell" {...sortProps} />
              <SortHead label="Дата рождения" field="birthDate" className="hidden lg:table-cell" {...sortProps} />
              <SortHead label="Категория" field="category.name" {...sortProps} />
              <TH className="hidden xl:table-cell">Телефон</TH>
              <TH className="w-28" />
            </TR>
          </THead>
          <TBody>
            {s.items.map((e) => (
              <TR key={e.id}>
                <TD>
                  <Link to={`/employees/${e.id}`} className="flex items-center gap-3 font-medium hover:text-primary hover:underline">
                    <Photo src={e.photo} alt={e.fullName} kind="person" className="h-9 w-9 shrink-0" />
                    {e.fullName}
                  </Link>
                </TD>
                <TD className="hidden md:table-cell">{e.passportNumber}</TD>
                <TD className="hidden lg:table-cell">{formatDate(e.birthDate)}</TD>
                <TD>{e.category?.name}</TD>
                <TD className="hidden xl:table-cell">{e.workPhone}</TD>
                <TD>
                  <RowActions name={e.fullName} onEdit={() => { setEditing(e); setFormOpen(true); }} onDelete={() => setDeleting(e)} />
                </TD>
              </TR>
            ))}
          </TBody>
        </Table>
        <ListState loading={s.loading} error={s.error} empty={s.items.length === 0} onRetry={s.load} />
        <Pagination page={s.params.page} pages={s.pages} total={s.total} limit={s.params.limit} onPage={(page) => s.setParams({ page })} onLimit={(limit) => s.setParams({ limit })} />
      </div>

      <EmployeeFormDialog open={formOpen} onOpenChange={setFormOpen} item={editing} />
      <ConfirmDelete
        open={!!deleting}
        title="Удалить сотрудника?"
        description={`Сотрудник «${deleting?.fullName}» будет удалён вместе с фото. Если у него есть выполненные работы, удалить его не получится.`}
        onConfirm={() => s.remove(deleting!.id)}
        onClose={() => setDeleting(null)}
      />
    </>
  );
}
