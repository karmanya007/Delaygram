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
            roomSlug:`${rName}-${nanoid(8)}`,
            adminId:uid
        }
    })
    console.log(room);
}

