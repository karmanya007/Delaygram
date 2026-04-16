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
import { roomService } from "@/server/services/room.service";

const createRoomSchema = z.object({
  name: z.string().min(1).max(50),
  description: z.string().max(300),
  users: z
    .array(
      z.object({
        id: z.string().min(1),
        email: z.string().optional(),
      }),
    )
    .optional(),
});

const createRoomInviteSchema = z.object({
  users: z.array(
    z.object({
      id: z.string().min(1),
      email: z.string().optional(),
    }),
  ),
  roomId: z.string().min(1),
  inviteId: z.string().min(1),
});

const acceptRoomInviteSchema = z.object({
  inviteId: z.string().min(1),
});

const updateRoomDetailsSchema = z.object({
  roomId: z.string().min(1),
  name: z.string().min(1).max(50),
  description: z.string().max(300),
});

export async function createRoom(
  input: z.input<typeof createRoomSchema>,
): Promise<ActionResult<{ id: string; name: string; roomSlug: string }>> {
  return runWithTrace(async () => {
    try {
      const parsed = createRoomSchema.parse(input);
      const session = await getAppSession({ provision: true });

      if (session) {
        const { allowed } = checkRateLimit(`createRoom:${session.userId}`, 5, 60);
        if (!allowed) return fail("conflict", "Too many rooms created. Please wait a minute.");
        revalidateTag(cacheTags.roomsForUser(session.userId));
      }

      const room = await roomService.createRoom(parsed);
      revalidateTag(cacheTags.feedRoom(room.id));

      return ok({
        id: room.id,
        name: room.name,
        roomSlug: room.roomSlug,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return fail("validation", error.errors[0]?.message ?? "Invalid room payload");
      }

      if (isAppError(error)) {
        return fail(error.code, error.message);
      }

      logError("actions.createRoom", error);
      return fail("infrastructure", "Failed to create room");
    }
  });
}

export async function createRoomInvite(
  input: z.input<typeof createRoomInviteSchema>,
): Promise<ActionResult<{ inviteId: string }>> {
  return runWithTrace(async () => {
    try {
      const parsed = createRoomInviteSchema.parse(input);
      const inviteId = await roomService.createRoomInvite(parsed);
      const session = await getAppSession({ provision: true });

      if (session) {
        const { allowed } = checkRateLimit(`createRoomInvite:${session.userId}`, 10, 60);
        if (!allowed) return fail("conflict", "Too many invites sent. Please wait a minute.");
        revalidateTag(cacheTags.roomsForUser(session.userId));
      }

      return ok({ inviteId });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return fail("validation", error.errors[0]?.message ?? "Invalid invite payload");
      }

      if (isAppError(error)) {
        return fail(error.code, error.message);
      }

      logError("actions.createRoomInvite", error);
      return fail("infrastructure", "Failed to create invite");
    }
  });
}

export async function acceptRoomInvite(
  input: z.input<typeof acceptRoomInviteSchema>,
): Promise<ActionResult<{ roomId: string; roomSlug: string }>> {
  return runWithTrace(async () => {
    try {
      const parsed = acceptRoomInviteSchema.parse(input);
      const room = await roomService.acceptInvite(parsed);
      const session = await getAppSession({ provision: true });

      if (session) {
        revalidateTag(cacheTags.roomsForUser(session.userId));
      }
      revalidateTag(cacheTags.feedRoom(room.id));
      revalidateTag(cacheTags.roomAdmin(room.roomSlug));

      return ok({ roomId: room.id, roomSlug: room.roomSlug });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return fail("validation", error.errors[0]?.message ?? "Invalid invite payload");
      }

      if (isAppError(error)) {
        return fail(error.code, error.message);
      }

      logError("actions.acceptRoomInvite", error);
      return fail("infrastructure", "Failed to accept invite");
    }
  });
}

export async function updateRoomDetails(
  input: z.input<typeof updateRoomDetailsSchema>,
): Promise<ActionResult<{ id: string; name: string; description: string | null; roomSlug: string }>> {
  return runWithTrace(async () => {
    try {
      const parsed = updateRoomDetailsSchema.parse(input);
      const room = await roomService.updateRoomDetails(parsed);
      const memberIds = await roomRepository.listMemberUserIds(room.id);

      for (const userId of memberIds) {
        revalidateTag(cacheTags.roomsForUser(userId));
      }

      revalidateTag(cacheTags.roomAdmin(room.roomSlug));

      return ok({
        id: room.id,
        name: room.name,
        description: room.description,
        roomSlug: room.roomSlug,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return fail("validation", error.errors[0]?.message ?? "Invalid room payload");
      }

      if (isAppError(error)) {
        return fail(error.code, error.message);
      }

      logError("actions.updateRoomDetails", error);
      return fail("infrastructure", "Failed to update room");
    }
  });
}

export async function validateInvite(inviteId: string) {
  const session = await getAppSession({ provision: true });

  if (!session) {
    return false;
  }

  return roomRepository.validateInvite(session.userId, inviteId);
}

export async function getUserRooms() {
  const session = await getAppSession({ provision: true });

  if (!session) {
    return [];
  }

  return roomRepository.listRoomsForUser(session.userId);
}
