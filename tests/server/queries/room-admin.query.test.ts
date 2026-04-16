import { beforeEach, describe, expect, it, vi } from "vitest";

const getAppSessionMock = vi.fn();
const findAdminRoomForUserBySlugMock = vi.fn();

vi.mock("next/cache", () => ({
  unstable_cache: (fn: () => Promise<unknown>) => fn,
}));

vi.mock("@/lib/auth/session", () => ({
  getAppSession: getAppSessionMock,
}));

vi.mock("@/server/repositories/room.repository", () => ({
  roomRepository: {
    findAdminRoomForUserBySlug: findAdminRoomForUserBySlugMock,
  },
}));

describe("getRoomAdminPageData", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("returns signed-out defaults", async () => {
    getAppSessionMock.mockResolvedValue(null);

    const { getRoomAdminPageData } = await import("@/server/queries/room-admin.query");
    await expect(getRoomAdminPageData("general")).resolves.toEqual({
      session: null,
      room: null,
    });
  });

  it("returns null room for non-admin viewers", async () => {
    getAppSessionMock.mockResolvedValue({ userId: "user_2" });
    findAdminRoomForUserBySlugMock.mockResolvedValue(null);

    const { getRoomAdminPageData } = await import("@/server/queries/room-admin.query");
    await expect(getRoomAdminPageData("general")).resolves.toEqual({
      session: { userId: "user_2" },
      room: null,
    });
  });

  it("returns room data for admins", async () => {
    getAppSessionMock.mockResolvedValue({ userId: "user_1" });
    findAdminRoomForUserBySlugMock.mockResolvedValue({
      id: "room_1",
      name: "General",
      description: "Room description",
      roomSlug: "general",
      adminId: "user_1",
      members: [],
    });

    const { getRoomAdminPageData } = await import("@/server/queries/room-admin.query");
    await expect(getRoomAdminPageData("general")).resolves.toEqual({
      session: { userId: "user_1" },
      room: {
        id: "room_1",
        name: "General",
        description: "Room description",
        roomSlug: "general",
        adminId: "user_1",
        members: [],
      },
    });
  });
});
