import { makeExecutableSchema } from '@graphql-tools/schema';
import { Story } from '@prisma/client';
import { GraphQlContext } from './context';
import typeDefs from './schema.graphql';

const resolvers = {
  Query: {
    info: () =>
      "This is the Stories API, user's can sign up and post short stories for others to read.",
    feed: async (parent: unknown, args: {}, context: GraphQlContext) => {
      return context.prisma.story.findMany({});
    },
  },
  Story: {
    id: (parent: Story) => parent.id,
    text: (parent: Story) => parent.text,
  },
  Mutation: {
    post: async (
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
  },
};

export const schema = makeExecutableSchema({ typeDefs, resolvers });
