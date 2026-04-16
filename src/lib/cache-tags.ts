export const cacheTags = {
  feedGlobal: () => "feed:global",
  feedRoom: (roomId: string) => `feed:room:${roomId}`,
  profile: (userId: string) => `profile:${userId}`,
  notifications: (userId: string) => `notifications:${userId}`,
  roomsForUser: (userId: string) => `rooms:user:${userId}`,
  roomAdmin: (roomId: string) => `room:admin:${roomId}`,
};
