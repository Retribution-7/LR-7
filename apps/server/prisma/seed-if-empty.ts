import { spawnSync } from 'node:child_process';
import { basePrisma } from '../src/db';

async function main() {
  const [categories, works] = await Promise.all([basePrisma.category.count(), basePrisma.work.count()]);
  if (categories > 0 || works > 0) {
    console.log(`БД уже заполнена (категорий ${categories}, работ ${works}) — сид пропущен`);
    return;
  }
  console.log('БД пуста — заполняю из prisma/seed-data.json…');
  const r = spawnSync('tsx', ['prisma/seed.ts'], { stdio: 'inherit', shell: true });
  if (r.status !== 0) process.exit(r.status ?? 1);
}

main()
  .catch((e) => {
    console.error(e instanceof Error ? e.message : e);
    process.exit(1);
  })
  .finally(() => basePrisma.$disconnect());
