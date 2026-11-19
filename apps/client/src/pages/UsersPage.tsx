import { useEffect, useState } from 'react';
import { ConfirmDelete } from '@/components/ConfirmDelete';
import { PageHeader } from '@/components/PageHeader';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TBody, TD, TH, THead, TR } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { ListState } from '@/components/StateMessages';
import type { Role, User } from '@/lib/types';
import { useAuthStore } from '@/stores/authStore';
import { useUsersStore } from '@/stores/usersStore';

export default function UsersPage() {
  const s = useUsersStore();
  const me = useAuthStore((u) => u.user);
  const [deleting, setDeleting] = useState<User | null>(null);

  useEffect(() => void s.load(), []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <>
      <PageHeader title="Пользователи" description="Управление учётными записями и ролями пользователей системы." />

      <div className={`rounded-lg border bg-card ${s.loading ? 'opacity-70' : ''}`}>
        {s.items.length === 0 ? (
          <ListState loading={s.loading} error={null} empty={s.items.length === 0} onRetry={() => void s.load()} emptyText="Пользователей пока нет." />
        ) : (
          <Table>
            <THead>
              <TR>
                <TH>ID</TH>
                <TH>Логин</TH>
                <TH>Роль</TH>
                <TH className="text-right">Действия</TH>
              </TR>
            </THead>
            <TBody>
              {s.items.map((u) => {
                const isSelf = u.id === me?.id;
                return (
                  <TR key={u.id}>
                    <TD className="tnum">{u.id}</TD>
                    <TD className="font-medium">{u.username}</TD>
                    <TD>
                      {isSelf ? (
                        <span className="text-sm text-muted-foreground">
                          {u.role === 'admin' ? 'Администратор' : 'Пользователь'}
                        </span>
                      ) : (
                        <Select
                          value={u.role}
                          onValueChange={(v) => void s.setRole(u.id, v as Role)}
                        >
                          <SelectTrigger className="h-8 w-40" aria-label={`Роль: ${u.username}`}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="admin">Администратор</SelectItem>
                            <SelectItem value="user">Пользователь</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    </TD>
                    <TD className="text-right">
                      {!isSelf && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          onClick={() => setDeleting(u)}
                        >
                          Удалить
                        </Button>
                      )}
                    </TD>
                  </TR>
                );
              })}
            </TBody>
          </Table>
        )}
      </div>

      <ConfirmDelete
        open={!!deleting}
        title="Удалить пользователя?"
        description={deleting ? `Учётная запись «${deleting.username}» будет удалена без возможности восстановления.` : ''}
        onConfirm={async () => {
          if (deleting) await s.remove(deleting.id);
          setDeleting(null);
        }}
        onClose={() => setDeleting(null)}
      />
    </>
  );
}
