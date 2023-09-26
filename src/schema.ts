import { makeExecutableSchema } from '@graphql-tools/schema';
import { GraphQlContext } from './lib/context';
import typeDefs from './schema.graphql';
import { compare, hash } from 'bcryptjs';
import createToken from './lib/createToken';
import {
  commentSchema,
  createStorySchema,
  loginUserSchema,
  registerUserSchema,
  updateStorySchema,
} from './lib/objectSchemas';
import { fromZodError } from 'zod-validation-error';
import { Comment, Story, User } from '@prisma/client';

interface delResponse {
  message: string;
}

const resolvers = {
  Query: {
    info: () =>
      "This is the Stories API, user's can sign up and post short stories for others to read.",
    feed: async (
      parent: unknown,
      args: { filter?: string; offset?: number; limit?: number },
      context: GraphQlContext
    ) => {
      const where = args.filter ? { title: { contains: args.filter } } : {};

      return await context.prisma.story.findMany({
        where,
        skip: args.offset,
        take: args.limit,
        orderBy: { createdAt: 'desc' },
      });
    },
    me: (parent: unknown, args: {}, context: GraphQlContext) => {
      if (context.currentUser === null) {
        throw new Error('Unauthenticated!');
      }
      return context.currentUser;
    },
    users: async (parent: unknown, args: {}, context: GraphQlContext) => {
      if (!context.currentUser) {
        throw new Error('Unauthorized');
      }

      if (!context.currentUser.isAdmin) {
        throw new Error('Unauthorized');
      }

      return await context.prisma.user.findMany({});
    },
  },
  Mutation: {
    createStory: async (
      parent: unknown,
      args: { text: string; title: string },
      context: GraphQlContext
    ) => {
      if (context.currentUser === null) {
        throw new Error('Unauthenticated!');
      }

      const result = createStorySchema.safeParse({ ...args });

      if (!result.success) {
        throw fromZodError(result.error);
      }

      const newStory = await context.prisma.story.create({
        data: {
          title: args.title,
          text: args.text,
          author: { connect: { id: context.currentUser.id } },
        },
      });
      return newStory;
    },
    deleteStory: async (
      parent: unknown,
      args: { id: number },
      context: GraphQlContext
    ) => {
      if (context.currentUser === null) {
        throw new Error('Unauthenticated!');
      }

      const storyToDel = context.currentUser.isAdmin
        ? await context.prisma.story.findUnique({ where: { id: args.id } })
        : await context.prisma.story.findUnique({
            where: {
              id: args.id,
              authorId: context.currentUser.id,
            },
          });

      if (!storyToDel) {
        throw new Error('Unauthorized');
      }

      await context.prisma.story.delete({ where: { id: args.id } });

      const response: delResponse = {
        message: 'Story successfully deleted',
      };

      return response;
    },
    updateStory: async (
      parent: unknown,
      args: { id: number; text: string; title: string },
      context: GraphQlContext
    ) => {
      if (context.currentUser === null) {
        throw new Error('Unauthenticated!');
      }

      const results = updateStorySchema.safeParse({ ...args });
      if (!results.success) {
        throw fromZodError(results.error);
      }

      const storyToUpdate = await context.prisma.story.findUnique({
        where: {
          id: args.id,
          authorId: context.currentUser.id,
        },
      });

      if (!storyToUpdate) {
        throw new Error('Unauthorized');
      }

      const updatedStory = await context.prisma.story.update({
        where: {
          id: args.id,
        },
        data: {
          title: args.title,
          text: args.text,
        },
      });

      return updatedStory;
    },
    register: async (
      parent: unknown,
      args: {
        username: string;
        password: string;
        confirmedPassword: string;
        email: string;
        isAdmin?: boolean;
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
          isAdmin: args.isAdmin,
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
    comment: async (
      parent: unknown,
      args: { storyId: number; text: string },
      context: GraphQlContext
    ) => {
      if (context.currentUser === null) {
        throw new Error('Unauthenticated!');
      }

      const results = commentSchema.safeParse({ ...args });
      if (!results.success) {
        throw fromZodError(results.error);
      }

      const story = await context.prisma.story.findUnique({
        where: {
          id: args.storyId,
        },
      });

      if (!story) {
        throw new Error('Story not found');
      }

      const newComment = await context.prisma.comment.create({
        data: {
          text: args.text,
          author: { connect: { id: context.currentUser.id } },
          story: { connect: { id: story.id } },
        },
      });

      return newComment;
    },

    deleteComment: async (
      parent: unknown,
      args: { id: number },
      context: GraphQlContext
    ) => {
      if (context.currentUser === null) {
        throw new Error('Unauthenticated!');
      }

      const commentToDelete = context.currentUser.isAdmin
        ? await context.prisma.comment.findUnique({ where: { id: args.id } })
        : await context.prisma.comment.findUnique({
            where: {
              id: args.id,
              authorId: context.currentUser.id,
            },
          });

      if (!commentToDelete) {
        throw new Error('Unauthorized');
      }

      await context.prisma.comment.delete({
        where: { id: args.id },
      });

      const response: delResponse = {
        message: 'Comment successfully deleted',
      };

      return response;
    },
    deleteUser: async (
      parent: unknown,
      args: { userId: number },
      context: GraphQlContext
    ) => {
      if (context.currentUser === null) {
        throw new Error('Unauthenticated!');
      }

      if (!context.currentUser.isAdmin) {
        throw new Error('Unauthorized');
      }

      const userToDelete = await context.prisma.user.findUnique({
        where: { id: args.userId },
      });
      if (!userToDelete) {
        throw new Error('User not found');
      }

      await context.prisma.user.delete({ where: { id: args.userId } });
      const res: delResponse = {
        message: 'User successfully deleted',
      };

      return res;
    },
  },
  Story: {
    author: async (parent: Story, args: {}, context: GraphQlContext) => {
      if (!parent.authorId) {
        return null;
      }

      return await context.prisma.story
        .findUnique({ where: { id: parent.id } })
        .author();
    },
    comments: async (parent: Story, args: {}, context: GraphQlContext) => {
      return await context.prisma.story
        .findUnique({
          where: {
            id: parent.id,
          },
        })
        .comments();
    },
  },
  User: {
    stories: async (parent: User, args: {}, context: GraphQlContext) => {
      return await context.prisma.user
        .findUnique({ where: { id: parent.id } })
        .stories();
    },
    comments: async (parent: Story, args: {}, context: GraphQlContext) => {
      return await context.prisma.user
        .findUnique({ where: { id: parent.id } })
        .comments();
    },
  },
  Comment: {
    author: async (parent: Comment, args: {}, context: GraphQlContext) => {
      return await context.prisma.comment
        .findUnique({ where: { id: parent.id } })
        .author();
    },
    story: async (parent: Comment, args: {}, context: GraphQlContext) => {
      return await context.prisma.comment
        .findUnique({ where: { id: parent.id } })
        .story();
    },
  },
};

export const schema = makeExecutableSchema({ typeDefs, resolvers });
