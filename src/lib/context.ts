import { PrismaClient, type User } from '@prisma/client';
import { type FastifyRequest } from 'fastify';
import authenticateUser from './authenticateUser';
import { pubSub } from './pubsub';

const prisma = new PrismaClient();

export interface GraphQlContext {
  prisma: PrismaClient;
  currentUser: User | null;
  pubSub: typeof pubSub;
}

export async function contextFactory(
  request: FastifyRequest
): Promise<GraphQlContext> {
  return {
    prisma,
    currentUser: await authenticateUser(prisma, request),
    pubSub,
  };
}
