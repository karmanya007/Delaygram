"use client";

import React, { createContext, useContext, useState } from "react";

const ROOM_STORAGE_KEY = "huddle_selected_room";

interface RoomContextType {
    selectedRoomSlug: string;
    setSelectedRoomSlug: (slug: string) => void;
}

const RoomContext = createContext<RoomContextType>({
    selectedRoomSlug: "global",
    setSelectedRoomSlug: () => {},
});

export function RoomProvider({ children }: { children: React.ReactNode }) {
    const [selectedRoomSlug, setSlug] = useState<string>(() => {
        if (typeof window === "undefined") return "global";
        return localStorage.getItem(ROOM_STORAGE_KEY) ?? "global";
    });

    const setSelectedRoomSlug = (slug: string) => {
        localStorage.setItem(ROOM_STORAGE_KEY, slug);
        setSlug(slug);
    };

    return (
        <RoomContext.Provider value={{ selectedRoomSlug, setSelectedRoomSlug }}>
            {children}
        </RoomContext.Provider>
    );
}

export function useRoom() {
    return useContext(RoomContext);
}
