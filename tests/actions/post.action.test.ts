import { beforeEach, describe, expect, it, vi } from "vitest";

const revalidateTagMock = vi.fn();
const createPostMock = vi.fn();
const togglePinPostMock = vi.fn();
const getAppSessionMock = vi.fn();

vi.mock("next/cache", () => ({
  revalidateTag: revalidateTagMock,
}));

vi.mock("@/server/services/post.service", () => ({
  postService: {
    createPost: createPostMock,
    togglePinPost: togglePinPostMock,
  },
}));

vi.mock("@/lib/auth/session", () => ({
  getAppSession: getAppSessionMock,
}));

vi.mock("@/server/queries/feed.query", () => ({
  getPostsQuery: vi.fn(),
}));

describe("post.action createPost", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    getAppSessionMock.mockResolvedValue(null);
  });

  it("returns validation errors for invalid payloads", async () => {
    const { AppError } = await import("@/lib/errors");
    createPostMock.mockRejectedValue(
      new AppError("validation", "Post content or image is required"),
    );

    const { createPost } = await import("@/actions/post.action");
    await expect(createPost({ content: "", image: "" })).resolves.toEqual({
      success: false,
      data: null,
      code: "validation",
      error: "Post content or image is required",
    });
  });

  it("invalidates the global feed and author profile on success", async () => {
    createPostMock.mockResolvedValue({
      id: "post_1",
      authorId: "user_1",
      roomId: null,
      image: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      content: "hello",
      scope: "GLOBAL",
    });

    const { createPost } = await import("@/actions/post.action");
    const result = await createPost({ content: "hello", image: "" });

    expect(result.success).toBe(true);
    expect(revalidateTagMock).toHaveBeenCalledWith("feed:global");
    expect(revalidateTagMock).toHaveBeenCalledWith("profile:user_1");
  });
});

describe("post.action togglePinPost", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    getAppSessionMock.mockResolvedValue({ userId: "viewer_1" });
  });

  it("revalidates room feed for room post pin toggles", async () => {
    togglePinPostMock.mockResolvedValue({
      pinned: true,
      post: {
        id: "post_1",
        authorId: "author_1",
        roomId: "room_1",
        isPinned: false,
      },
    });

    const { togglePinPost } = await import("@/actions/post.action");
    const result = await togglePinPost({ postId: "post_1" });

    expect(result).toEqual({
      success: true,
      data: { pinned: true },
      error: null,
      code: null,
    });
    expect(revalidateTagMock).toHaveBeenCalledWith("feed:room:room_1");
    expect(revalidateTagMock).not.toHaveBeenCalledWith("profile:viewer_1");
  });

  it("revalidates author profile and global feed for non-room pin toggles", async () => {
    togglePinPostMock.mockResolvedValue({
      pinned: true,
      post: {
        id: "post_2",
        authorId: "author_1",
        roomId: null,
        isPinned: false,
      },
    });

    const { togglePinPost } = await import("@/actions/post.action");
    const result = await togglePinPost({ postId: "post_2" });

    expect(result).toEqual({
      success: true,
      data: { pinned: true },
      error: null,
      code: null,
    });
    expect(revalidateTagMock).toHaveBeenCalledWith("profile:author_1");
    expect(revalidateTagMock).toHaveBeenCalledWith("feed:global");
  });
});
