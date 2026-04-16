import { nanoid } from "nanoid";

import { AppError } from "@/lib/errors";
import { requireAppSession } from "@/lib/auth/session";
import { roomRepository } from "@/server/repositories/room.repository";
import { notificationRepository } from "@/server/repositories/notification.repository";
import { sendRoomInviteEmail } from "@/lib/email";
import { prisma } from "@/lib/prisma";

export const roomService = {
  async createRoom(input: {
    name: string;
    description: string;
    users?: Array<{ id: string; email?: string }>;
  }) {
    const session = await requireAppSession();
    const roomSlug = `${input.name.replace(/\s+/g, "-").toLowerCase()}-${nanoid(8)}`;
    const invitedUsers =
      input.users?.filter((user) => user.id !== session.userId) ?? [];
    const inviteId = invitedUsers.length ? nanoid(10) : undefined;

    const room = await roomRepository.createRoomWithMembershipAndInvites({
      name: input.name,
      description: input.description,
      roomSlug,
      adminId: session.userId,
      invitedUsers: invitedUsers.map((user) => ({
        userId: user.id,
        userEmail: user.email,
      })),
      inviteId,
    });

    // Notify and email invited users
    if (invitedUsers.length && inviteId) {
      await Promise.all(
        invitedUsers.map(async (u) => {
          await notificationRepository.create({
            type: "ROOM_INVITE",
            userId: u.id,
            creatorId: session.userId,
            roomId: room.id,
            scope: "ROOM",
          });
          if (u.email) {
            await sendRoomInviteEmail({
              toEmail: u.email,
              roomName: input.name,
              inviteId,
            });
          }
        }),
      );
    }

    return room;
  },

  async createRoomInvite(input: {
    users: Array<{ id: string; email?: string }>;
    roomId: string;
    inviteId: string;
  }) {
    const session = await requireAppSession();
    const room = await roomRepository.findAccessibleRoomForUserById(
      session.userId,
      input.roomId,
    );

    if (!room) {
      throw new AppError("forbidden", "You do not have access to this room");
    }

    const isAdmin = await roomRepository.isRoomAdmin(session.userId, input.roomId);
    if (!isAdmin) {
      throw new AppError("forbidden", "Only room admins can invite members");
    }

    const usersToInvite = input.users.filter((user) => user.id !== session.userId);

    await roomRepository.createInviteEntries(
      usersToInvite.map((user) => ({
        roomId: input.roomId,
        userId: user.id,
        userEmail: user.email || "",
        inviteLink: input.inviteId,
      })),
    );

    // Notify and email each invited user
    await Promise.all(
      usersToInvite.map(async (u) => {
        await notificationRepository.create({
          type: "ROOM_INVITE",
          userId: u.id,
          creatorId: session.userId,
          roomId: input.roomId,
          scope: "ROOM",
        });
        if (u.email) {
          await sendRoomInviteEmail({
            toEmail: u.email,
            roomName: room.name,
            inviteId: input.inviteId,
          });
        }
      }),
    );

    return input.inviteId;
  },

  async updateRoomDetails(input: {
    roomId: string;
    name: string;
    description: string;
  }) {
    const session = await requireAppSession();
    const room = await roomRepository.findAccessibleRoomForUserById(
      session.userId,
      input.roomId,
    );

    if (!room) {
      throw new AppError("forbidden", "You do not have access to this room");
    }

    const isAdmin = await roomRepository.isRoomAdmin(session.userId, input.roomId);
    if (!isAdmin) {
      throw new AppError("forbidden", "Only room admins can update room settings");
    }

    return roomRepository.updateRoomDetails({
      roomId: input.roomId,
      name: input.name,
      description: input.description,
    });
  },

  async acceptInvite(input: { inviteId: string }) {
    const session = await requireAppSession();
    const invite = await roomRepository.findInviteForUser(session.userId, input.inviteId);

    if (!invite) {
      throw new AppError("forbidden", "Invite is invalid for this account");
    }

    const room = await roomRepository.findAccessibleRoomForUserById(
      session.userId,
      invite.roomId,
    );

    if (!room) {
      await roomRepository.joinRoom(session.userId, invite.roomId);
    }

    const accessibleRoom = await roomRepository.findAccessibleRoomForUserById(
      session.userId,
      invite.roomId,
    );

    if (!accessibleRoom) {
      throw new AppError("not_found", "Room was not found");
    }

    return accessibleRoom;
  },
};
