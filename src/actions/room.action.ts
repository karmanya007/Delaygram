"use server";
import { prisma } from "@/lib/prisma";
import { getDbUserId } from "./user.action";
import { nanoid } from "nanoid";


export async function createRoom(rName:string,rDesc:string) {
    const uid = await getDbUserId();
    if (!uid) return;
    console.log(rName,rDesc,uid);
    const room = await prisma.room.create({
        data: {
            name:rName,
            description:rDesc,
            roomSlug:`${rName.replace(/\s+/g, '-').toLowerCase()}-${nanoid(8)}`, // Sanitize room name for slug
            adminId:uid
        }
    });
    console.log(room);
    return room;
}

export async function createRoomInvite(users: { id: string; email?: string }[], roomId: string, inviteId: string) {
    const inviteEntries = users.map(user => ({
        roomId,
        userId: user.id,
        userEmail: user.email || '',
        inviteLink: inviteId,
    }));

    await prisma.roomInviteDetails.createMany({
        data: inviteEntries,
    });

    return inviteId;
}

export async function validateInvite(userId: string, inviteId: string) {
    const invite = await prisma.roomInviteDetails.findFirst({
        where: {
            userId: userId,
            inviteLink: inviteId,
        },
    });

    return !!invite;
}

export async function getUserRooms() {
    const userId = await getDbUserId();
    if (!userId) return [];

    const roomMemberships = await prisma.roomMember.findMany({
        where: { userId },
        include: {
            room: {
                select: {
                    id: true,
                    name: true,
                    roomSlug: true,
                },
            },
        },
    });
    const memberRooms = roomMemberships.map(membership => membership.room);

    // Get rooms where the user is an admin
    const adminRooms = await prisma.room.findMany({
        where: { adminId: userId },
        select: {
            id: true,
            name: true,
            roomSlug: true,
        },
    });

    // Combine and deduplicate rooms
    const allRoomsMap = new Map<string, { id: string; name: string; roomSlug: string }>();

    memberRooms.forEach(room => {
        if (room) { // Ensure room is not null
            allRoomsMap.set(room.id, room);
        }
    });

    adminRooms.forEach(room => {
        if (room) { // Ensure room is not null
            allRoomsMap.set(room.id, room);
        }
    });

    return Array.from(allRoomsMap.values());
}
