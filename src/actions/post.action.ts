"use server";

import { prisma } from "@/lib/prisma";
import { getDbUserId } from "./user.action";
import { revalidatePath } from "next/cache";
import { NotificationScope, PostScope } from "@prisma/client";

export async function createPost(content: string, image: string, roomId?: string) {
    try {
        const userId = await getDbUserId();
        if (!userId) return;

        const post = await prisma.post.create({
            data: {
                content,
                image,
                authorId: userId,
                roomId: roomId,
                scope: roomId ? PostScope.ROOM : PostScope.GLOBAL
            }
        });

        revalidatePath("/");
        return post;
    } catch (error) {
        console.error("Error in creating post", error);
        throw error;
    }
}

export async function getPosts(roomId?: string) {
    try {
        return await prisma.post.findMany({
            where: roomId ? { roomId } : { scope: PostScope.GLOBAL },
            orderBy: {
                createdAt: "desc"
            },
            include: {
                author: {
                    select: {
                        id: true,
                        name: true,
                        image: true,
                        userName: true
                    }
                },
                comments: {
                    include: {
                        author: {
                            select: {
                                id: true,
                                name: true,
                                image: true,
                                userName: true
                            }
                        }
                    },
                    orderBy: {
                        createdAt: "asc"
                    }
                },
                likes: {
                    select: {
                        userId: true
                    }
                },
                _count: {
                    select: {
                        likes: true,
                        comments: true
                    }
                }
            }
        });
    } catch (error) {
        console.error("Error in getting posts", error);
        return [];
    }
}

export async function toggleLike(postId: string, roomId: string | null) {
    try {
        const userId = await getDbUserId();
        if (!userId) return;

        const post = await prisma.post.findUnique({
            where: { id: postId, roomId },
            select: { authorId: true },
        });

        if (!post) throw new Error("Post not found");

        // check if like exists
        const existingLike = await prisma.like.findUnique({
            where: {
                userId_postId: {
                    userId,
                    postId,
                },
            },
        });

        if (existingLike) {
            // unlike
            await prisma.like.delete({
                where: {
                    userId_postId: {
                        userId,
                        postId,
                    },
                },
            });
        } else {
            // like and create notification (only if liking someone else's post)
            await prisma.$transaction([
                prisma.like.create({
                    data: {
                        userId,
                        postId,
                    },
                }),
                ...(post.authorId !== userId
                    ? [
                        prisma.notification.create({
                            data: {
                                type: "LIKE",
                                userId: post.authorId, // recipient (post author)
                                creatorId: userId, // person who liked
                                postId,
                                roomId,
                                scope: roomId ? NotificationScope.ROOM : NotificationScope.GLOBAL
                            },
                        }),
                    ]
                    : []),
            ]);
        }

        revalidatePath("/");
        return { success: true };
    } catch (error) {
        console.error("Failed to toggle like:", error);
        return { success: false, error: "Failed to toggle like" };
    }
}

export async function createComment(postId: string, content: string, roomId: string | null) {
    try {
        const userId = await getDbUserId();

        if (!userId) return;
        if (!content) throw new Error("Content is required");

        const post = await prisma.post.findUnique({
            where: { id: postId, roomId },
            select: { authorId: true },
        });

        if (!post) throw new Error("Post not found");

        // Create comment and notification in a transaction
        const [comment] = await prisma.$transaction(async (tx) => {
            // Create comment first
            const newComment = await tx.comment.create({
                data: {
                    content,
                    authorId: userId,
                    postId,
                },
            });

            // Create notification if commenting on someone else's post
            if (post.authorId !== userId) {
                await tx.notification.create({
                    data: {
                        type: "COMMENT",
                        userId: post.authorId,
                        creatorId: userId,
                        postId,
                        commentId: newComment.id,
                        roomId,
                        scope: roomId ? NotificationScope.ROOM : NotificationScope.GLOBAL
                    },
                });
            }

            return [newComment];
        });

        revalidatePath(`/`);
        return { success: true, comment };
    } catch (error) {
        console.error("Failed to create comment:", error);
        return { success: false, error: "Failed to create comment" };
    }
}

export async function deletePost(postId: string) {
    try {
        const userId = await getDbUserId();

        const post = await prisma.post.findUnique({
            where: { id: postId },
            select: { authorId: true }
        });

        if (!post) throw new Error("Post not found");
        if (post.authorId !== userId) throw new Error("Unauthorized");

        await prisma.post.delete({
            where: { id: postId }
        });

        revalidatePath("/");
        return { success: true };
    } catch (error) {
        console.error("Failed to delete post:", error);
        return { success: false, error: "Failed to delete post" };
    }
}