import { type PrismaClient, type User } from '@prisma/client';
import { type FastifyRequest } from 'fastify';
import { type JwtPayload, verify } from 'jsonwebtoken';
import { config } from 'dotenv';

config();

const APP_SECRET = process.env.AUTH_SECRET as string;

async function authenticateUser(
  prisma: PrismaClient,
  req: FastifyRequest
): Promise<User | null> {
  const { authorization } = req.headers;

  const token = authorization?.split(' ')[1];

  if (token != null) {
    const tokenPayLoad = verify(token, APP_SECRET) as JwtPayload;
    const id = tokenPayLoad.userId;
    return await prisma.user.findUnique({ where: { id } });
  }

  return null;
}

export default authenticateUser;
