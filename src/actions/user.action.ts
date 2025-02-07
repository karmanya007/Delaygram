"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import type { User } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";

export async function syncUser(user: User) {
    try {
        const { userId } = await auth();

        if (!userId || !user) return;

        const existingUser = await prisma.user.findUnique({
            where: {
                clerkId: userId
            }
        });

        if (existingUser) {
            return existingUser;
        }

        const dbUser = await prisma.user.create({
            data: {
                clerkId: userId,
                name: `${user.firstName || ""} ${user.lastName || ""}`,
                email: user.emailAddresses[0].emailAddress,
                userName: user.username ?? user.emailAddresses[0].emailAddress.split("@")[0],
                image: user.imageUrl,
                phoneNumber: user.phoneNumbers[0].phoneNumber,
            }
        })

        return dbUser;
    } catch (error) {
        console.error("Error in syncing user", error);
        return null;
    }
}

export async function getUserByClerkId(clerkId: string) {
    try {
        const user = await prisma.user.findUnique({
            where: {
                clerkId
            },
            include: {
                _count: {
                    select: {
                        posts: true,
                        followers: true,
                        following: true
                    }
                }
            }
        });

        return user;
    } catch (error) {
        console.error("Error in getting user by clerk id", error);
        return null;
    }
}

export async function getDbUserId() {
    const { userId: clerkId } = await auth();
    if (!clerkId) return null;

    const user = await getUserByClerkId(clerkId);

    if (!user) throw new Error("User not found");

    return user.id;
}

export async function getRandomUsers() {
    try {
        const userId = await getDbUserId();
        if (!userId) return [];

        const users = await prisma.user.findMany({
            where: {
                AND: [
                    { NOT: { id: userId } },
                    { NOT: { followers: { some: { followerId: userId } } } }
                ]
            },
            select: {
                id: true,
                name: true,
                userName: true,
                image: true,
                _count: {
                    select: {
                        followers: true,
                    }
                }
            },
            take: 5
        });

        return users;
    } catch (error) {
        console.error("Error in getting random users", error);
        return [];
    }
}

export async function toggleFollow(targetUserId: string) {
    try {
        const userId = await getDbUserId();
        if (!userId) return;

        if (targetUserId === userId) throw new Error("Cannot follow self");

        const isFollowing = await prisma.follows.findUnique({
            where: {
                followerId_followingId: {
                    followerId: userId,
                    followingId: targetUserId
                }
            }
        });

        if (isFollowing) { // Unfollow
            await prisma.follows.delete({
                where: {
                    followerId_followingId: {
                        followerId: userId,
                        followingId: targetUserId
                    }
                }
            });
        }
        else { // Follow
            await prisma.$transaction([
                prisma.follows.create({
                    data: {
                        followerId: userId,
                        followingId: targetUserId
                    }
                }),
                prisma.notification.create({
                    data: {
                        type: "FOLLOW",
                        userId: targetUserId,
                        creatorId: userId
                    }
                })
            ])
        }

        revalidatePath("/");
        return { success: true };
    } catch (error) {
        console.error("Error in toggling follow", error);
        return { success: false, error: "Error toggling follow" };
    }
}