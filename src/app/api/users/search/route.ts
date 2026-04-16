import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { userRepository } from "@/server/repositories/user.repository";

export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json([], { status: 401 });

  const q = req.nextUrl.searchParams.get("q") ?? "";
  if (!q || q.length < 1) return NextResponse.json([]);

  const users = await userRepository.searchUsers(q);
  return NextResponse.json(users);
}
