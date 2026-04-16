import { requireAppSession } from "@/lib/auth/session";
import { userRepository } from "@/server/repositories/user.repository";

export const profileService = {
  async updateProfile(input: {
    name: string;
    bio: string;
    location: string;
    website: string;
    backgroundImage?: string;
  }) {
    const session = await requireAppSession();

    return userRepository.updateProfile(session.userId, input);
  },
};
