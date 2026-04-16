import { beforeEach, describe, expect, it, vi } from "vitest";

const requireAppSessionMock = vi.fn();
const findScopedPostMock = vi.fn();
const findLikeMock = vi.fn();
const createLikeMock = vi.fn();
const deleteLikeMock = vi.fn();
const createPostMock = vi.fn();
const findByIdMock = vi.fn();
const deletePostMock = vi.fn();
const transactionMock = vi.fn();
const createNotificationMock = vi.fn();
const setPinnedMock = vi.fn();
const findPinnedPostByAuthorMock = vi.fn();
const isRoomAdminMock = vi.fn();

vi.mock("@/lib/auth/session", () => ({
  requireAppSession: requireAppSessionMock,
}));

vi.mock("@/server/repositories/post.repository", () => ({
  postRepository: {
    findScopedPost: findScopedPostMock,
    findLike: findLikeMock,
    createLike: createLikeMock,
    deleteLike: deleteLikeMock,
    createPost: createPostMock,
    findById: findByIdMock,
    delete: deletePostMock,
    transaction: transactionMock,
    setPinned: setPinnedMock,
    findPinnedPostByAuthor: findPinnedPostByAuthorMock,
  },
}));

vi.mock("@/server/repositories/notification.repository", () => ({
  notificationRepository: {
    create: createNotificationMock,
  },
}));

vi.mock("@/server/repositories/room.repository", () => ({
  roomRepository: {
    isRoomAdmin: isRoomAdminMock,
  },
}));

describe("postService", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    requireAppSessionMock.mockResolvedValue({ userId: "viewer_1" });
  });

  it("rejects empty posts", async () => {
    const { postService } = await import("@/server/services/post.service");
    await expect(postService.createPost({ content: "   " })).rejects.toMatchObject({
      code: "validation",
    });
  });

  it("creates a like notification when liking another user's post", async () => {
    findScopedPostMock.mockResolvedValue({
      id: "post_1",
      authorId: "author_1",
      roomId: null,
    });
    findLikeMock.mockResolvedValue(null);

    const { postService } = await import("@/server/services/post.service");
    await expect(
      postService.toggleLike({ postId: "post_1", roomId: null }),
    ).resolves.toEqual({
      liked: true,
      post: { id: "post_1", authorId: "author_1", roomId: null },
    });

    expect(createLikeMock).toHaveBeenCalledWith("viewer_1", "post_1");
    expect(createNotificationMock).toHaveBeenCalledWith(
      expect.objectContaining({
        creatorId: "viewer_1",
        userId: "author_1",
        type: "LIKE",
      }),
    );
  });

  it("rejects post deletion for non-authors", async () => {
    findByIdMock.mockResolvedValue({
      id: "post_1",
      authorId: "author_1",
      roomId: null,
    });

    const { postService } = await import("@/server/services/post.service");
    await expect(postService.deletePost({ postId: "post_1" })).rejects.toMatchObject({
      code: "forbidden",
    });
  });

  it("creates comment and notification in one transaction", async () => {
    findScopedPostMock.mockResolvedValue({
      id: "post_1",
      authorId: "author_1",
      roomId: null,
    });

    transactionMock.mockImplementation(async (callback: (tx: any) => Promise<unknown>) =>
      callback({
        comment: {
          create: vi.fn().mockResolvedValue({ id: "comment_1" }),
        },
        notification: {
          create: vi.fn().mockResolvedValue({ id: "notification_1" }),
        },
      }),
    );

    const { postService } = await import("@/server/services/post.service");
    const result = await postService.createComment({
      postId: "post_1",
      content: "Nice post",
      roomId: null,
    });

    expect(result.comment).toEqual({ id: "comment_1" });
  });

  it("allows room admins to pin room posts and keeps other pinned room posts unchanged", async () => {
    findByIdMock.mockResolvedValue({
      id: "post_1",
      authorId: "author_1",
      roomId: "room_1",
      isPinned: false,
    });
    isRoomAdminMock.mockResolvedValue(true);

    const { postService } = await import("@/server/services/post.service");
    await expect(postService.togglePinPost({ postId: "post_1" })).resolves.toEqual({
      pinned: true,
      post: {
        id: "post_1",
        authorId: "author_1",
        roomId: "room_1",
        isPinned: false,
      },
    });

    expect(setPinnedMock).toHaveBeenCalledWith("post_1", true);
    expect(findPinnedPostByAuthorMock).not.toHaveBeenCalled();
  });

  it("allows room admins to unpin pinned room posts", async () => {
    findByIdMock.mockResolvedValue({
      id: "post_1",
      authorId: "author_1",
      roomId: "room_1",
      isPinned: true,
    });
    isRoomAdminMock.mockResolvedValue(true);

    const { postService } = await import("@/server/services/post.service");
    await expect(postService.togglePinPost({ postId: "post_1" })).resolves.toEqual({
      pinned: false,
      post: {
        id: "post_1",
        authorId: "author_1",
        roomId: "room_1",
        isPinned: true,
      },
    });

    expect(setPinnedMock).toHaveBeenCalledWith("post_1", false);
  });

  it("rejects room-post pinning for non-admin authors", async () => {
    requireAppSessionMock.mockResolvedValue({ userId: "author_1" });
    findByIdMock.mockResolvedValue({
      id: "post_1",
      authorId: "author_1",
      roomId: "room_1",
      isPinned: false,
    });
    isRoomAdminMock.mockResolvedValue(false);

    const { postService } = await import("@/server/services/post.service");
    await expect(postService.togglePinPost({ postId: "post_1" })).rejects.toMatchObject({
      code: "forbidden",
    });
  });

  it("keeps non-room pinning author-scoped", async () => {
    requireAppSessionMock.mockResolvedValue({ userId: "author_1" });
    findByIdMock.mockResolvedValue({
      id: "post_2",
      authorId: "author_1",
      roomId: null,
      isPinned: false,
    });
    findPinnedPostByAuthorMock.mockResolvedValue({ id: "post_old" });

    const { postService } = await import("@/server/services/post.service");
    await expect(postService.togglePinPost({ postId: "post_2" })).resolves.toEqual({
      pinned: true,
      post: {
        id: "post_2",
        authorId: "author_1",
        roomId: null,
        isPinned: false,
      },
    });

    expect(findPinnedPostByAuthorMock).toHaveBeenCalledWith("author_1");
    expect(setPinnedMock).toHaveBeenCalledWith("post_old", false);
    expect(setPinnedMock).toHaveBeenCalledWith("post_2", true);
  });
});
