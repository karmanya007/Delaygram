import { auth, currentUser } from "@clerk/nextjs/server";

import { AppError } from "@/lib/errors";
import { logError } from "@/lib/logger";
import { userRepository } from "@/server/repositories/user.repository";

export interface AppSession {
  clerkId: string;
  userId: string;
  userName: string;
  name: string | null;
  image: string | null;
}

type GetAppSessionOptions = {
  provision?: boolean;
};

export async function getAppSession(
  options: GetAppSessionOptions = {},
): Promise<AppSession | null> {
  const { provision = false } = options;
  const { userId: clerkId } = await auth();

  if (!clerkId) {
    return null;
  }

  let dbUser = await userRepository.findByClerkId(clerkId);

  if (!dbUser && provision) {
    const clerkUser = await currentUser();

    if (!clerkUser) {
      return null;
    }

    try {
      dbUser = await userRepository.upsertFromClerk(clerkUser);
    } catch (error) {
      logError("auth.getAppSession", error, { clerkId });
      throw new AppError("infrastructure", "Failed to provision application user");
    }
  }

  if (!dbUser) {
    return null;
  }

  return {
    clerkId,
    userId: dbUser.id,
    userName: dbUser.userName,
    name: dbUser.name,
    image: dbUser.image,
  };
}

export async function requireAppSession(): Promise<AppSession> {
  const session = await getAppSession({ provision: true });

  if (!session) {
    throw new AppError("unauthenticated", "Authentication required");
  }

  return session;
}
