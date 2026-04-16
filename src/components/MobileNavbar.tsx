import MobileNavbarClient from "./MobileNavbarClient";
import { ModeToggle } from "./ModeToggle";
import type { AppSession } from "@/lib/auth/session";

function MobileNavbar({
    session,
    unreadNotificationCount,
}: {
    session: AppSession | null;
    unreadNotificationCount: number;
}) {
    return (
        <div className="flex md:hidden items-center space-x-2">
            <ModeToggle />
            <MobileNavbarClient
                isSignedIn={Boolean(session)}
                profileHref={session ? `/profile/${session.userName}` : undefined}
                unreadNotificationCount={unreadNotificationCount}
            />
        </div>
    );
}

export default MobileNavbar;
