import { AppError } from "@/lib/errors";
import { requireAppSession } from "@/lib/auth/session";
import { notificationRepository } from "@/server/repositories/notification.repository";
import { userRepository } from "@/server/repositories/user.repository";

export const userService = {
  async toggleFollow(input: { targetUserId: string }) {
    const session = await requireAppSession();

    if (input.targetUserId === session.userId) {
      throw new AppError("validation", "Cannot follow yourself");
    }

    const existingFollow = await userRepository.findFollow(
      session.userId,
      input.targetUserId,
    );

    if (existingFollow) {
      await userRepository.deleteFollow(session.userId, input.targetUserId);
      return { following: false };
    }

    await Promise.all([
      userRepository.createFollow(session.userId, input.targetUserId),
      notificationRepository.create({
        type: "FOLLOW",
        userId: input.targetUserId,
        creatorId: session.userId,
      }),
    ]);

    return { following: true };
  },
};
