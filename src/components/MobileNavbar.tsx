import MobileNavbarClient from "./MobileNavbarClient";
import { ModeToggle } from "./ModeToggle";

function MobileNavbar() {
    return (
        <div className="flex md:hidden items-center space-x-2">
            <ModeToggle />
            <MobileNavbarClient />
        </div>
    );
}

export default MobileNavbar;