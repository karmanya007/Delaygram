"use client";

import { BellIcon, HomeIcon, LogOutIcon, MenuIcon, UserIcon } from "lucide-react";
import { Button } from "./ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "./ui/sheet";
import Link from "next/link";
import { SignInButton, SignOutButton } from "@clerk/nextjs";
import { useState } from "react";
import { Badge } from "./ui/badge";
import { HomeLink } from "./HomeLink";

function MobileNavbarClient({
    isSignedIn,
    profileHref,
    unreadNotificationCount,
}: {
    isSignedIn: boolean;
    profileHref?: string;
    unreadNotificationCount: number;
}) {
    const [showMobileMenu, setShowMobileMenu] = useState(false);

    return (
        <Sheet open={showMobileMenu} onOpenChange={setShowMobileMenu}>
            <SheetTrigger asChild>
                <Button variant="ghost" size="icon">
                    <MenuIcon className="h-5 w-5" />
                </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[300px]">
                <SheetHeader>
                    <SheetTitle>Menu</SheetTitle>
                </SheetHeader>
                <nav className="flex flex-col space-y-4 mt-6">
                    <Button variant="ghost" className="flex items-center gap-3 justify-start" asChild>
                        <HomeLink>
                            <HomeIcon className="w-4 h-4" />
                            Home
                        </HomeLink>
                    </Button>

                    {isSignedIn ? (
                        <>
                            <Button variant="ghost" className="flex items-center gap-3 justify-start" asChild>
                                <Link href="/notifications" className="relative">
                                    <BellIcon className="w-4 h-4" />
                                    Notifications
                                    {unreadNotificationCount > 0 ? (
                                        <Badge
                                            variant="destructive"
                                            className="h-5 min-w-5 px-1 text-[10px] absolute left-20 -top-2"
                                        >
                                            {unreadNotificationCount > 99 ? "99+" : unreadNotificationCount}
                                        </Badge>
                                    ) : null}
                                </Link>
                            </Button>
                            <Button variant="ghost" className="flex items-center gap-3 justify-start" asChild>
                                <Link href={profileHref ?? "/"}>
                                    <UserIcon className="w-4 h-4" />
                                    Profile
                                </Link>
                            </Button>
                            <SignOutButton>
                                <Button variant="ghost" className="flex items-center gap-3 justify-start w-full">
                                    <LogOutIcon className="w-4 h-4" />
                                    Logout
                                </Button>
                            </SignOutButton>
                        </>
                    ) : (
                        <SignInButton mode="modal">
                            <Button variant="default" className="w-full" onClick={() => setShowMobileMenu(!showMobileMenu)}>
                                Sign In
                            </Button>
                        </SignInButton>
                    )}
                </nav>
            </SheetContent>
        </Sheet>
    );
}

export default MobileNavbarClient;
