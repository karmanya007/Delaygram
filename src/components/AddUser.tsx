import React, { useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { User } from "@prisma/client";

interface AddUserProps {
    Child: React.ComponentType;
    users: User[];
    setUsers: React.Dispatch<React.SetStateAction<string[]>>;
}

export default function AddUser({ Child, users, setUsers }: AddUserProps) {
    const [inputValue, setInputValue] = useState("");

    // Handle input change
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setInputValue(e.target.value);
    };

    // Handle input submission (split by commas)
    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter" || e.key === ",") {
            e.preventDefault();
            const newUsers = inputValue
                .split(",")
                .map((user) => user.trim())
                .filter((user) => user !== "");

            setUsers((prev) => [...prev, ...newUsers]);
            setInputValue("");
        }
    };

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
