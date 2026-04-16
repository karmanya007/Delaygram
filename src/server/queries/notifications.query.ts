import { unstable_cache } from "next/cache";

import { getAppSession } from "@/lib/auth/session";
import { cacheTags } from "@/lib/cache-tags";
import { notificationRepository } from "@/server/repositories/notification.repository";

export async function getNotificationsQuery() {
  const session = await getAppSession({ provision: true });

  if (!session) {
    return {
      session: null,
      notifications: [],
    };
  }

  const notifications = await unstable_cache(
    async () => notificationRepository.listForUser(session.userId),
    [cacheTags.notifications(session.userId)],
    { tags: [cacheTags.notifications(session.userId)] },
  )();

  return {
    session,
    notifications,
  };
}

export type NotificationListItem = Awaited<
  ReturnType<typeof getNotificationsQuery>
>["notifications"][number];
