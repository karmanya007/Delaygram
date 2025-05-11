"use client";

import * as React from "react";
import { useRouter, usePathname } from "next/navigation";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { ChevronsUpDown } from "lucide-react";

interface Room {
    id: string;
    name: string;
    roomSlug: string;
}

interface RoomSwitcherProps {
    rooms: Room[];
    className?: string;
}

export function RoomSwitcher({ rooms, className }: RoomSwitcherProps) {
    const router = useRouter();
    const pathname = usePathname();

    const currentRoomSlug = React.useMemo(() => {
        if (pathname.startsWith("/room/")) {
            return pathname.split("/")[2];
        }
        return "global"; // Default to global
    }, [pathname]);

    const handleValueChange = (value: string) => {
        if (value === "global") {
            router.push("/");
        } else if (value === "create-new-room") {
            router.push("/room/create");
        } else {
            router.push(`/room/${value}`);
        }
    };

    return (
        <Select onValueChange={handleValueChange} defaultValue={currentRoomSlug}>
            <SelectTrigger className="ext-xl font-bold text-primary font-mono tracking-wider">
                <SelectValue placeholder="Select a room" />
            </SelectTrigger>
            <SelectContent className="ext-xl font-bold text-primary font-mono tracking-wider">
                <SelectItem value="global">Global</SelectItem>
                {rooms.map((room) => (
                    <SelectItem key={room.id} value={room.roomSlug}>
                        {room.name}
                    </SelectItem>
                ))}
                <SelectItem value="create-new-room" className="text-green-500">
                    + Create New Room
                </SelectItem>
            </SelectContent>
        </Select>
    );
}
