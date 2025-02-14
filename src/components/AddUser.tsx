import React, { useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { combinedSearch } from "@/actions/user.action";

type Users = Awaited<ReturnType<typeof combinedSearch>>;
type User = Users[number];

interface AddUserProps {
    Child: React.ComponentType;
    users: User[];
    setUsers: React.Dispatch<React.SetStateAction<{ name: string | null; id: string; userName: string; image: string | null }[]>>;
}

export default function AddUser({ Child, users, setUsers }: AddUserProps) {
    const [inputValue, setInputValue] = useState("");

    return (
        <div className="w-full">
            <Popover>
                <PopoverTrigger asChild>
                    <div tabIndex={0} role="textbox" className="w-full border rounded px-3 py-2 bg-base text-base focus:border-gray-500 focus:ring-2 focus:ring-grey-200 flex flex-wrap">
                        {users.map((user, index) => (
                            <span key={index} className="bg-gray-200 px-2 py-1 mx-1 rounded text-black">
                                {user.name}
                            </span>
                        ))}
                        <span className="bg-gray-200 px-2 py-1 mx-1 rounded text-black">Add User</span>
                    </div>
                </PopoverTrigger>
                <PopoverContent>
                    <Child />
                </PopoverContent>
            </Popover>
        </div>
    );
}
