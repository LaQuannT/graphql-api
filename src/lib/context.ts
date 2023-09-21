import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export type GraphQlContext = {
  prisma: PrismaClient;
};

export async function contextFactory(): Promise<GraphQlContext> {
  return { prisma };
}
