"use client";

import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Avatar, AvatarImage } from "./ui/avatar";
import Link from "next/link";
import FollowButton from "./FollowButton";
import { useState } from "react";

type User = {
  id: string;
  name: string | null;
  userName: string;
  image: string | null;
  _count: {
    followers: number;
  };
};

function SuggestedUsers({ users }: { users: User[] }) {
  const [items, setItems] = useState(users);

  const handleFollowChange = (userId: string, following: boolean) => {
    if (!following) {
      return;
    }

    setItems((current) => current.filter((user) => user.id !== userId));
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Who to Follow</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {items.map((user) => (
            <div key={user.id} className="flex gap-2 items-center justify-between ">
              <div className="flex items-center gap-1">
                <Link href={`/profile/${user.userName}`}>
                  <Avatar>
                    <AvatarImage src={user.image ?? "/avatar.png"} />
                  </Avatar>
                </Link>
                <div className="text-xs">
                  <Link href={`/profile/${user.userName}`} className="font-medium cursor-pointer">
                    {user.name}
                  </Link>
                  <p className="text-muted-foreground">@{user.userName}</p>
                  <p className="text-muted-foreground">{user._count.followers} followers</p>
                </div>
              </div>
              <FollowButton
                userId={user.id}
                onFollowChange={(following) => handleFollowChange(user.id, following)}
              />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

export default SuggestedUsers
