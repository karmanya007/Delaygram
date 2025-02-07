"use client";

import { useState } from "react";
import { Button } from "./ui/button";
import { Loader2Icon } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { toggleFollow } from "@/actions/user.action";

function FollowButton({ userId }: { userId: string }) {
    const [isLoading, setIsLoading] = useState(false);

    const handleFollow = async () => {
        setIsLoading(true);

        try {
            await toggleFollow(userId);
            toast({
                description: "User followed successfully"
            });
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