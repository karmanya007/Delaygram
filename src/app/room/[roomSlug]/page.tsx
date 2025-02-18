import { getPosts } from "@/actions/post.action";
import { getDbUserId, getJoinedRooms, getRandomUsers } from "@/actions/user.action";
import CreatePost from "@/components/CreatePost";
import PostCard from "@/components/PostCard";
import SuggestedUsers from "@/components/SuggestedUsers";
import { UserSearch } from "@/components/UserSearch";
import { currentUser } from "@clerk/nextjs/server";
import { notFound } from "next/navigation";

export default async function Room({ params }: { params: Promise<{ roomSlug: string }> }) {
  const { roomSlug } = await params;
  const dbUserId = await getDbUserId();
  const joinedRooms = await getJoinedRooms(dbUserId);
  const joinedRoom = (joinedRooms && "roomsJoined" in joinedRooms) ? joinedRooms?.roomsJoined?.find(rooms => rooms.room.roomSlug === roomSlug) : null;

  if (!joinedRoom)
    notFound();

  const user = await currentUser();
  const posts = await getPosts(joinedRoom.roomId);
  const users = await getRandomUsers();

  return (
    <div className="grid grid-cols-1 lg:grid-cols-10 gap-6">
      <div className={`lg:col-span-6 lg:col-start-2`}>
        {user ? <CreatePost roomId={joinedRoom.roomId} /> : null}

        <div className="space-y-6">
          {posts.map((post) => (
            <PostCard key={post.id} post={post} dbUserId={dbUserId} />
          ))}
        </div>
      </div>
      <div className="hidden lg:block lg:col-span-3 sticky top-20">
        <div className="mb-6">
          <UserSearch />
        </div>
        {users?.length ? <SuggestedUsers users={users} /> : null}
      </div>
    </div>
  );
}
