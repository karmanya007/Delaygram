"use server";

import { revalidateTag } from "next/cache";
import { z } from "zod";

import { fail, ok, type ActionResult } from "@/lib/action-result";
import { getAppSession } from "@/lib/auth/session";
import { cacheTags } from "@/lib/cache-tags";
import { isAppError } from "@/lib/errors";
import { logError } from "@/lib/logger";
import { runWithTrace } from "@/lib/trace";
import { getNotificationsQuery } from "@/server/queries/notifications.query";
import { notificationService } from "@/server/services/notification.service";

const markNotificationsReadSchema = z.object({
  notificationIds: z.array(z.string().min(1)),
});

export async function getNotifications() {
  const result = await getNotificationsQuery();
  return result.notifications;
}

export async function markNotificationAsRead(
  input: z.input<typeof markNotificationsReadSchema>,
): Promise<ActionResult<{ updated: true }>> {
  return runWithTrace(async () => {
    try {
      const parsed = markNotificationsReadSchema.parse(input);
      await notificationService.markAsRead(parsed);

      const session = await getAppSession({ provision: true });
      if (session) {
        revalidateTag(cacheTags.notifications(session.userId));
      }

      return ok({ updated: true });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return fail(
          "validation",
          error.errors[0]?.message ?? "Invalid notification payload",
        );
      }

      if (isAppError(error)) {
        return fail(error.code, error.message);
      }

      logError("actions.markNotificationAsRead", error);
      return fail("infrastructure", "Failed to mark notifications as read");
    }
  });
}
