import jwt from 'jsonwebtoken';
import { config } from 'dotenv';

config();
const APP_SECRET = process.env.AUTH_SECRET as string;

export default function createToken(userId: number):string {
  return jwt.sign({ userId }, APP_SECRET, { expiresIn: '1hr' });
}
