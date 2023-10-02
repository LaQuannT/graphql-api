import type { Comment, Like, Story } from '@prisma/client';
import { PubSub } from 'graphql-subscriptions';
import { TypedPubSub } from 'typed-graphql-subscriptions';

export type channels = {
  newStory: [{ createdStory: Story }];
  newComment: [{ createdComment: Comment }];
  newLike: [{ createdLike: Like }];
};

export const pubSub = new TypedPubSub<channels>(new PubSub());
