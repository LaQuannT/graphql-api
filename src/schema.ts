import { makeExecutableSchema } from '@graphql-tools/schema';
import { GraphQlContext } from './lib/context';
import typeDefs from './schema.graphql';
import { compare, hash } from 'bcryptjs';
import createToken from './lib/createToken';
import {
  createStorySchema,
  loginUserSchema,
  registerUserSchema,
} from './lib/objectSchemas';
import { fromZodError } from 'zod-validation-error';
import { Story, User } from '@prisma/client';

const resolvers = {
  Query: {
    info: () =>
      "This is the Stories API, user's can sign up and post short stories for others to read.",
    feed: async (parent: unknown, args: {}, context: GraphQlContext) => {
      return context.prisma.story.findMany({});
    },
    me: (parent: unknown, args: {}, context: GraphQlContext) => {
      if (context.currentUser === null) {
        throw new Error('Unauthenticated!');
      }
      return context.currentUser;
    },
  },
  Mutation: {
    createStory: async (
      parent: unknown,
      args: { text: string },
      context: GraphQlContext
    ) => {
      if (context.currentUser === null) {
        throw new Error('Unauthenticated!');
      }

      const result = createStorySchema.safeParse(args.text);

      if (!result.success) {
        throw fromZodError(result.error);
      }

      const newStory = await context.prisma.story.create({
        data: {
          text: args.text,
          author: { connect: { id: context.currentUser.id } },
        },
      });
      return newStory;
    },
    register: async (
      parent: unknown,
      args: {
        username: string;
        password: string;
        confirmedPassword: string;
        email: string;
      },
      context: GraphQlContext
    ) => {
      const result = registerUserSchema.safeParse({ ...args });
      if (!result.success) {
        throw fromZodError(result.error);
      }

      const hashedPassword = await hash(args.password, 10);
      const user = await context.prisma.user.create({
        data: {
          email: args.email,
          username: args.username,
          password: hashedPassword,
        },
      });

      const token = createToken(user.id);

      return { token, user };
    },
    login: async (
      parent: unknown,
      args: { username: string; password: string },
      context: GraphQlContext
    ) => {
      const result = loginUserSchema.safeParse({ ...args });
      if (!result.success) {
        throw fromZodError(result.error);
      }

      const user = await context.prisma.user.findUnique({
        where: {
          username: args.username,
        },
      });

      if (!user) throw new Error('User not found');

      const isPasswordValid = await compare(args.password, user.password);

      if (!isPasswordValid) throw new Error('Invalid password');

      const token = createToken(user.id);

      return { token, user };
    },
  },
  Story: {
    author: async (parent: Story, args: {}, context: GraphQlContext) => {
      if (!parent.authorId) {
        return null;
      }

      return context.prisma.story
        .findUnique({ where: { id: parent.id } })
        .author();
    },
  },
  User: {
    stories: (parent: User, args: {}, context: GraphQlContext) => {
      return context.prisma.user
        .findUnique({ where: { id: parent.id } })
        .stories();
    },
  },
};

export const schema = makeExecutableSchema({ typeDefs, resolvers });
