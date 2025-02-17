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
            roomSlug:`${nanoid(8)}`,
            adminId:uid
        }
    })
    console.log(room);
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


