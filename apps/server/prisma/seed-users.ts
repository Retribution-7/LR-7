import bcrypt from 'bcryptjs';
import { basePrisma } from '../src/db';

const USERS = [
  { username: 'admin', password: 'Admin123', role: 'admin' },
  { username: 'user', password: 'User1234', role: 'user' },
];

export async function seedUsers() {
  for (const roleName of ['admin', 'user']) {
    await basePrisma.role.upsert({
      where: { name: roleName },
      update: {},
      create: { name: roleName },
    });
  }
  for (const u of USERS) {
    await basePrisma.user.upsert({
      where: { username: u.username },
      update: { role: { connect: { name: u.role } } },
      create: {
        username: u.username,
        passwordHash: await bcrypt.hash(u.password, 10),
        role: { connect: { name: u.role } },
      },
    });
  }
  console.log('Пользователи: admin (admin), user (user)');
}

if (import.meta.main) {
  seedUsers()
    .catch((e) => {
      console.error(e);
      process.exit(1);
    })
    .finally(() => basePrisma.$disconnect());
}
