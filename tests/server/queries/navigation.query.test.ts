import { beforeEach, describe, expect, it, vi } from "vitest";

const getAppSessionMock = vi.fn();
const listRoomsForUserMock = vi.fn();
const countUnreadForUserMock = vi.fn();

vi.mock("next/cache", () => ({
  unstable_cache: (fn: () => Promise<unknown>) => fn,
}));

vi.mock("@/lib/auth/session", () => ({
  getAppSession: getAppSessionMock,
}));

vi.mock("@/server/repositories/room.repository", () => ({
  roomRepository: {
    listRoomsForUser: listRoomsForUserMock,
  },
}));

vi.mock("@/server/repositories/notification.repository", () => ({
  notificationRepository: {
    countUnreadForUser: countUnreadForUserMock,
  },
}));

describe("getNavigationData", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("returns signed-out defaults", async () => {
    getAppSessionMock.mockResolvedValue(null);

    const { getNavigationData } = await import("@/server/queries/navigation.query");
    await expect(getNavigationData()).resolves.toEqual({
      session: null,
      rooms: [],
      unreadNotificationCount: 0,
    });
  });

  it("returns rooms and unread count for signed-in users", async () => {
    getAppSessionMock.mockResolvedValue({ userId: "user_1" });
    listRoomsForUserMock.mockResolvedValue([{ id: "room_1", name: "General", roomSlug: "general" }]);
    countUnreadForUserMock.mockResolvedValue(3);

    const { getNavigationData } = await import("@/server/queries/navigation.query");
    await expect(getNavigationData()).resolves.toEqual({
      session: { userId: "user_1" },
      rooms: [{ id: "room_1", name: "General", roomSlug: "general" }],
      unreadNotificationCount: 3,
    });
  });
});
