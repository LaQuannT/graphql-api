import { makeExecutableSchema } from '@graphql-tools/schema';
import { type GraphQlContext } from './lib/context';
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
import { type Comment, type Like, type Story, type User } from '@prisma/client';
import { type channels } from './lib/pubsub';

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
      const where =
        args.filter != null ? { title: { contains: args.filter } } : {};

      return await context.prisma.story.findMany({
        where,
        skip: args.offset,
        take: args.limit,
        orderBy: { createdAt: 'desc' },
      });
    },
    me: (parent: unknown, context: GraphQlContext) => {
      if (context.currentUser === null) {
        throw new Error('Unauthenticated! User must be logged in.');
      }
      return context.currentUser;
    },
    users: async (parent: unknown, context: GraphQlContext) => {
      if (context.currentUser == null || !context.currentUser.isAdmin) {
        throw new Error(
          'User must be an Admin and logged in to get list of users!'
        );
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
        throw new Error('User must be logged in to create a story.');
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

      await context.pubSub.publish('newStory', { createdStory: newStory });

      return newStory;
    },
    deleteStory: async (
      parent: unknown,
      args: { id: number },
      context: GraphQlContext
    ) => {
      if (context.currentUser === null) {
        throw new Error('User must be logged in to delete story.');
      }

      const storyToDel = context.currentUser.isAdmin
        ? await context.prisma.story.findUnique({ where: { id: args.id } })
        : await context.prisma.story.findUnique({
            where: {
              id: args.id,
              authorId: context.currentUser.id,
            },
          });

      if (storyToDel == null) {
        throw new Error('Story not found.');
      }

      await context.prisma.story.delete({ where: { id: args.id } });

      const response: delResponse = {
        message: 'Story successfully deleted!',
      };

      return response;
    },
    updateStory: async (
      parent: unknown,
      args: { id: number; text: string; title: string },
      context: GraphQlContext
    ) => {
      if (context.currentUser === null) {
        throw new Error('User must be logged in to update story.');
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

      if (storyToUpdate == null) {
        throw new Error('Story not found!');
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

      if (user == null) throw new Error('User not found');

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
        throw new Error('User must be logged in to comment on story.');
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

      if (story == null) {
        throw new Error('Story not found!');
      }

      const newComment = await context.prisma.comment.create({
        data: {
          text: args.text,
          author: { connect: { id: context.currentUser.id } },
          story: { connect: { id: story.id } },
        },
      });

      await context.pubSub.publish('newComment', {
        createdComment: newComment,
      });

      return newComment;
    },

    deleteComment: async (
      parent: unknown,
      args: { id: number },
      context: GraphQlContext
    ) => {
      if (context.currentUser === null) {
        throw new Error('User must be logged in to delete comment.');
      }

      const commentToDelete = context.currentUser.isAdmin
        ? await context.prisma.comment.findUnique({ where: { id: args.id } })
        : await context.prisma.comment.findUnique({
            where: {
              id: args.id,
              authorId: context.currentUser.id,
            },
          });

      if (commentToDelete == null) {
        throw new Error('Comment not found!');
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
      if (context.currentUser === null || !context.currentUser.isAdmin) {
        throw new Error('User must be an Admin and logged in to delete user.');
      }

      const userToDelete = await context.prisma.user.findUnique({
        where: { id: args.userId },
      });
      if (userToDelete == null) {
        throw new Error('User not found!');
      }

      await context.prisma.user.delete({ where: { id: args.userId } });
      const res: delResponse = {
        message: 'User successfully deleted',
      };

      return res;
    },
    like: async (
      parent: unknown,
      args: { storyId: number },
      context: GraphQlContext
    ) => {
      if (context.currentUser === null) {
        throw new Error('You must login in order to like story!');
      }

      const like = await context.prisma.like.findUnique({
        where: {
          storyId_authorId: {
            storyId: args.storyId,
            authorId: context.currentUser.id,
          },
        },
      });

      if (like != null) {
        throw new Error(`Already liked story: ${args.storyId}`);
      }

      const newLike = await context.prisma.like.create({
        data: {
          author: { connect: { id: context.currentUser.id } },
          story: { connect: { id: args.storyId } },
        },
      });

      await context.pubSub.publish('newLike', { createdLike: newLike });

      return newLike;
    },
  },
  Subscription: {
    newStory: {
      subscribe: (parent: unknown, context: GraphQlContext) => {
        return context.pubSub.asyncIterator('newStory');
      },
      resolve: async (payload: channels['newStory'][0]) => {
        return payload.createdStory;
      },
    },
    newComment: {
      subscribe: (parent: unknown, context: GraphQlContext) => {
        return context.pubSub.asyncIterator('newComment');
      },
      resolve: async (payload: channels['newComment'][0]) => {
        return payload.createdComment;
      },
    },
    newLike: {
      subscribe: (parent: unknown, context: GraphQlContext) => {
        return context.pubSub.asyncIterator('newLike');
      },
      resolve: async (payload: channels['newLike'][0]) => {
        return payload.createdLike;
      },
    },
  },
  Story: {
    author: async (parent: Story, context: GraphQlContext) => {
      if (parent.authorId == null) {
        return null;
      }

      return await context.prisma.story
        .findUnique({ where: { id: parent.id } })
        .author();
    },
    comments: async (parent: Story, context: GraphQlContext) => {
      return await context.prisma.story
        .findUnique({
          where: {
            id: parent.id,
          },
        })
        .comments();
    },
    likes: async (parent: Story, context: GraphQlContext) => {
      return await context.prisma.story
        .findUnique({ where: { id: parent.id } })
        .likes();
    },
  },
  User: {
    stories: async (parent: User, context: GraphQlContext) => {
      return await context.prisma.user
        .findUnique({ where: { id: parent.id } })
        .stories();
    },
    comments: async (parent: Story, context: GraphQlContext) => {
      return await context.prisma.user
        .findUnique({ where: { id: parent.id } })
        .comments();
    },
  },
  Comment: {
    author: async (parent: Comment, context: GraphQlContext) => {
      return await context.prisma.comment
        .findUnique({ where: { id: parent.id } })
        .author();
    },
    story: async (parent: Comment, context: GraphQlContext) => {
      return await context.prisma.comment
        .findUnique({ where: { id: parent.id } })
        .story();
    },
  },
  Like: {
    story: async (parent: Like, context: GraphQlContext) => {
      return await context.prisma.like
        .findUnique({
          where: { id: parent.id },
        })
        .story();
    },
    author: async (parent: Like, context: GraphQlContext) => {
      return await context.prisma.like
        .findUnique({
          where: { id: parent.id },
        })
        .author();
    },
  },
};

export const schema = makeExecutableSchema({ typeDefs, resolvers });
