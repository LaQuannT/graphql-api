import { PrismaClient, User } from '@prisma/client';
import { FastifyRequest } from 'fastify';
import authenticateUser from './authenticateUser';

const prisma = new PrismaClient();

export type GraphQlContext = {
  prisma: PrismaClient;
  currentUser: User | null;
};

export async function contextFactory(
  request: FastifyRequest
): Promise<GraphQlContext> {
  return {
    prisma,
    currentUser: await authenticateUser(prisma, request),
  };
}
