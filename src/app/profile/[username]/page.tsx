import { notFound } from "next/navigation";
import ProfilePageClient from "./ProfilePageClient";
import { getProfilePageData } from "@/server/queries/profile.query";

export type paramsType = Promise<{ username: string }>;

async function ProfilePageServer({ params }: { params: paramsType }) {
    const { username } = await params;
    const data = await getProfilePageData(username);
    if (!data) notFound();

    return <ProfilePageClient user={data.user} posts={data.posts} likedPosts={data.likedPosts} savedPosts={data.savedPosts} isFollowing={data.isFollowing} viewerDbUserId={data.session?.userId ?? null} />;
}

export default ProfilePageServer;
