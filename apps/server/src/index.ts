import { app } from './app';
import { config } from './config';
import { basePrisma } from './db';

const server = app.listen(config.port, () => {
  console.log(`API запущен: http://localhost:${config.port}/api`);
});

const shutdown = async () => {
  server.close();
  await basePrisma.$disconnect();
  process.exit(0);
};
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
