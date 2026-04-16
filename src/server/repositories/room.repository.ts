import { prisma } from "@/lib/prisma";

export const roomRepository = {
  async createRoomWithMembershipAndInvites(data: {
    name: string;
    description: string;
    roomSlug: string;
    adminId: string;
    invitedUsers?: Array<{ userId: string; userEmail?: string }>;
    inviteId?: string;
  }) {
    return prisma.$transaction(async (tx) => {
      const room = await tx.room.create({
        data: {
          name: data.name,
          description: data.description,
          roomSlug: data.roomSlug,
          adminId: data.adminId,
        },
      });

      await tx.roomMember.upsert({
        where: {
          userId_roomId: {
            userId: data.adminId,
            roomId: room.id,
          },
        },
        update: {},
        create: {
          userId: data.adminId,
          roomId: room.id,
        },
      });

      if (data.invitedUsers?.length && data.inviteId) {
        await tx.roomInviteDetails.createMany({
          data: data.invitedUsers.map((user) => ({
            roomId: room.id,
            userId: user.userId,
            userEmail: user.userEmail ?? "",
            inviteLink: data.inviteId!,
          })),
          skipDuplicates: true,
        });
      }

      return room;
    });
  },

  async createInviteEntries(entries: Array<{
    roomId: string;
    userId: string;
    userEmail: string;
    inviteLink: string;
  }>) {
    return prisma.roomInviteDetails.createMany({
      data: entries,
      skipDuplicates: true,
    });
  },

  async validateInvite(userId: string, inviteId: string) {
    const invite = await this.findInviteForUser(userId, inviteId);
    return Boolean(invite);
  },

  async findInviteForUser(userId: string, inviteId: string) {
    return prisma.roomInviteDetails.findFirst({
      where: {
        userId,
        inviteLink: inviteId,
      },
      select: {
        id: true,
        roomId: true,
        inviteLink: true,
      },
    });
  },

  async listRoomsForUser(userId: string) {
    const [memberships, adminRooms] = await Promise.all([
      prisma.roomMember.findMany({
        where: { userId },
        include: {
          room: {
            select: {
              id: true,
              name: true,
              roomSlug: true,
            },
          },
        },
      }),
      prisma.room.findMany({
        where: { adminId: userId },
        select: {
          id: true,
          name: true,
          roomSlug: true,
        },
      }),
    ]);

    const roomMap = new Map<string, { id: string; name: string; roomSlug: string }>();

    for (const membership of memberships) {
      roomMap.set(membership.room.id, membership.room);
    }

    for (const room of adminRooms) {
      roomMap.set(room.id, room);
    }

    return Array.from(roomMap.values());
  },

  async findAccessibleRoomForUserBySlug(userId: string, roomSlug: string) {
    return prisma.room.findFirst({
      where: {
        roomSlug,
        OR: [
          { adminId: userId },
          { members: { some: { userId } } },
        ],
      },
      select: {
        id: true,
        name: true,
        description: true,
        roomSlug: true,
        adminId: true,
      },
    });
  },

  async findAccessibleRoomForUserById(userId: string, roomId: string) {
    return prisma.room.findFirst({
      where: {
        id: roomId,
        OR: [{ adminId: userId }, { members: { some: { userId } } }],
      },
      select: {
        id: true,
        name: true,
        description: true,
        roomSlug: true,
        adminId: true,
      },
    });
  },

  async findAdminRoomForUserBySlug(userId: string, roomSlug: string) {
    return prisma.room.findFirst({
      where: {
        roomSlug,
        adminId: userId,
      },
      select: {
        id: true,
        name: true,
        description: true,
        roomSlug: true,
        adminId: true,
        members: {
          select: {
            userId: true,
            joinedAt: true,
            user: {
              select: {
                id: true,
                userName: true,
                name: true,
                image: true,
              },
            },
          },
          orderBy: {
            joinedAt: "asc",
          },
        },
      },
    });
  },

  async updateRoomDetails(data: {
    roomId: string;
    name: string;
    description: string;
  }) {
    return prisma.room.update({
      where: { id: data.roomId },
      data: {
        name: data.name,
        description: data.description,
      },
      select: {
        id: true,
        name: true,
        description: true,
        roomSlug: true,
        adminId: true,
      },
    });
  },

  async listMemberUserIds(roomId: string) {
    const members = await prisma.roomMember.findMany({
      where: { roomId },
      select: {
        userId: true,
      },
    });

    return members.map((member) => member.userId);
  },

  async isRoomAdmin(userId: string, roomId: string) {
    const room = await prisma.room.findFirst({
      where: { id: roomId, adminId: userId },
      select: { id: true },
    });
    return Boolean(room);
  },

  async joinRoom(userId: string, roomId: string) {
    return prisma.roomMember.upsert({
      where: {
        userId_roomId: {
          userId,
          roomId,
        },
      },
      update: {},
      create: {
        userId,
        roomId,
      },
    });
  },
};
