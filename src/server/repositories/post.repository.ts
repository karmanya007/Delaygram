import { PostScope, Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";

const postCardInclude = {
  author: {
    select: {
      id: true,
      name: true,
      image: true,
      userName: true,
    },
  },
  comments: {
    include: {
      author: {
        select: {
          id: true,
          name: true,
          image: true,
          userName: true,
        },
      },
    },
    orderBy: {
      createdAt: "asc",
    },
  },
  likes: {
    select: {
      userId: true,
    },
  },
  media: {
    orderBy: {
      order: "asc",
    },
    select: {
      id: true,
      url: true,
      type: true,
      order: true,
    },
  },
  savedBy: {
    select: {
      userId: true,
    },
  },
  _count: {
    select: {
      likes: true,
      comments: true,
    },
  },
} satisfies Prisma.PostInclude;

export const postRepository = {
  async listGlobalFeedPosts() {
    return prisma.post.findMany({
      where: { scope: PostScope.GLOBAL },
      orderBy: [{ isPinned: "desc" }, { createdAt: "desc" }],
      include: postCardInclude,
    });
  },

  async listRoomFeedPosts(roomId: string) {
    return prisma.post.findMany({
      where: { roomId },
      orderBy: [{ isPinned: "desc" }, { createdAt: "desc" }],
      include: postCardInclude,
    });
  },

  async listGlobalFeedPostsPaginated(cursor?: string, take = 20) {
    return prisma.post.findMany({
      where: { scope: PostScope.GLOBAL },
      orderBy: [{ isPinned: "desc" }, { createdAt: "desc" }],
      take: take + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      include: postCardInclude,
    });
  },

  async listRoomFeedPostsPaginated(roomId: string, cursor?: string, take = 20) {
    return prisma.post.findMany({
      where: { roomId },
      orderBy: [{ isPinned: "desc" }, { createdAt: "desc" }],
      take: take + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      include: postCardInclude,
    });
  },

  async listPostsByAuthor(userId: string) {
    return prisma.post.findMany({
      where: { authorId: userId },
      orderBy: [{ isPinned: "desc" }, { createdAt: "desc" }],
      include: postCardInclude,
    });
  },

  async listLikedPosts(userId: string) {
    return prisma.post.findMany({
      where: {
        likes: {
          some: {
            userId,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      include: postCardInclude,
    });
  },

  async listSavedPosts(userId: string) {
    return prisma.post.findMany({
      where: {
        savedBy: {
          some: {
            userId,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      include: postCardInclude,
    });
  },

  async createPost(data: {
    authorId: string;
    content: string | null;
    image: string | null;
    roomId?: string;
    mediaItems?: Array<{ url: string; type: "IMAGE" | "VIDEO"; order: number }>;
  }) {
    return prisma.post.create({
      data: {
        authorId: data.authorId,
        content: data.content,
        image: data.image,
        roomId: data.roomId,
        scope: data.roomId ? PostScope.ROOM : PostScope.GLOBAL,
        ...(data.mediaItems?.length
          ? {
              media: {
                create: data.mediaItems,
              },
            }
          : {}),
      },
    });
  },

  async findById(postId: string) {
    return prisma.post.findUnique({
      where: { id: postId },
      select: {
        id: true,
        authorId: true,
        roomId: true,
        isPinned: true,
      },
    });
  },

  async findScopedPost(postId: string, roomId: string | null) {
    return prisma.post.findFirst({
      where: {
        id: postId,
        roomId,
      },
      select: {
        id: true,
        authorId: true,
        roomId: true,
      },
    });
  },

  async delete(postId: string) {
    return prisma.post.delete({
      where: { id: postId },
    });
  },

  async findLike(userId: string, postId: string) {
    return prisma.like.findUnique({
      where: {
        userId_postId: {
          userId,
          postId,
        },
      },
    });
  },

  async deleteLike(userId: string, postId: string) {
    return prisma.like.delete({
      where: {
        userId_postId: {
          userId,
          postId,
        },
      },
    });
  },

  async createComment(data: {
    authorId: string;
    postId: string;
    content: string;
    image?: string | null;
  }) {
    return prisma.comment.create({
      data,
    });
  },

  async createLike(userId: string, postId: string) {
    return prisma.like.create({
      data: {
        userId,
        postId,
      },
    });
  },

  async findSavedPost(userId: string, postId: string) {
    return prisma.savedPost.findUnique({
      where: {
        userId_postId: {
          userId,
          postId,
        },
      },
    });
  },

  async createSavedPost(userId: string, postId: string) {
    return prisma.savedPost.create({
      data: { userId, postId },
    });
  },

  async deleteSavedPost(userId: string, postId: string) {
    return prisma.savedPost.delete({
      where: {
        userId_postId: {
          userId,
          postId,
        },
      },
    });
  },

  async setPinned(postId: string, isPinned: boolean) {
    return prisma.post.update({
      where: { id: postId },
      data: {
        isPinned,
        pinnedAt: isPinned ? new Date() : null,
      },
    });
  },

  async findPinnedPostByAuthor(authorId: string) {
    return prisma.post.findFirst({
      where: { authorId, isPinned: true },
      select: { id: true },
    });
  },

  async findFollowerIds(userId: string) {
    const follows = await prisma.follows.findMany({
      where: { followingId: userId },
      select: { followerId: true },
    });
    return follows.map((f) => f.followerId);
  },

  async transaction<T>(
    callback: (tx: Omit<Prisma.TransactionClient, "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends">) => Promise<T>,
  ) {
    return prisma.$transaction(callback);
  },
};
