import { makeExecutableSchema } from '@graphql-tools/schema';
import typeDefs from './schema.graphql';

const resolvers = {
  Query: {
    info: () => 'Hello, world',
  },
};

export const schema = makeExecutableSchema({ typeDefs, resolvers });
