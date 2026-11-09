import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

export default function NotFoundPage() {
  return (
    <div className="mx-auto mt-16 max-w-md rounded-lg border bg-card p-8 text-center">
      <p className="text-lg font-semibold">Страница не найдена</p>
      <p className="mt-1 text-sm text-muted-foreground">Проверьте адрес или вернитесь к списку сотрудников.</p>
      <Button asChild className="mt-4">
        <Link to="/employees">К сотрудникам</Link>
      </Button>
    </div>
  );
}
