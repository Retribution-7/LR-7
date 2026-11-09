import { Plus } from 'lucide-react';
import { useEffect, useState } from 'react';
import { ConfirmDelete } from '@/components/ConfirmDelete';
import { FilterItem, ListToolbar } from '@/components/ListToolbar';
import { PageHeader } from '@/components/PageHeader';
import { Pagination } from '@/components/Pagination';
import { RowActions } from '@/components/RowActions';
import { SortHead } from '@/components/SortHead';
import { ListState } from '@/components/StateMessages';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TBody, TD, THead, TR, TH } from '@/components/ui/table';
import { CategoryFormDialog } from '@/forms/CategoryForm';
import type { Category } from '@/lib/types';
import { formatNumber } from '@/lib/utils';
import { useCategoriesStore } from '@/stores/entityStore';

export default function CategoriesPage() {
  const s = useCategoriesStore();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [deleting, setDeleting] = useState<Category | null>(null);

  useEffect(() => void s.load(), []); // eslint-disable-line react-hooks/exhaustive-deps

  const sortProps = { sortBy: s.params.sortBy, order: s.params.order, onSort: (sortBy: string, order: 'asc' | 'desc') => s.setParams({ sortBy, order }) };

  return (
    <>
      <PageHeader
        title="Категории"
        description="Категория сотрудника определяет ставку за час работы."
        action={
          <Button onClick={() => { setEditing(null); setFormOpen(true); }}>
            <Plus className="h-4 w-4" /> Добавить категорию
          </Button>
        }
      />

      <ListToolbar
        search={s.params.search}
        onSearch={(v) => s.setParams({ search: v })}
        searchPlaceholder="Поиск по названию"
        sortOptions={[
          { value: 'id', label: 'Порядок добавления' },
          { value: 'name', label: 'Название' },
          { value: 'hourlyRate', label: 'Ставка' },
        ]}
        {...sortProps}
        onReset={s.resetParams}
      >
        <FilterItem label="Ставка от">
          <Input type="number" min={0} value={s.params.filters.rateMin ?? ''} onChange={(e) => s.setFilter('rateMin', e.target.value)} />
        </FilterItem>
        <FilterItem label="Ставка до">
          <Input type="number" min={0} value={s.params.filters.rateMax ?? ''} onChange={(e) => s.setFilter('rateMax', e.target.value)} />
        </FilterItem>
      </ListToolbar>

      <div className={`rounded-lg border bg-card ${s.loading ? 'opacity-70' : ''}`}>
        <Table>
          <THead>
            <TR>
              <SortHead label="Название" field="name" {...sortProps} />
              <SortHead label="Ставка, тыс. руб./ч" field="hourlyRate" {...sortProps} />
              <TH className="hidden sm:table-cell">Сотрудников</TH>
              <TH className="w-28" />
            </TR>
          </THead>
          <TBody>
            {s.items.map((c) => (
              <TR key={c.id}>
                <TD className="font-medium">{c.name}</TD>
                <TD>{formatNumber(c.hourlyRate)}</TD>
                <TD className="hidden sm:table-cell">{c._count?.employees ?? 0}</TD>
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

      <CategoryFormDialog open={formOpen} onOpenChange={setFormOpen} item={editing} />
      <ConfirmDelete
        open={!!deleting}
        title="Удалить категорию?"
        description={`Категория «${deleting?.name}» будет удалена безвозвратно. Если к ней привязаны сотрудники, удалить её не получится.`}
        onConfirm={() => s.remove(deleting!.id)}
        onClose={() => setDeleting(null)}
      />
    </>
  );
}
