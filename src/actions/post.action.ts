"use server";

import { revalidateTag } from "next/cache";
import { z } from "zod";

import { fail, ok, type ActionResult } from "@/lib/action-result";
import { getAppSession } from "@/lib/auth/session";
import { cacheTags } from "@/lib/cache-tags";
import { isAppError } from "@/lib/errors";
import { logError } from "@/lib/logger";
import { checkRateLimit } from "@/lib/rate-limit";
import { runWithTrace } from "@/lib/trace";
import { postRepository } from "@/server/repositories/post.repository";
import { getPostsQuery } from "@/server/queries/feed.query";
import { postService } from "@/server/services/post.service";

const mediaItemSchema = z.object({
  url: z.string().url(),
  type: z.enum(["IMAGE", "VIDEO"]),
  order: z.number().int().min(0),
});

const createPostSchema = z.object({
  content: z.string().min(0).max(300).default(""),
  image: z.string().url().or(z.literal("")).default(""),
  roomId: z.string().optional(),
  mediaItems: z.array(mediaItemSchema).max(15).optional(),
  mentionedUserIds: z.array(z.string()).optional(),
});

const toggleLikeSchema = z.object({
  postId: z.string().min(1),
  roomId: z.string().nullable(),
});

const createCommentSchema = z.object({
  postId: z.string().min(1),
  content: z.string().min(1).max(500),
  roomId: z.string().nullable(),
  image: z.string().url().or(z.literal("")).optional(),
  mentionedUserIds: z.array(z.string()).optional(),
});

const deletePostSchema = z.object({
  postId: z.string().min(1),
});

const toggleSaveSchema = z.object({
  postId: z.string().min(1),
});

const togglePinSchema = z.object({
  postId: z.string().min(1),
});

const getPostsPaginatedSchema = z.object({
  cursor: z.string().optional(),
  roomId: z.string().optional(),
  take: z.number().min(1).max(50).default(20),
});

type PostMutationPayload = {
  authorId: string;
  roomId: string | null;
};

function invalidatePostSurfaces(post: PostMutationPayload) {
  if (post.roomId) {
    revalidateTag(cacheTags.feedRoom(post.roomId));
  } else {
    revalidateTag(cacheTags.feedGlobal());
  }

  revalidateTag(cacheTags.profile(post.authorId));
}

export async function createPost(
  input: z.input<typeof createPostSchema>,
): Promise<ActionResult<Awaited<ReturnType<typeof postService.createPost>>>> {
  return runWithTrace(async () => {
    try {
      const parsed = createPostSchema.parse(input);
      const session = await getAppSession({ provision: true });
      if (session) {
        const { allowed } = checkRateLimit(`createPost:${session.userId}`, 10, 60);
        if (!allowed) return fail("conflict", "Too many posts. Please wait a minute.");
      }
      const post = await postService.createPost(parsed);
      invalidatePostSurfaces({ authorId: post.authorId, roomId: post.roomId ?? null });
      return ok(post);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return fail("validation", error.errors[0]?.message ?? "Invalid post payload");
      }
      if (isAppError(error)) {
        return fail(error.code, error.message);
      }
      logError("actions.createPost", error);
      return fail("infrastructure", "Failed to create post");
    }
  });
}

export async function getPosts(roomId?: string) {
  return getPostsQuery(roomId);
}

export async function getPostsPaginated(
  input: z.input<typeof getPostsPaginatedSchema>,
): Promise<ActionResult<{ posts: Awaited<ReturnType<typeof getPostsQuery>>; nextCursor: string | null }>> {
  try {
    const parsed = getPostsPaginatedSchema.parse(input);
    const take = parsed.take;
    const rawPosts = parsed.roomId
      ? await postRepository.listRoomFeedPostsPaginated(parsed.roomId, parsed.cursor, take)
      : await postRepository.listGlobalFeedPostsPaginated(parsed.cursor, take);

    const hasNextPage = rawPosts.length > take;
    const posts = hasNextPage ? rawPosts.slice(0, take) : rawPosts;
    const nextCursor = hasNextPage ? (posts[posts.length - 1]?.id ?? null) : null;

    return ok({ posts, nextCursor });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return fail("validation", error.errors[0]?.message ?? "Invalid pagination payload");
    }
    logError("actions.getPostsPaginated", error);
    return fail("infrastructure", "Failed to fetch posts");
  }
}

export async function toggleLike(
  input: z.input<typeof toggleLikeSchema>,
): Promise<ActionResult<{ liked: boolean }>> {
  return runWithTrace(async () => {
    try {
      const parsed = toggleLikeSchema.parse(input);
      const session = await getAppSession({ provision: true });
      if (session) {
        const { allowed } = checkRateLimit(`toggleLike:${session.userId}`, 30, 60);
        if (!allowed) return fail("conflict", "Too many likes. Please wait a minute.");
      }
      const result = await postService.toggleLike(parsed);
      invalidatePostSurfaces(result.post);
      revalidateTag(cacheTags.notifications(result.post.authorId));
      return ok({ liked: result.liked });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return fail("validation", error.errors[0]?.message ?? "Invalid like payload");
      }
      if (isAppError(error)) {
        return fail(error.code, error.message);
      }
      logError("actions.toggleLike", error);
      return fail("infrastructure", "Failed to toggle like");
    }
  });
}

export async function createComment(
  input: z.input<typeof createCommentSchema>,
): Promise<ActionResult<{ commentId: string }>> {
  return runWithTrace(async () => {
    try {
      const parsed = createCommentSchema.parse(input);
      const session = await getAppSession({ provision: true });
      if (session) {
        const { allowed } = checkRateLimit(`createComment:${session.userId}`, 20, 60);
        if (!allowed) return fail("conflict", "Too many comments. Please wait a minute.");
      }
      const result = await postService.createComment(parsed);
      invalidatePostSurfaces(result.post);
      revalidateTag(cacheTags.notifications(result.post.authorId));
      return ok({ commentId: result.comment.id });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return fail("validation", error.errors[0]?.message ?? "Invalid comment payload");
      }
      if (isAppError(error)) {
        return fail(error.code, error.message);
      }
      logError("actions.createComment", error);
      return fail("infrastructure", "Failed to create comment");
    }
  });
}

export async function deletePost(
  input: z.input<typeof deletePostSchema>,
): Promise<ActionResult<{ deleted: true }>> {
  return runWithTrace(async () => {
    try {
      const parsed = deletePostSchema.parse(input);
      const session = await getAppSession({ provision: true });
      if (session) {
        const { allowed } = checkRateLimit(`deletePost:${session.userId}`, 10, 60);
        if (!allowed) return fail("conflict", "Too many deletions. Please wait a minute.");
      }
      const result = await postService.deletePost(parsed);
      invalidatePostSurfaces(result.post);
      return ok({ deleted: true });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return fail("validation", error.errors[0]?.message ?? "Invalid delete payload");
      }
      if (isAppError(error)) {
        return fail(error.code, error.message);
      }
      logError("actions.deletePost", error);
      return fail("infrastructure", "Failed to delete post");
    }
  });
}

export async function toggleSavePost(
  input: z.input<typeof toggleSaveSchema>,
): Promise<ActionResult<{ saved: boolean }>> {
  return runWithTrace(async () => {
    try {
      const parsed = toggleSaveSchema.parse(input);
      const session = await getAppSession({ provision: true });
      if (!session) return fail("unauthenticated", "Sign in to save posts");
      const { allowed } = checkRateLimit(`toggleSave:${session.userId}`, 30, 60);
      if (!allowed) return fail("conflict", "Too many saves. Please wait a minute.");
      const result = await postService.toggleSavePost(parsed);
      revalidateTag(cacheTags.profile(session.userId));
      return ok(result);
    } catch (error) {
      if (isAppError(error)) return fail(error.code, error.message);
      logError("actions.toggleSavePost", error);
      return fail("infrastructure", "Failed to save post");
    }
  });
}

export async function togglePinPost(
  input: z.input<typeof togglePinSchema>,
): Promise<ActionResult<{ pinned: boolean }>> {
  return runWithTrace(async () => {
    try {
      const parsed = togglePinSchema.parse(input);
      const session = await getAppSession({ provision: true });
      if (session) {
        const { allowed } = checkRateLimit(`togglePin:${session.userId}`, 10, 60);
        if (!allowed) return fail("conflict", "Too many pin toggles. Please wait a minute.");
      }
      const result = await postService.togglePinPost(parsed);
      if (result.post.roomId) {
        revalidateTag(cacheTags.feedRoom(result.post.roomId));
      } else {
        revalidateTag(cacheTags.profile(result.post.authorId));
        revalidateTag(cacheTags.feedGlobal());
      }
      return ok({ pinned: result.pinned });
    } catch (error) {
      if (isAppError(error)) return fail(error.code, error.message);
      logError("actions.togglePinPost", error);
      return fail("infrastructure", "Failed to pin post");
    }
  });
}

export async function getSavedPosts(): Promise<ActionResult<Awaited<ReturnType<typeof postRepository.listSavedPosts>>>> {
  try {
    const session = await getAppSession({ provision: true });
    if (!session) return fail("unauthenticated", "Sign in to view saved posts");
    const posts = await postRepository.listSavedPosts(session.userId);
    return ok(posts);
  } catch (error) {
    logError("actions.getSavedPosts", error);
    return fail("infrastructure", "Failed to fetch saved posts");
  }
}
