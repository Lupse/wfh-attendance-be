import 'dotenv/config';
import bcrypt from 'bcrypt';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import { PrismaClient } from '../src/generated/prisma/client.js';

async function main() {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;

  if (!email || !password) {
    throw new Error('ADMIN_EMAIL or ADMIN_PASSWORD is missing');
  }

  const adapter = new PrismaMariaDb({
    host: process.env.DATABASE_HOST ?? 'localhost',
    port: Number(process.env.DATABASE_PORT ?? 3306),
    user: process.env.DATABASE_USER ?? 'root',
    password: process.env.DATABASE_PASSWORD ?? '',
    database: process.env.DATABASE_NAME ?? 'absensi_wfh',
    connectionLimit: 5,
  });

  const prisma = new PrismaClient({ adapter });

  try {
    const hashedPassword = await bcrypt.hash(password, 10);

    const admin = await prisma.user.upsert({
      where: { email },
      update: {
        role: 'ADMIN',
        isActive: true,
      },
      create: {
        email,
        password: hashedPassword,
        role: 'ADMIN',
        isActive: true,
      },
      select: {
        id: true,
        email: true,
        role: true,
      },
    });

    console.log('Admin account created successfully!');
    console.log(admin);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error('Failed to create admin:', error);
  process.exitCode = 1;
});