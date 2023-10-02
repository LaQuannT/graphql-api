import { z } from 'zod';

export const registerUserSchema = z
  .object({
    username: z.string().min(3).trim(),
    email: z.string().email().trim(),
    password: z
      .string()
      .min(8)
      .regex(/^(?=.*[0-9]+.*)(?=.*[a-zA-Z]+.*)[0-9a-zA-Z]{8,}$/),
    confirmedPassword: z
      .string()
      .min(8)
      .regex(/^(?=.*[0-9]+.*)(?=.*[a-zA-Z]+.*)[0-9a-zA-Z]{8,}$/),
  })
  .refine((data) => data.password === data.confirmedPassword, {
    message: 'Passwords must match',
    path: ['confirmedPassword'],
  });

export const loginUserSchema = z.object({
  username: z.string().min(3).trim(),
  password: z
    .string()
    .min(8)
    .regex(/^(?=.*[0-9]+.*)(?=.*[a-zA-Z]+.*)[0-9a-zA-Z]{8,}$/),
});

export const createStorySchema = z.object({
  title: z.string().min(4).max(80).trim(),
  text: z.string().min(4).max(280).trim(),
});

export const updateStorySchema = z.object({
  id: z.number(),
  title: z.string().min(4).max(80).trim(),
  text: z.string().min(4).max(280).trim(),
});

export const commentSchema = z.object({
  storyId: z.number(),
  text: z.string().min(4).max(120).trim(),
});
