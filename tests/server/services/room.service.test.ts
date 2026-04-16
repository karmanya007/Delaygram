import { beforeEach, describe, expect, it, vi } from "vitest";

const requireAppSessionMock = vi.fn();
const createRoomWithMembershipAndInvitesMock = vi.fn();
const createInviteEntriesMock = vi.fn();
const findAccessibleRoomForUserByIdMock = vi.fn();
const findInviteForUserMock = vi.fn();
const isRoomAdminMock = vi.fn();
const joinRoomMock = vi.fn();
const updateRoomDetailsMock = vi.fn();
const createNotificationMock = vi.fn();
const sendRoomInviteEmailMock = vi.fn();

vi.mock("nanoid", () => ({
  nanoid: vi.fn(() => "generated-id"),
}));

vi.mock("@/lib/auth/session", () => ({
  requireAppSession: requireAppSessionMock,
}));

vi.mock("@/server/repositories/room.repository", () => ({
  roomRepository: {
    createRoomWithMembershipAndInvites: createRoomWithMembershipAndInvitesMock,
    createInviteEntries: createInviteEntriesMock,
    findAccessibleRoomForUserById: findAccessibleRoomForUserByIdMock,
    findInviteForUser: findInviteForUserMock,
    isRoomAdmin: isRoomAdminMock,
    joinRoom: joinRoomMock,
    updateRoomDetails: updateRoomDetailsMock,
  },
}));

vi.mock("@/server/repositories/notification.repository", () => ({
  notificationRepository: {
    create: createNotificationMock,
  },
}));

vi.mock("@/lib/email", () => ({
  sendRoomInviteEmail: sendRoomInviteEmailMock,
}));

describe("roomService", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    requireAppSessionMock.mockResolvedValue({ userId: "user_1" });
  });

  it("creates room with creator membership and optional invites", async () => {
    createRoomWithMembershipAndInvitesMock.mockResolvedValue({
      id: "room_1",
      name: "General",
      roomSlug: "general-generated-id",
    });

    const { roomService } = await import("@/server/services/room.service");
    await roomService.createRoom({
      name: "General",
      description: "desc",
      users: [{ id: "user_2" }, { id: "user_1" }],
    });

    expect(createRoomWithMembershipAndInvitesMock).toHaveBeenCalledWith(
      expect.objectContaining({
        adminId: "user_1",
        invitedUsers: [{ userId: "user_2", userEmail: undefined }],
      }),
    );
  });

  it("rejects invite acceptance for non-invited users", async () => {
    findInviteForUserMock.mockResolvedValue(null);

    const { roomService } = await import("@/server/services/room.service");
    await expect(roomService.acceptInvite({ inviteId: "invite_1" })).rejects.toMatchObject({
      code: "forbidden",
    });
  });

  it("creates membership idempotently when accepting invite", async () => {
    findInviteForUserMock.mockResolvedValue({
      id: "invite_db_1",
      roomId: "room_1",
      inviteLink: "invite_1",
    });
    findAccessibleRoomForUserByIdMock
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        id: "room_1",
        name: "General",
        roomSlug: "general-generated-id",
      });

    const { roomService } = await import("@/server/services/room.service");
    await expect(roomService.acceptInvite({ inviteId: "invite_1" })).resolves.toEqual({
      id: "room_1",
      name: "General",
      roomSlug: "general-generated-id",
    });

    expect(joinRoomMock).toHaveBeenCalledWith("user_1", "room_1");
  });

  it("rejects room settings updates for non-admin members", async () => {
    findAccessibleRoomForUserByIdMock.mockResolvedValue({
      id: "room_1",
      name: "General",
      description: "desc",
      roomSlug: "general-generated-id",
      adminId: "user_2",
    });
    isRoomAdminMock.mockResolvedValue(false);

    const { roomService } = await import("@/server/services/room.service");
    await expect(
      roomService.updateRoomDetails({
        roomId: "room_1",
        name: "General",
        description: "updated desc",
      }),
    ).rejects.toMatchObject({
      code: "forbidden",
    });
  });

  it("updates room settings for admins", async () => {
    findAccessibleRoomForUserByIdMock.mockResolvedValue({
      id: "room_1",
      name: "General",
      description: "desc",
      roomSlug: "general-generated-id",
      adminId: "user_1",
    });
    isRoomAdminMock.mockResolvedValue(true);
    updateRoomDetailsMock.mockResolvedValue({
      id: "room_1",
      name: "Announcements",
      description: "updated desc",
      roomSlug: "general-generated-id",
      adminId: "user_1",
    });

    const { roomService } = await import("@/server/services/room.service");
    await expect(
      roomService.updateRoomDetails({
        roomId: "room_1",
        name: "Announcements",
        description: "updated desc",
      }),
    ).resolves.toEqual({
      id: "room_1",
      name: "Announcements",
      description: "updated desc",
      roomSlug: "general-generated-id",
      adminId: "user_1",
    });

    expect(updateRoomDetailsMock).toHaveBeenCalledWith({
      roomId: "room_1",
      name: "Announcements",
      description: "updated desc",
    });
  });
});
