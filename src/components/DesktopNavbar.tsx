import { BellIcon, HomeIcon, UserIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { SignInButton, UserButton } from "@clerk/nextjs";
import { ModeToggle } from "./ModeToggle";
import type { AppSession } from "@/lib/auth/session";
import { Badge } from "@/components/ui/badge";
import { HomeLink } from "./HomeLink";

async function DesktopNavbar({
    session,
    unreadNotificationCount,
}: {
    session: AppSession | null;
    unreadNotificationCount: number;
}) {
    return (
        <div className="hidden md:flex items-center space-x-4">
            <ModeToggle />

            <Button variant="ghost" className="flex items-center gap-2" asChild>
                <HomeLink>
                    <HomeIcon className="w-4 h-4" />
                    <span className="hidden lg:inline">Home</span>
                </HomeLink>
            </Button>

            {session ? (
                <>
                    <Button variant="ghost" className="flex items-center gap-2" asChild>
                        <Link href="/notifications" className="relative">
                            <BellIcon className="w-4 h-4" />
                            {unreadNotificationCount > 0 ? (
                                <Badge
                                    variant="destructive"
                                    className="h-5 min-w-5 px-1 text-[10px] absolute -top-2 -right-3"
                                >
                                    {unreadNotificationCount > 99 ? "99+" : unreadNotificationCount}
                                </Badge>
                            ) : null}
                            <span className="hidden lg:inline">Notifications</span>
                        </Link>
                    </Button>
                    <Button variant="ghost" className="flex items-center gap-2" asChild>
                        <Link
                            href={`/profile/${session.userName}`}
                        >
                            <UserIcon className="w-4 h-4" />
                            <span className="hidden lg:inline">Profile</span>
                        </Link>
                    </Button>
                    <UserButton />
                </>
            ) : (
                <SignInButton mode="modal">
                    <Button variant="default">Sign In</Button>
                </SignInButton>
            )}
        </div>
    );
}
export default DesktopNavbar;
