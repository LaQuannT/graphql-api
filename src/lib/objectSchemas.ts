import { z } from 'zod';

export const registerUserSchema = z
  .object({
    username: z.string().min(3),
    email: z.string().email(),
    password: z
      .string()
      .min(8)
      .regex(new RegExp('^(?=.*[0-9]+.*)(?=.*[a-zA-Z]+.*)[0-9a-zA-Z]{8,}$')),
    confirmedPassword: z
      .string()
      .min(8)
      .regex(new RegExp('^(?=.*[0-9]+.*)(?=.*[a-zA-Z]+.*)[0-9a-zA-Z]{8,}$')),
  })
  .refine((data) => data.password !== data.confirmedPassword, {
    message: 'Passwords must match',
    path: ['confirmedPassword'],
  });

export const loginUserSchema = z.object({
  username: z.string().min(3),
  password: z
    .string()
    .min(8)
    .regex(new RegExp('^(?=.*[0-9]+.*)(?=.*[a-zA-Z]+.*)[0-9a-zA-Z]{8,}$')),
});

export const createStorySchema = z.string().min(4).max(120);
