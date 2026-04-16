import { beforeEach, describe, expect, it, vi } from "vitest";

const findManyRoomMembersMock = vi.fn();
const findManyRoomsMock = vi.fn();
const findFirstRoomMock = vi.fn();

vi.mock("@/lib/prisma", () => ({
  prisma: {
    roomMember: {
      findMany: findManyRoomMembersMock,
    },
    room: {
      findMany: findManyRoomsMock,
      findFirst: findFirstRoomMock,
      create: vi.fn(),
    },
    roomInviteDetails: {
      findFirst: vi.fn(),
      createMany: vi.fn(),
    },
  },
}));

describe("roomRepository.listRoomsForUser", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("deduplicates member rooms and admin rooms by room id", async () => {
    findManyRoomMembersMock.mockResolvedValue([
      {
        room: {
          id: "room_1",
          name: "General",
          roomSlug: "general",
        },
      },
    ]);

    findManyRoomsMock.mockResolvedValue([
      {
        id: "room_1",
        name: "General",
        roomSlug: "general",
      },
      {
        id: "room_2",
        name: "Private",
        roomSlug: "private",
      },
    ]);

    const { roomRepository } = await import("@/server/repositories/room.repository");
    await expect(roomRepository.listRoomsForUser("user_1")).resolves.toEqual([
      {
        id: "room_1",
        name: "General",
        roomSlug: "general",
      },
      {
        id: "room_2",
        name: "Private",
        roomSlug: "private",
      },
    ]);
  });

  it("loads admin room details by slug with members", async () => {
    findFirstRoomMock.mockResolvedValue({
      id: "room_1",
      name: "General",
      description: "Room description",
      roomSlug: "general",
      adminId: "user_1",
      members: [
        {
          userId: "user_1",
          joinedAt: new Date("2026-04-17T00:00:00.000Z"),
          user: {
            id: "user_1",
            userName: "alice",
            name: "Alice",
            image: null,
          },
        },
      ],
    });

    const { roomRepository } = await import("@/server/repositories/room.repository");
    await expect(roomRepository.findAdminRoomForUserBySlug("user_1", "general")).resolves.toEqual({
      id: "room_1",
      name: "General",
      description: "Room description",
      roomSlug: "general",
      adminId: "user_1",
      members: [
        {
          userId: "user_1",
          joinedAt: new Date("2026-04-17T00:00:00.000Z"),
          user: {
            id: "user_1",
            userName: "alice",
            name: "Alice",
            image: null,
          },
        },
      ],
    });

    expect(findFirstRoomMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          roomSlug: "general",
          adminId: "user_1",
        },
      }),
    );
  });
});
