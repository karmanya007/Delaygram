import Link from "next/link";
import { notFound } from "next/navigation";

import CreatePost from "@/components/CreatePost";
import PostCard from "@/components/PostCard";
import SuggestedUsers from "@/components/SuggestedUsers";
import { UserSearch } from "@/components/UserSearch";
import { Button } from "@/components/ui/button";
import { getRoomPageData } from "@/server/queries/feed.query";

export default async function Room({ params }: { params: Promise<{ roomSlug: string }> }) {
  const { roomSlug } = await params;
  const { session, room, posts, suggestedUsers } = await getRoomPageData(roomSlug);

  if (!room) {
    notFound();
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-10 gap-6">
      <div className={`lg:col-span-6 lg:col-start-2`}>
        <div className="mb-6 rounded-xl border bg-card p-5 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-1">
              <h1 className="text-2xl font-semibold tracking-tight">{room.name}</h1>
              {room.description ? (
                <p className="text-sm text-muted-foreground">{room.description}</p>
              ) : (
                <p className="text-sm text-muted-foreground">No room description yet.</p>
              )}
            </div>
            {session?.userId === room.adminId ? (
              <Button variant="outline" asChild>
                <Link href={`/room/${room.roomSlug}/admin`}>Manage Room</Link>
              </Button>
            ) : null}
          </div>
        </div>

        {session ? <CreatePost roomId={room.id} /> : null}

        <div className="space-y-6">
          {posts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              dbUserId={session?.userId ?? null}
              canPinPost={session?.userId === room.adminId}
            />
          ))}
        </div>
      </div>
      <div className="hidden lg:block lg:col-span-3 sticky top-20">
        <div className="mb-6">
          <UserSearch />
        </div>
        {suggestedUsers?.length ? <SuggestedUsers users={suggestedUsers} /> : null}
      </div>
    </div>
  );
}
