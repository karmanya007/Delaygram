import { unstable_cache } from "next/cache";

import { getAppSession } from "@/lib/auth/session";
import { cacheTags } from "@/lib/cache-tags";
import { roomRepository } from "@/server/repositories/room.repository";
import { postRepository } from "@/server/repositories/post.repository";
import { userRepository } from "@/server/repositories/user.repository";

export async function getPostsQuery(roomId?: string) {
  if (!roomId) {
    return unstable_cache(
      async () => postRepository.listGlobalFeedPosts(),
      [cacheTags.feedGlobal()],
      { tags: [cacheTags.feedGlobal()] },
    )();
  }

  return unstable_cache(
    async () => postRepository.listRoomFeedPosts(roomId),
    [cacheTags.feedRoom(roomId)],
    { tags: [cacheTags.feedRoom(roomId)] },
  )();
}

export type PostCardViewModel = Awaited<ReturnType<typeof getPostsQuery>>[number];

export async function getHomePageData() {
  const session = await getAppSession({ provision: true });
  const [posts, suggestedUsers] = await Promise.all([
    getPostsQuery(),
    session ? userRepository.findSuggestionsForUser(session.userId) : Promise.resolve([]),
  ]);

  return {
    session,
    posts,
    suggestedUsers,
  };
}

export async function getRoomPageData(roomSlug: string) {
  const session = await getAppSession({ provision: true });

  if (!session) {
    return {
      session: null,
      room: null,
      posts: [],
      suggestedUsers: [],
    };
  }

  const room = await roomRepository.findAccessibleRoomForUserBySlug(
    session.userId,
    roomSlug,
  );

  if (!room) {
    return {
      session,
      room: null,
      posts: [],
      suggestedUsers: [],
    };
  }

  const [posts, suggestedUsers] = await Promise.all([
    getPostsQuery(room.id),
    userRepository.findSuggestionsForUser(session.userId),
  ]);

  return {
    session,
    room,
    posts,
    suggestedUsers,
  };
}
