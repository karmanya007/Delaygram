import { unstable_cache } from "next/cache";

import { getAppSession } from "@/lib/auth/session";
import { cacheTags } from "@/lib/cache-tags";
import { notificationRepository } from "@/server/repositories/notification.repository";
import { roomRepository } from "@/server/repositories/room.repository";

export async function getNavigationData() {
  const session = await getAppSession({ provision: true });

  if (!session) {
    return {
      session: null,
      rooms: [],
      unreadNotificationCount: 0,
    };
  }

  const [rooms, unreadNotificationCount] = await Promise.all([
    unstable_cache(
      async () => roomRepository.listRoomsForUser(session.userId),
      [cacheTags.roomsForUser(session.userId)],
      { tags: [cacheTags.roomsForUser(session.userId)] },
    )(),
    unstable_cache(
      async () => notificationRepository.countUnreadForUser(session.userId),
      [`navigation-unread:${session.userId}`],
      { tags: [cacheTags.notifications(session.userId)] },
    )(),
  ]);

  return {
    session,
    rooms,
    unreadNotificationCount,
  };
}
