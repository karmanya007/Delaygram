import { beforeEach, describe, expect, it, vi } from "vitest";

const requireAppSessionMock = vi.fn();
const findFollowMock = vi.fn();
const createFollowMock = vi.fn();
const deleteFollowMock = vi.fn();
const createNotificationMock = vi.fn();

vi.mock("@/lib/auth/session", () => ({
  requireAppSession: requireAppSessionMock,
}));

vi.mock("@/server/repositories/user.repository", () => ({
  userRepository: {
    findFollow: findFollowMock,
    createFollow: createFollowMock,
    deleteFollow: deleteFollowMock,
  },
}));

vi.mock("@/server/repositories/notification.repository", () => ({
  notificationRepository: {
    create: createNotificationMock,
  },
}));

describe("userService", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    requireAppSessionMock.mockResolvedValue({ userId: "viewer_1" });
  });

  it("rejects self-follow", async () => {
    const { userService } = await import("@/server/services/user.service");
    await expect(
      userService.toggleFollow({ targetUserId: "viewer_1" }),
    ).rejects.toMatchObject({ code: "validation" });
  });

  it("creates a follow and notification when not already following", async () => {
    findFollowMock.mockResolvedValue(null);

    const { userService } = await import("@/server/services/user.service");
    await expect(
      userService.toggleFollow({ targetUserId: "author_1" }),
    ).resolves.toEqual({ following: true });

    expect(createFollowMock).toHaveBeenCalledWith("viewer_1", "author_1");
    expect(createNotificationMock).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "FOLLOW",
        creatorId: "viewer_1",
        userId: "author_1",
      }),
    );
  });

  it("unfollows when a follow already exists", async () => {
    findFollowMock.mockResolvedValue({ followerId: "viewer_1", followingId: "author_1" });

    const { userService } = await import("@/server/services/user.service");
    await expect(
      userService.toggleFollow({ targetUserId: "author_1" }),
    ).resolves.toEqual({ following: false });

    expect(deleteFollowMock).toHaveBeenCalledWith("viewer_1", "author_1");
  });
});
