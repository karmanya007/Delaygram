import { unstable_cache } from "next/cache";

import { getAppSession } from "@/lib/auth/session";
import { cacheTags } from "@/lib/cache-tags";
import { roomRepository } from "@/server/repositories/room.repository";

export async function getRoomAdminPageData(roomSlug: string) {
  const session = await getAppSession({ provision: true });

  if (!session) {
    return {
      session: null,
      room: null,
    };
  }

  const room = await unstable_cache(
    async () => roomRepository.findAdminRoomForUserBySlug(session.userId, roomSlug),
    [cacheTags.roomAdmin(roomSlug), session.userId],
    { tags: [cacheTags.roomAdmin(roomSlug)] },
  )();

  return {
    session,
    room,
  };
}
