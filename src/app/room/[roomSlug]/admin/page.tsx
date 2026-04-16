import { notFound } from "next/navigation";

import RoomAdminPageClient from "./RoomAdminPageClient";
import { getRoomAdminPageData } from "@/server/queries/room-admin.query";

export default async function RoomAdminPage({
  params,
}: {
  params: Promise<{ roomSlug: string }>;
}) {
  const { roomSlug } = await params;
  const { room } = await getRoomAdminPageData(roomSlug);

  if (!room) {
    notFound();
  }

  return (
    <RoomAdminPageClient
      room={{
        id: room.id,
        name: room.name,
        description: room.description,
        roomSlug: room.roomSlug,
      }}
      members={room.members.map((member) => ({
        id: member.user.id,
        userName: member.user.userName,
        name: member.user.name,
        image: member.user.image,
        isAdmin: member.user.id === room.adminId,
      }))}
    />
  );
}
