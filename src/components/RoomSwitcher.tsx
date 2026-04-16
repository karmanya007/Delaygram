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
import { useRoom } from "./RoomContext";

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
    const { selectedRoomSlug, setSelectedRoomSlug } = useRoom();

    // When URL is a room page, sync the context (e.g. direct link, browser back/forward)
    React.useEffect(() => {
        if (pathname.startsWith("/room/")) {
            const slug = pathname.split("/")[2];
            if (slug && slug !== "create" && slug !== "join") {
                setSelectedRoomSlug(slug);
            }
        }
    }, [pathname]);

    const handleValueChange = (value: string) => {
        if (value === "create-new-room") {
            router.push("/room/create");
            return;
        }
        setSelectedRoomSlug(value);
        router.push(value === "global" ? "/" : `/room/${value}`);
    };

    return (
        <Select onValueChange={handleValueChange} value={selectedRoomSlug}>
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
