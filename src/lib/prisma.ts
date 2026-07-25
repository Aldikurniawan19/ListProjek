import { PrismaLibSql } from '@prisma/adapter-libsql';
import { PrismaClient } from '../generated/prisma/client.js';

let prisma: PrismaClient;

export function getPrisma(): PrismaClient {
  if (!prisma) {
    const adapter = new PrismaLibSql({ url: 'file:./dev.db' });
    prisma = new PrismaClient({ adapter });
  }
  return prisma;
}
