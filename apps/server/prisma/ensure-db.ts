import 'dotenv/config';
import { Client } from 'pg';

function targetName(url: string): string {
  const u = new URL(url);
  const name = decodeURIComponent(u.pathname.replace(/^\//, ''));
  if (!name) throw new Error(`DATABASE_URL не содержит имени базы данных: ${url}`);
  return name;
}

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL не задан (файл server/.env)');

  const dbName = targetName(url);
  const admin = new URL(url);
  admin.pathname = '/postgres';

  const client = new Client({ connectionString: admin.toString() });
  await client.connect();
  try {
    const { rows } = await client.query('SELECT 1 FROM pg_database WHERE datname = $1', [dbName]);
    if (rows.length) {
      console.log(`БД "${dbName}" уже существует`);
    } else {
      await client.query(`CREATE DATABASE "${dbName.replace(/"/g, '""')}"`);
      console.log(`БД "${dbName}" создана`);
    }
  } finally {
    await client.end();
  }
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
