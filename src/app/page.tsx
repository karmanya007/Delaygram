import { getPosts } from "@/actions/post.action";
import { getDbUserId, getRandomUsers } from "@/actions/user.action";
import CreatePost from "@/components/CreatePost";
import PostCard from "@/components/PostCard";
import SuggestedUsers from "@/components/SuggestedUsers";
import { currentUser } from "@clerk/nextjs/server";

export default async function Home() {
  const user = await currentUser();
  const dbUserId = await getDbUserId();
  const posts = await getPosts();
  const users = await getRandomUsers();

  return (
    <div className="grid grid-cols-1 lg:grid-cols-10 gap-6">
      <div className={`lg:col-span-6 ${!users?.length ? 'lg:col-start-3' : 'lg:col-start-2'}`}>
        {user ? <CreatePost /> : null}

        <div className="space-y-6">
          {posts.map((post) => (
            <PostCard key={post.id} post={post} dbUserId={dbUserId} />
          ))}
        </div>
      </div>
      {users?.length ? <div className="hidden lg:block lg:col-span-3 sticky top-20">
        <SuggestedUsers users={users} />
      </div> : null}
    </div>
  );
}
