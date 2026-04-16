import type { User as ClerkUser } from "@clerk/nextjs/server";

import { prisma } from "@/lib/prisma";

export const userRepository = {
  async findByClerkId(clerkId: string) {
    return prisma.user.findUnique({
      where: { clerkId },
    });
  },

  async upsertFromClerk(user: ClerkUser) {
    const email = user.emailAddresses[0]?.emailAddress;
    const fallbackUserName = email?.split("@")[0] ?? user.id;

    return prisma.user.upsert({
      where: { clerkId: user.id },
      update: {
        name: `${user.firstName || ""} ${user.lastName || ""}`.trim() || null,
        email: email ?? "",
        userName: user.username ?? fallbackUserName,
        image: user.imageUrl,
        phoneNumber: user.phoneNumbers[0]?.phoneNumber ?? null,
      },
      create: {
        clerkId: user.id,
        name: `${user.firstName || ""} ${user.lastName || ""}`.trim() || null,
        email: email ?? "",
        userName: user.username ?? fallbackUserName,
        image: user.imageUrl,
        phoneNumber: user.phoneNumbers[0]?.phoneNumber ?? null,
      },
    });
  },

  async findSuggestionsForUser(userId: string) {
    return prisma.user.findMany({
      where: {
        AND: [
          { NOT: { id: userId } },
          { NOT: { followers: { some: { followerId: userId } } } },
        ],
      },
      select: {
        id: true,
        name: true,
        userName: true,
        image: true,
        _count: {
          select: {
            followers: true,
          },
        },
      },
      take: 5,
    });
  },

  async searchUsers(searchTerm: string) {
    return prisma.user.findMany({
      where: {
        OR: [
          { userName: { contains: searchTerm, mode: "insensitive" } },
          { name: { contains: searchTerm, mode: "insensitive" } },
          { email: { contains: searchTerm, mode: "insensitive" } },
        ],
      },
      orderBy: [{ name: "asc" }, { userName: "asc" }],
      take: 5,
      select: {
        id: true,
        userName: true,
        name: true,
        image: true,
      },
    });
  },

  async findProfileByUsername(username: string) {
    return prisma.user.findUnique({
      where: { userName: username },
      select: {
        id: true,
        name: true,
        userName: true,
        bio: true,
        image: true,
        backgroundImage: true,
        location: true,
        website: true,
        createdAt: true,
        _count: {
          select: {
            followers: true,
            following: true,
            posts: true,
          },
        },
      },
    });
  },

  async updateProfile(userId: string, data: {
    name: string;
    bio: string;
    location: string;
    website: string;
    backgroundImage?: string;
  }) {
    return prisma.user.update({
      where: { id: userId },
      data,
    });
  },

  async findFollow(followerId: string, followingId: string) {
    return prisma.follows.findUnique({
      where: {
        followerId_followingId: {
          followerId,
          followingId,
        },
      },
    });
  },

  async createFollow(followerId: string, followingId: string) {
    return prisma.follows.create({
      data: {
        followerId,
        followingId,
      },
    });
  },

  async deleteFollow(followerId: string, followingId: string) {
    return prisma.follows.delete({
      where: {
        followerId_followingId: {
          followerId,
          followingId,
        },
      },
    });
  },
};
