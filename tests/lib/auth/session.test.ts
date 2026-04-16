import { beforeEach, describe, expect, it, vi } from "vitest";

const authMock = vi.fn();
const currentUserMock = vi.fn();
const findByClerkIdMock = vi.fn();
const upsertFromClerkMock = vi.fn();

vi.mock("@clerk/nextjs/server", () => ({
  auth: authMock,
  currentUser: currentUserMock,
}));

vi.mock("@/server/repositories/user.repository", () => ({
  userRepository: {
    findByClerkId: findByClerkIdMock,
    upsertFromClerk: upsertFromClerkMock,
  },
}));

describe("getAppSession", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("returns null when unauthenticated", async () => {
    authMock.mockResolvedValue({ userId: null });

    const { getAppSession } = await import("@/lib/auth/session");
    await expect(getAppSession()).resolves.toBeNull();
  });

  it("returns an existing app session without provisioning", async () => {
    authMock.mockResolvedValue({ userId: "clerk_1" });
    findByClerkIdMock.mockResolvedValue({
      id: "db_1",
      userName: "alice",
      name: "Alice",
      image: null,
    });

    const { getAppSession } = await import("@/lib/auth/session");
    await expect(getAppSession()).resolves.toEqual({
      clerkId: "clerk_1",
      userId: "db_1",
      userName: "alice",
      name: "Alice",
      image: null,
    });
  });

  it("provisions the DB user when requested", async () => {
    authMock.mockResolvedValue({ userId: "clerk_1" });
    findByClerkIdMock.mockResolvedValueOnce(null);
    currentUserMock.mockResolvedValue({ id: "clerk_1" });
    upsertFromClerkMock.mockResolvedValue({
      id: "db_1",
      userName: "alice",
      name: "Alice",
      image: "avatar.png",
    });

    const { getAppSession } = await import("@/lib/auth/session");
    await expect(getAppSession({ provision: true })).resolves.toEqual({
      clerkId: "clerk_1",
      userId: "db_1",
      userName: "alice",
      name: "Alice",
      image: "avatar.png",
    });
  });
});
