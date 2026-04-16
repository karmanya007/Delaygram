import { unstable_cache } from "next/cache";

import { getAppSession } from "@/lib/auth/session";
import { cacheTags } from "@/lib/cache-tags";
import { postRepository } from "@/server/repositories/post.repository";
import { userRepository } from "@/server/repositories/user.repository";

export async function getProfileByUsernameQuery(username: string) {
  return userRepository.findProfileByUsername(username);
}

export async function getUserPostsQuery(userId: string) {
  return unstable_cache(
    async () => postRepository.listPostsByAuthor(userId),
    [`profile-posts:${userId}`],
    { tags: [cacheTags.profile(userId)] },
  )();
}

export async function getUserLikedPostsQuery(userId: string) {
  return unstable_cache(
    async () => postRepository.listLikedPosts(userId),
    [`profile-liked-posts:${userId}`],
    { tags: [cacheTags.profile(userId)] },
  )();
}

export async function getUserSavedPostsQuery(userId: string) {
  return unstable_cache(
    async () => postRepository.listSavedPosts(userId),
    [`profile-saved-posts:${userId}`],
    { tags: [cacheTags.profile(userId)] },
  )();
}

export async function getProfilePageData(username: string) {
  const profile = await getProfileByUsernameQuery(username);

  if (!profile) {
    return null;
  }

  const session = await getAppSession({ provision: true });
  const [posts, likedPosts, follow, savedPosts] = await Promise.all([
    getUserPostsQuery(profile.id),
    getUserLikedPostsQuery(profile.id),
    session ? userRepository.findFollow(session.userId, profile.id) : Promise.resolve(null),
    session?.userId === profile.id ? getUserSavedPostsQuery(profile.id) : Promise.resolve([]),
  ]);

  return {
    session,
    user: profile,
    posts,
    likedPosts,
    savedPosts,
    isFollowing: Boolean(follow),
  };
}
