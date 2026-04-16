import React from 'react'
import DesktopNavbar from './DesktopNavbar'
import MobileNavbar from './MobileNavbar'
import { RoomSwitcher } from './RoomSwitcher';
import { getNavigationData } from '@/server/queries/navigation.query';
import { HomeLink } from './HomeLink';

async function Navbar() {
    const { session, rooms, unreadNotificationCount } = await getNavigationData();

    return (
        <nav className="sticky top-0 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 z-50">
            <div className="max-w-7xl mx-auto px-4">
                <div className="flex items-center justify-between h-16">
                    <div className="flex items-center">
                        <HomeLink className="text-xl font-bold text-primary font-mono tracking-wider">
                            Huddle
                        </HomeLink>
                    </div>
                    <div className="flex space-x-4">
                        {session && <RoomSwitcher rooms={rooms} className=" md:flex" />}
                        <DesktopNavbar session={session} unreadNotificationCount={unreadNotificationCount} />
                        <MobileNavbar session={session} unreadNotificationCount={unreadNotificationCount} />
                    </div>
                </div>
            </div>
        </nav>
    )
}

export default Navbar
