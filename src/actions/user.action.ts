"use server";

import { revalidateTag } from "next/cache";
import { z } from "zod";

import { fail, ok, type ActionResult } from "@/lib/action-result";
import { getAppSession } from "@/lib/auth/session";
import { cacheTags } from "@/lib/cache-tags";
import { isAppError } from "@/lib/errors";
import { logError } from "@/lib/logger";
import { checkRateLimit } from "@/lib/rate-limit";
import { runWithTrace } from "@/lib/trace";
import { roomRepository } from "@/server/repositories/room.repository";
import { userRepository } from "@/server/repositories/user.repository";
import { userService } from "@/server/services/user.service";

const followSchema = z.object({
  targetUserId: z.string().min(1),
});

export async function syncUser() {
  return getAppSession({ provision: true });
}

export async function getUserByClerkId(clerkId: string) {
  return userRepository.findByClerkId(clerkId);
}

export async function getDbUserId() {
  const session = await getAppSession({ provision: true });
  return session?.userId ?? null;
}

export async function getRandomUsers() {
  try {
    const session = await getAppSession({ provision: true });

    if (!session) {
      return [];
    }

    return userRepository.findSuggestionsForUser(session.userId);
  } catch (error) {
    logError("actions.getRandomUsers", error);
    return [];
  }
}

export async function toggleFollow(
  input: z.input<typeof followSchema>,
): Promise<ActionResult<{ following: boolean }>> {
  return runWithTrace(async () => {
    try {
      const parsed = followSchema.parse(input);
      const session = await getAppSession({ provision: true });

      if (session) {
        const { allowed } = checkRateLimit(`toggleFollow:${session.userId}`, 30, 60);
        if (!allowed) return fail("conflict", "Too many follow actions. Please wait a minute.");
      }

      const result = await userService.toggleFollow(parsed);

      revalidateTag(cacheTags.profile(parsed.targetUserId));
      revalidateTag(cacheTags.notifications(parsed.targetUserId));

      if (session) {
        revalidateTag(cacheTags.profile(session.userId));
        revalidateTag(cacheTags.roomsForUser(session.userId));
      }

      return ok(result);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return fail("validation", error.errors[0]?.message ?? "Invalid follow payload");
      }

      if (isAppError(error)) {
        return fail(error.code, error.message);
      }

      logError("actions.toggleFollow", error);
      return fail("infrastructure", "Error toggling follow");
    }
  });
}

export async function combinedSearch(searchTerm: string) {
  try {
    const normalized = searchTerm.trim().slice(0, 100);

    if (!normalized) {
      return [];
    }

    return userRepository.searchUsers(normalized);
  } catch (error) {
    logError("actions.combinedSearch", error, { searchTerm });
    return [];
  }
}

export async function getJoinedRooms(id: string | null) {
  if (!id) {
    return { roomsJoined: [] };
  }

  try {
    const rooms = await roomRepository.listRoomsForUser(id);
    return {
      roomsJoined: rooms.map((room) => ({
        room,
      })),
    };
  } catch (error) {
    logError("actions.getJoinedRooms", error, { userId: id });
    return { roomsJoined: [] };
  }
}
