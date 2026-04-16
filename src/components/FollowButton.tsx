"use client";

import { useState } from "react";
import { Button } from "./ui/button";
import { Loader2Icon } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { toggleFollow } from "@/actions/user.action";

function FollowButton({
    userId,
    onFollowChange,
}: {
    userId: string;
    onFollowChange?: (following: boolean) => void;
}) {
    const [isLoading, setIsLoading] = useState(false);

    const handleFollow = async () => {
        setIsLoading(true);

        try {
            const result = await toggleFollow({ targetUserId: userId });
            if (result.success) {
                toast({
                    description: result.data.following ? "User followed successfully" : "User unfollowed successfully"
                });
                onFollowChange?.(result.data.following);
            } else {
                toast({
                    description: result.error,
                    variant: "destructive"
                });
            }
        } catch (error) {
            console.log("Error in following user", error);
            toast({
                description: "Failed to follow user",
                variant: "destructive"
            });
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <Button
            size={"sm"}
            variant={"secondary"}
            onClick={handleFollow}
            disabled={isLoading}
            className="w-20"
        >
            {isLoading ? <Loader2Icon className="size-4 animate-spin" /> : "Follow"}
        </Button>
    )
}

export default FollowButton
