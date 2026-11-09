import { Plus } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ConfirmDelete } from '@/components/ConfirmDelete';
import { FilterItem, ListToolbar } from '@/components/ListToolbar';
import { PageHeader } from '@/components/PageHeader';
import { Pagination } from '@/components/Pagination';
import { Photo } from '@/components/Photo';
import { RowActions } from '@/components/RowActions';
import { SortHead } from '@/components/SortHead';
import { ListState } from '@/components/StateMessages';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TBody, TD, THead, TR, TH } from '@/components/ui/table';
import { CompanyFormDialog } from '@/forms/CompanyForm';
import type { Company } from '@/lib/types';
import { useCompaniesStore } from '@/stores/entityStore';

export default function CompaniesPage() {
  const s = useCompaniesStore();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Company | null>(null);
  const [deleting, setDeleting] = useState<Company | null>(null);

  useEffect(() => void s.load(), []); // eslint-disable-line react-hooks/exhaustive-deps

  const sortProps = { sortBy: s.params.sortBy, order: s.params.order, onSort: (sortBy: string, order: 'asc' | 'desc') => s.setParams({ sortBy, order }) };

  return (
    <>
      <PageHeader
        title="Предприятия"
        description="Организации, которые проверяют сотрудники фирмы."
        action={
          <Button onClick={() => { setEditing(null); setFormOpen(true); }}>
            <Plus className="h-4 w-4" /> Добавить предприятие
          </Button>
        }
      />

      <ListToolbar
        search={s.params.search}
        onSearch={(v) => s.setParams({ search: v })}
        searchPlaceholder="Поиск по названию, адресу, телефону"
        sortOptions={[
          { value: 'name', label: 'Название' },
          { value: 'address', label: 'Адрес' },
          { value: 'id', label: 'Порядок добавления' },
        ]}
        {...sortProps}
        onReset={s.resetParams}
      >
        <FilterItem label="Адрес содержит" className="w-56">
          <Input value={s.params.filters.address ?? ''} placeholder="Например, Минск" onChange={(e) => s.setFilter('address', e.target.value)} />
        </FilterItem>
      </ListToolbar>

      <div className={`rounded-lg border bg-card ${s.loading ? 'opacity-70' : ''}`}>
        <Table>
          <THead>
            <TR>
              <SortHead label="Предприятие" field="name" {...sortProps} />
              <SortHead label="Адрес" field="address" className="hidden md:table-cell" {...sortProps} />
              <TH className="hidden lg:table-cell">Телефон</TH>
              <TH className="hidden sm:table-cell">Работ</TH>
              <TH className="w-28" />
            </TR>
          </THead>
          <TBody>
            {s.items.map((c) => (
              <TR key={c.id}>
                <TD>
                  <Link to={`/companies/${c.id}`} className="flex items-center gap-3 font-medium hover:text-primary hover:underline">
                    <Photo src={c.photo} alt={c.name} kind="company" className="h-9 w-9 shrink-0" />
                    {c.name}
                  </Link>
                </TD>
                <TD className="hidden md:table-cell">{c.address}</TD>
                <TD className="hidden lg:table-cell">{c.phone}</TD>
                <TD className="hidden sm:table-cell">{c._count?.works ?? 0}</TD>
                <TD>
                  <RowActions name={c.name} onEdit={() => { setEditing(c); setFormOpen(true); }} onDelete={() => setDeleting(c)} />
                </TD>
              </TR>
            ))}
          </TBody>
        </Table>
        <ListState loading={s.loading} error={s.error} empty={s.items.length === 0} onRetry={s.load} />
        <Pagination page={s.params.page} pages={s.pages} total={s.total} limit={s.params.limit} onPage={(page) => s.setParams({ page })} onLimit={(limit) => s.setParams({ limit })} />
      </div>

      <CompanyFormDialog open={formOpen} onOpenChange={setFormOpen} item={editing} />
      <ConfirmDelete
        open={!!deleting}
        title="Удалить предприятие?"
        description={`Предприятие «${deleting?.name}» будет удалено вместе с фото. Если по нему есть выполненные работы, удалить его не получится.`}
        onConfirm={() => s.remove(deleting!.id)}
        onClose={() => setDeleting(null)}
      />
    </>
  );
}
