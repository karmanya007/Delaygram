"use server";

import { prisma } from "@/lib/prisma";
import { getDbUserId } from "./user.action";

export async function getNotifications() {
    try {
        const userId = await getDbUserId();
        if (!userId) return [];

        const notifications = await prisma.notification.findMany({
            where: {
                userId
            },
            include: {
                creator: {
                    select: {
                        id: true,
                        name: true,
                        userName: true,
                        image: true,
                    },
                },
                post: {
                    select: {
                        id: true,
                        content: true,
                        image: true,
                    },
                },
                comment: {
                    select: {
                        id: true,
                        content: true,
                        createdAt: true,
                    },
                },
            },
            orderBy: {
                createdAt: "desc"
            }
        });

        return notifications;
    } catch (error) {
        console.error("Error in getting notifications", error);
        return [];
    }
}

export async function markNotificationAsRead(notificationIds: string[]) {
    try {
        await prisma.notification.updateMany({
            where: {
                id: {
                    in: notificationIds
                }
            },
            data: {
                read: true
            }
        });

        return { success: true };
    } catch (error) {
        console.error("Error in marking notification as read", error);
        return { success: false };
    }
}