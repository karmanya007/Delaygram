import { NotificationScope } from "@prisma/client";

import { AppError } from "@/lib/errors";
import { requireAppSession } from "@/lib/auth/session";
import { notificationRepository } from "@/server/repositories/notification.repository";
import { postRepository } from "@/server/repositories/post.repository";
import { roomRepository } from "@/server/repositories/room.repository";
import { prisma } from "@/lib/prisma";

export const postService = {
  async createPost(input: {
    content: string;
    image?: string;
    roomId?: string;
    mediaItems?: Array<{ url: string; type: "IMAGE" | "VIDEO"; order: number }>;
    mentionedUserIds?: string[];
  }) {
    const session = await requireAppSession();
    const content = input.content.trim();
    const image = input.image?.trim() || null;
    const hasMedia = (input.mediaItems?.length ?? 0) > 0;

    if (!content && !image && !hasMedia) {
      throw new AppError("validation", "Post content or media is required");
    }

    const post = await postRepository.createPost({
      authorId: session.userId,
      content: content || null,
      image,
      roomId: input.roomId,
      mediaItems: input.mediaItems,
    });

    // Create mention records
    if (input.mentionedUserIds?.length) {
      await prisma.postMention.createMany({
        data: input.mentionedUserIds.map((userId) => ({
          postId: post.id,
          userId,
        })),
        skipDuplicates: true,
      });

      // Notify mentioned users
      await Promise.all(
        input.mentionedUserIds
          .filter((uid) => uid !== session.userId)
          .map((uid) =>
            notificationRepository.create({
              type: "MENTION",
              userId: uid,
              creatorId: session.userId,
              postId: post.id,
              roomId: input.roomId ?? null,
              scope: input.roomId ? NotificationScope.ROOM : NotificationScope.GLOBAL,
            }),
          ),
      );
    }

    // Notify followers about new post
    const followerIds = await postRepository.findFollowerIds(session.userId);
    if (followerIds.length > 0) {
      await prisma.notification.createMany({
        data: followerIds
          .filter((fid) => fid !== session.userId)
          .map((followerId) => ({
            type: "NEW_POST" as const,
            userId: followerId,
            creatorId: session.userId,
            postId: post.id,
            roomId: input.roomId ?? null,
            scope: input.roomId ? NotificationScope.ROOM : NotificationScope.GLOBAL,
          })),
        skipDuplicates: true,
      });
    }

    return post;
  },

  async toggleLike(input: { postId: string; roomId: string | null }) {
    const session = await requireAppSession();
    const post = await postRepository.findScopedPost(input.postId, input.roomId);

    if (!post) {
      throw new AppError("not_found", "Post not found");
    }

    const existingLike = await postRepository.findLike(session.userId, input.postId);

    if (existingLike) {
      await postRepository.deleteLike(session.userId, input.postId);
      return { liked: false, post };
    }

    await postRepository.createLike(session.userId, input.postId);

    if (post.authorId !== session.userId) {
      await notificationRepository.create({
        type: "LIKE",
        userId: post.authorId,
        creatorId: session.userId,
        postId: input.postId,
        roomId: input.roomId,
        scope: input.roomId ? NotificationScope.ROOM : NotificationScope.GLOBAL,
      });
    }

    return { liked: true, post };
  },

  async createComment(input: {
    postId: string;
    content: string;
    roomId: string | null;
    image?: string | null;
    mentionedUserIds?: string[];
  }) {
    const session = await requireAppSession();
    const content = input.content.trim();

    if (!content) {
      throw new AppError("validation", "Comment content is required");
    }

    const post = await postRepository.findScopedPost(input.postId, input.roomId);

    if (!post) {
      throw new AppError("not_found", "Post not found");
    }

    const comment = await postRepository.transaction(async (tx) => {
      const newComment = await tx.comment.create({
        data: {
          content,
          authorId: session.userId,
          postId: input.postId,
          image: input.image ?? null,
        },
      });

      if (post.authorId !== session.userId) {
        await tx.notification.create({
          data: {
            type: "COMMENT",
            userId: post.authorId,
            creatorId: session.userId,
            postId: input.postId,
            commentId: newComment.id,
            roomId: input.roomId,
            scope: input.roomId ? NotificationScope.ROOM : NotificationScope.GLOBAL,
          },
        });
      }

      return newComment;
    });

    // Notify mentioned users in comment
    if (input.mentionedUserIds?.length) {
      await Promise.all(
        input.mentionedUserIds
          .filter((uid) => uid !== session.userId)
          .map((uid) =>
            notificationRepository.create({
              type: "MENTION",
              userId: uid,
              creatorId: session.userId,
              postId: input.postId,
              roomId: input.roomId,
              scope: input.roomId ? NotificationScope.ROOM : NotificationScope.GLOBAL,
            }),
          ),
      );
    }

    return { comment, post };
  },

  async deletePost(input: { postId: string }) {
    const session = await requireAppSession();
    const post = await postRepository.findById(input.postId);

    if (!post) {
      throw new AppError("not_found", "Post not found");
    }

    if (post.authorId !== session.userId) {
      throw new AppError("forbidden", "You cannot delete this post");
    }

    await postRepository.delete(input.postId);
    return { post };
  },

  async toggleSavePost(input: { postId: string }) {
    const session = await requireAppSession();
    const existing = await postRepository.findSavedPost(session.userId, input.postId);

    if (existing) {
      await postRepository.deleteSavedPost(session.userId, input.postId);
      return { saved: false };
    }

    await postRepository.createSavedPost(session.userId, input.postId);
    return { saved: true };
  },

  async togglePinPost(input: { postId: string }) {
    const session = await requireAppSession();
    const post = await postRepository.findById(input.postId);

    if (!post) {
      throw new AppError("not_found", "Post not found");
    }

    if (post.roomId) {
      const isRoomAdmin = await roomRepository.isRoomAdmin(session.userId, post.roomId);
      if (!isRoomAdmin) {
        throw new AppError("forbidden", "You cannot pin this post");
      }

      await postRepository.setPinned(input.postId, !post.isPinned);
      return { pinned: !post.isPinned, post };
    }

    if (post.authorId !== session.userId) {
      throw new AppError("forbidden", "You cannot pin this post");
    }

    if (!post.isPinned) {
      // Non-room pinning remains author-scoped (profile behavior).
      const existingPinned = await postRepository.findPinnedPostByAuthor(post.authorId);
      if (existingPinned) {
        await postRepository.setPinned(existingPinned.id, false);
      }
    }

    await postRepository.setPinned(input.postId, !post.isPinned);
    return { pinned: !post.isPinned, post };
  },
};
