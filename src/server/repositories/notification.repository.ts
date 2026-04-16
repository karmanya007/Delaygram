import { prisma } from "@/lib/prisma";

export const notificationRepository = {
  async listForUser(userId: string) {
    return prisma.notification.findMany({
      where: { userId },
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            userName: true,
            image: true,
          },
        },
        post: {
          select: {
            id: true,
            content: true,
            image: true,
          },
        },
        comment: {
          select: {
            id: true,
            content: true,
            createdAt: true,
          },
        },
        room: {
          select: {
            roomSlug: true,
            name: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });
  },

  async countUnreadForUser(userId: string) {
    return prisma.notification.count({
      where: {
        userId,
        read: false,
      },
    });
  },

  async markRead(notificationIds: string[], userId: string) {
    return prisma.notification.updateMany({
      where: {
        id: { in: notificationIds },
        userId,
      },
      data: { read: true },
    });
  },

  async create(data: {
    userId: string;
    creatorId: string;
    type: "LIKE" | "COMMENT" | "FOLLOW" | "NEW_POST" | "MENTION" | "ROOM_INVITE";
    postId?: string | null;
    commentId?: string | null;
    roomId?: string | null;
    scope?: "GLOBAL" | "ROOM";
  }) {
    return prisma.notification.create({
      data,
    });
  },
};
