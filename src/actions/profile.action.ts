"use server";

import { revalidateTag } from "next/cache";
import { z } from "zod";

import { fail, ok, type ActionResult } from "@/lib/action-result";
import { getAppSession } from "@/lib/auth/session";
import { cacheTags } from "@/lib/cache-tags";
import { isAppError } from "@/lib/errors";
import { logError } from "@/lib/logger";
import { runWithTrace } from "@/lib/trace";
import {
  getProfileByUsernameQuery,
  getUserLikedPostsQuery,
  getUserPostsQuery,
} from "@/server/queries/profile.query";
import { profileService } from "@/server/services/profile.service";
import { userRepository } from "@/server/repositories/user.repository";
import { postRepository } from "@/server/repositories/post.repository";

const updateProfileSchema = z.object({
  name: z.string().max(50),
  bio: z.string().max(250),
  location: z.string().max(100),
  website: z.string().max(200).optional().default(""),
  backgroundImage: z.string().url().or(z.literal("")).optional(),
});

export async function getProfileByUsername(username: string) {
  return getProfileByUsernameQuery(username);
}

export async function getUserPosts(userId: string) {
  return getUserPostsQuery(userId);
}

export async function getUserLikedPosts(userId: string) {
  return getUserLikedPostsQuery(userId);
}

export async function getUserSavedPosts(userId: string) {
  return postRepository.listSavedPosts(userId);
}

export async function updateProfile(
  input: z.input<typeof updateProfileSchema>,
): Promise<ActionResult<{ userId: string }>> {
  return runWithTrace(async () => {
    try {
      const parsed = updateProfileSchema.parse(input);
      const user = await profileService.updateProfile(parsed);
      revalidateTag(cacheTags.profile(user.id));
      return ok({ userId: user.id });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return fail("validation", error.errors[0]?.message ?? "Invalid profile payload");
      }

      if (isAppError(error)) {
        return fail(error.code, error.message);
      }

      logError("actions.updateProfile", error);
      return fail("infrastructure", "Failed to update profile");
    }
  });
}

export async function isFollowing(userId: string) {
  try {
    const session = await getAppSession({ provision: true });

    if (!session) {
      return false;
    }

    const follow = await userRepository.findFollow(session.userId, userId);
    return Boolean(follow);
  } catch (error) {
    logError("actions.isFollowing", error, { userId });
    return false;
  }
}
