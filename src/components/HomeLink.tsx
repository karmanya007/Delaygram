"use client";

import Link from "next/link";
import React from "react";
import { useRoom } from "./RoomContext";

export function HomeLink({
    children,
    className,
}: {
    children: React.ReactNode;
    className?: string;
}) {
    const { selectedRoomSlug } = useRoom();
    const href = selectedRoomSlug === "global" ? "/" : `/room/${selectedRoomSlug}`;

    return (
        <Link href={href} className={className}>
            {children}
        </Link>
    );
}
