import { requireAppSession } from "@/lib/auth/session";
import { notificationRepository } from "@/server/repositories/notification.repository";

export const notificationService = {
  async markAsRead(input: { notificationIds: string[] }) {
    const session = await requireAppSession();
    await notificationRepository.markRead(input.notificationIds, session.userId);
  },
};
