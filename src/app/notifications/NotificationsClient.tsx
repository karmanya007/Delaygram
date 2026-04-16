"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { AtSignIcon, BellIcon, BookmarkIcon, HeartIcon, MailIcon, MessageCircleIcon, UserPlusIcon } from "lucide-react";

import { markNotificationAsRead } from "@/actions/notification.action";
import type { NotificationListItem } from "@/server/queries/notifications.query";
import { Avatar, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "@/hooks/use-toast";

const getNotificationIcon = (type: string) => {
  switch (type) {
    case "LIKE":
      return <HeartIcon className="size-4 text-red-500" />;
    case "COMMENT":
      return <MessageCircleIcon className="size-4 text-blue-500" />;
    case "FOLLOW":
      return <UserPlusIcon className="size-4 text-green-500" />;
    case "NEW_POST":
      return <BellIcon className="size-4 text-purple-500" />;
    case "MENTION":
      return <AtSignIcon className="size-4 text-orange-500" />;
    case "ROOM_INVITE":
      return <MailIcon className="size-4 text-teal-500" />;
    default:
      return null;
  }
};

const getNotificationText = (type: string, roomName?: string | null) => {
  switch (type) {
    case "LIKE":
      return "liked your post";
    case "COMMENT":
      return "commented on your post";
    case "FOLLOW":
      return "started following you";
    case "NEW_POST":
      return "published a new post";
    case "MENTION":
      return "mentioned you in a post";
    case "ROOM_INVITE":
      return roomName ? `invited you to join "${roomName}"` : "invited you to a room";
    default:
      return "";
  }
};

function NotificationsClient({
  initialNotifications,
}: {
  initialNotifications: NotificationListItem[];
}) {
  const [notifications, setNotifications] = useState(initialNotifications);
  const unreadCount = notifications.filter((n) => !n.read).length;
  const processedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const unreadIds = initialNotifications
      .filter((n) => !n.read && !processedRef.current.has(n.id))
      .map((n) => n.id);

    if (unreadIds.length === 0) return;

    unreadIds.forEach((id) => processedRef.current.add(id));

    const markAsRead = async () => {
      const result = await markNotificationAsRead({ notificationIds: unreadIds });

      if (result.success) {
        setNotifications((current) =>
          current.map((n) =>
            unreadIds.includes(n.id) ? { ...n, read: true } : n,
          ),
        );
      } else {
        toast({ description: result.error, variant: "destructive" });
      }
    };

    void markAsRead();
  }, [initialNotifications]);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="border-b">
          <div className="flex items-center justify-between">
            <CardTitle>Notifications</CardTitle>
            <span className="text-sm text-muted-foreground">{unreadCount} unread</span>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-[calc(100vh-12rem)]">
            {notifications.length === 0 ? (
              <div className="p-4 text-center text-muted-foreground">No notifications yet</div>
            ) : (
              notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`flex items-start gap-4 p-4 border-b hover:bg-muted/25 transition-colors ${
                    !notification.read ? "bg-muted/50" : ""
                  }`}
                >
                  <Avatar className="mt-1">
                    <AvatarImage src={notification.creator.image ?? "/avatar.png"} />
                  </Avatar>
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      {getNotificationIcon(notification.type)}
                      <span>
                        <Link
                          href={`/profile/${notification.creator.userName}`}
                          className="font-medium hover:underline"
                        >
                          {notification.creator.name ?? notification.creator.userName}
                        </Link>{" "}
                        {getNotificationText(notification.type, notification.room?.name)}
                      </span>
                    </div>

                    {notification.post &&
                      ["LIKE", "COMMENT", "NEW_POST", "MENTION"].includes(notification.type) && (
                        <div className="pl-6 space-y-2">
                          <div className="text-sm text-muted-foreground rounded-md p-2 bg-muted/30 mt-2">
                            <p>{notification.post.content}</p>
                            {notification.post.image && (
                              <img
                                src={notification.post.image}
                                alt="Post"
                                className="mt-2 rounded-md w-full max-w-[200px] h-auto object-cover"
                              />
                            )}
                          </div>

                          {notification.type === "COMMENT" && notification.comment && (
                            <div className="text-sm p-2 bg-accent/50 rounded-md">
                              {notification.comment.content}
                            </div>
                          )}
                        </div>
                      )}

                    {notification.type === "ROOM_INVITE" && notification.room && (
                      <div className="pl-6">
                        <Link
                          href={`/room/${notification.room.roomSlug}`}
                          className="text-sm text-primary hover:underline"
                        >
                          View room →
                        </Link>
                      </div>
                    )}

                    <div className="flex items-center justify-between pl-6">
                      <p className="text-sm text-muted-foreground">
                        {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                      </p>
                      {notification.room && (
                        <span
                          className="inline-block px-2 py-1 text-[10px] rounded-sm font-bold max-w-xs overflow-hidden"
                          style={{ backgroundColor: "#EEEEEE", color: "hsl(0, 0%, 20%)" }}
                        >
                          {notification.room.name}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}

export default NotificationsClient;
