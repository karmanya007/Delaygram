import React, { useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { combinedSearch } from "@/actions/user.action";
import { Badge } from "./ui/badge";
import { XCircle } from "lucide-react";

type Users = Awaited<ReturnType<typeof combinedSearch>>;
type User = Users[number];

interface AddUserProps {
    TriggerChild?: React.ComponentType;
    ContentChild: React.ComponentType;
    users: User[];
    setUsers: React.Dispatch<React.SetStateAction<User[]>>;
    open: boolean;
    setOpen: React.Dispatch<React.SetStateAction<boolean>>;
}

export default function AddUser({ TriggerChild, ContentChild, users, setUsers, open, setOpen }: AddUserProps) {
    const [inputValue, setInputValue] = useState("");
    const handleRemoveUser = (userId: string) => {
        setUsers(users.filter((u) => u.id !== userId));
        setTimeout(() => setOpen(false), 1);
    };

    return (
        <div className="w-full">
            <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                    {TriggerChild ? (
                        <TriggerChild />
                    ) : (
                        <div tabIndex={0} role="textbox" className="w-full border rounded px-3 py-2 min-h-12  bg-base text-base focus:border-gray-500 focus:ring-2 focus:ring-grey-200 flex flex-wrap">
                            {/* {users.map((user, index) => (
                                <span key={index} className="bg-gray-200 px-2 py-1 mx-1 my-1 rounded text-black">
                                    {user.name}
                                </span>
                            ))}
                            <span className="bg-gray-200 px-2 py-1 mx-1 my-1 rounded text-black">Add User</span> */}
                            <div className="flex flex-wrap gap-2">
                                {users.map((user) => (
                                    <Badge key={user.id} variant="secondary" className="flex items-center gap-1 px-3 py-1">
                                        {user.name || user.userName}
                                        <XCircle
                                            className="w-4 h-4 ml-1 cursor-pointer hover:text-red-500"
                                            onClick={(event) => {
                                                event.stopPropagation();
                                                handleRemoveUser(user.id);
                                            }}
                                        />
                                    </Badge>
                                ))}
                            </div>
                        </div>
                    )}
                </PopoverTrigger>
                <PopoverContent align="start" side="bottom">
                    <ContentChild />
                </PopoverContent>
            </Popover>
        </div>
    );
}
