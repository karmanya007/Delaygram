import type { getPostsQuery } from "@/server/queries/feed.query";
import type {
  getProfileByUsernameQuery,
  getUserPostsQuery,
} from "@/server/queries/profile.query";
import type { getNotificationsQuery } from "@/server/queries/notifications.query";

export type PostCardViewModel = Awaited<ReturnType<typeof getPostsQuery>>[number];
export type ProfileViewModel = NonNullable<
  Awaited<ReturnType<typeof getProfileByUsernameQuery>>
>;
export type ProfilePostsViewModel = Awaited<ReturnType<typeof getUserPostsQuery>>;
export type NotificationViewModel = Awaited<
  ReturnType<typeof getNotificationsQuery>
>["notifications"][number];
