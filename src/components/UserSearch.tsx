"use client";

import { useEffect, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { combinedSearch } from "@/actions/user.action";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "./ui/command";
import { Loader2Icon } from "lucide-react";
import Link from "next/link";

type Users = Awaited<ReturnType<typeof combinedSearch>>;
type User = Users[number];

type UserSearchProps = {
    onSelectUser?: (user: User) => void;
};

export function UserSearch({ onSelectUser }: UserSearchProps) {
    const [searchTerm, setSearchTerm] = useState("");
    const [results, setResults] = useState<User[]>([]);
    const [isOpen, setIsOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const { user: currentUser } = useUser();

    useEffect(() => {
        const searchUsers = async () => {
            if (!searchTerm.trim()) {
                setResults([]);
                return;
            }

            setIsLoading(true);
            setError(null);

            try {
                const users = await combinedSearch(searchTerm);
                setResults(users);
            } catch (err) {
                setError("Failed to search users");
            } finally {
                setIsLoading(false);
            }
        };

        const timeoutId = setTimeout(searchUsers, 300);
        return () => clearTimeout(timeoutId);
    }, [searchTerm, currentUser?.id]);

    const getCommandEmptyContent = () => {
        return (isLoading ? (
            <div className="flex items-center justify-center">
                <Loader2Icon className="size-4 mr-2 animate-spin" />
            </div>
        ) : error ? (
            `${error}`
        ) : searchTerm === "" ? (
            "Start typing to load users"
        ) : (
            "No user found"
        ));
    }

    return (
        <Command className="rounded-lg border shadow-md" shouldFilter={false} onFocus={() => setIsOpen(true)} onBlur={(e) => {
            // Get the actual DOM event
            const nativeEvent = e.nativeEvent;
            const currentTarget = e.currentTarget;
            // Check if new focused element is outside the component
            if (!currentTarget.contains(nativeEvent.relatedTarget as Node)) {
                setIsOpen(false);
            }
        }}>
            <CommandInput placeholder="Search" value={searchTerm} onValueChange={setSearchTerm} />
            {isOpen ? (
                <CommandList>
                    <CommandEmpty>
                        {getCommandEmptyContent()}
                    </CommandEmpty>
                    <CommandGroup>
                        {results.map((user) => (
                            <CommandItem asChild key={user.id} value={user.userName}>
                                <Link
                                    href={`/profile/${user.userName}`}
                                    onClick={(e) => {
                                        if (onSelectUser) {
                                            e.preventDefault();
                                            onSelectUser(user);
                                        }
                                        setSearchTerm("");
                                    }}
                                    className="block w-full hover:cursor-pointer"
                                >
                                    <div className="flex items-center gap-3">
                                        <Avatar className="h-8 w-8">
                                            <AvatarImage src={user.image || undefined} />
                                            <AvatarFallback>{user.userName[0]?.toUpperCase()}</AvatarFallback>
                                        </Avatar>
                                        <div className="flex flex-col">
                                            <span className="font-medium">{user.userName}</span>
                                            {user.name && <span className="text-sm text-muted-foreground">{user.name}</span>}
                                        </div>
                                    </div>
                                </Link>
                            </CommandItem>
                        ))}
                    </CommandGroup>
                </CommandList>
            ) : null}
        </Command>
    );
}