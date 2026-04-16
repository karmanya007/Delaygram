import CreatePost from "@/components/CreatePost";
import PostCard from "@/components/PostCard";
import SuggestedUsers from "@/components/SuggestedUsers";
import { UserSearch } from "@/components/UserSearch";
import { getHomePageData } from "@/server/queries/feed.query";

export default async function Home() {
  const { session, posts, suggestedUsers } = await getHomePageData();

  return (
    <div className="grid grid-cols-1 lg:grid-cols-10 gap-6">
      <div className={`lg:col-span-6 lg:col-start-2`}>
        {session ? <CreatePost /> : null}

        <div className="space-y-6">
          {posts.map((post) => (
            <PostCard key={post.id} post={post} dbUserId={session?.userId ?? null} />
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
