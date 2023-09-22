import { PrismaClient, User } from '@prisma/client';
import { FastifyRequest } from 'fastify';
import { JwtPayload, verify } from 'jsonwebtoken';
import { config } from 'dotenv';

config();

const APP_SECRET = process.env.AUTH_SECRET as string;

async function authenticateUser(
  prisma: PrismaClient,
  req: FastifyRequest
): Promise<User | null> {
  const { authorization } = req.headers;

  const token = authorization && authorization.split(' ')[1];

  if (token) {
    const tokenPayLoad = verify(token, APP_SECRET) as JwtPayload;
    const id = tokenPayLoad.userId;
    return await prisma.user.findUnique({ where: { id } });
  }

  return null;
}

export default authenticateUser;
