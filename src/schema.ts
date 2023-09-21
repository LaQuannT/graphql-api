import { makeExecutableSchema } from '@graphql-tools/schema';
import { Story } from '@prisma/client';
import { GraphQlContext } from './lib/context';
import typeDefs from './schema.graphql';
import { compare, hash } from 'bcryptjs';
import createToken from './lib/createToken';

const resolvers = {
  Query: {
    info: () =>
      "This is the Stories API, user's can sign up and post short stories for others to read.",
    feed: async (parent: unknown, args: {}, context: GraphQlContext) => {
      return context.prisma.story.findMany({});
    },
  },
  Mutation: {
    createStory: async (
      parent: unknown,
      args: { text: string },
      context: GraphQlContext
    ) => {
      const newStory = await context.prisma.story.create({
        data: {
          text: args.text,
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
};

export const schema = makeExecutableSchema({ typeDefs, resolvers });
