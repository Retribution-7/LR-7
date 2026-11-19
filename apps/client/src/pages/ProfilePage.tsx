import { PageHeader } from '@/components/PageHeader';
import { ChangePasswordForm } from '@/forms/ChangePasswordForm';
import { useAuthStore } from '@/stores/authStore';

export default function ProfilePage() {
  const user = useAuthStore((s) => s.user);
  if (!user) return null;

  return (
    <>
      <PageHeader title="Профиль" description="Учётная запись и смена пароля." />
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-lg border bg-card p-5">
          <h2 className="mb-3 text-lg font-semibold">Учётная запись</h2>
          <dl className="grid gap-3 text-sm">
            <div>
              <dt className="text-muted-foreground">Логин</dt>
              <dd className="font-medium">{user.username}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Роль</dt>
              <dd className="font-medium">{user.role === 'admin' ? 'Администратор' : 'Пользователь'}</dd>
            </div>
          </dl>
        </div>
        <div className="rounded-lg border bg-card p-5">
          <h2 className="mb-3 text-lg font-semibold">Смена пароля</h2>
          <ChangePasswordForm />
        </div>
      </div>
    </>
  );
}
