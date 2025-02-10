"use client";

import { BellIcon, HomeIcon, LogOutIcon, MenuIcon, UserIcon } from "lucide-react";
import { Button } from "./ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "./ui/sheet";
import Link from "next/link";
import { SignInButton, SignOutButton, useUser } from "@clerk/nextjs";
import { useState } from "react";

function MobileNavbarClient() {
    const { user: currentUser } = useUser();
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
                        <Link href="/">
                            <HomeIcon className="w-4 h-4" />
                            Home
                        </Link>
                    </Button>

                    {currentUser ? (
                        <>
                            <Button variant="ghost" className="flex items-center gap-3 justify-start" asChild>
                                <Link href="/notifications">
                                    <BellIcon className="w-4 h-4" />
                                    Notifications
                                </Link>
                            </Button>
                            <Button variant="ghost" className="flex items-center gap-3 justify-start" asChild>
                                <Link href={`/profile/${currentUser.username ?? currentUser.emailAddresses[0].emailAddress.split("@")[0]}`}>
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
