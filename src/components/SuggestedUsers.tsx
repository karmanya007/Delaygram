import { getRandomUsers } from "@/actions/user.action";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Avatar, AvatarImage } from "./ui/avatar";
import Link from "next/link";
import FollowButton from "./FollowButton";

async function SuggestedUsers() {
  const users = await getRandomUsers();
  if (users?.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Who to Follow</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {users.map((user) => (
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
              <FollowButton userId={user.id} />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

export default SuggestedUsers