"use client";
import React, { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { nanoid } from "nanoid";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Users, Link, Copy, CheckCircle, XCircle } from "lucide-react";
import AddUser from "@/components/AddUser";
import { UserSearch } from "@/components/UserSearch";
import { createRoomInvite } from "@/actions/room.action";
import { combinedSearch } from "@/actions/user.action";

const formSchema = z.object({
    users: z.array(z.string()).min(1, "Please add at least one user."),
});

type Users = Awaited<ReturnType<typeof combinedSearch>>;
type User = Users[number];

const JoinRoom = () => {
    const searchParams = useSearchParams();
    const roomId = searchParams.get("roomId");
    const [users, setUsers] = useState<User[]>([]);
    const [inviteLink, setInviteLink] = useState<string | null>(null);
    const [isValidInvite, setIsValidInvite] = useState<boolean | null>(null);
    const [isCopied, setIsCopied] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [currentUserSet, setCurrentUserSet] = useState<Set<string>>(new Set());
    const [canGenerateNewLink, setCanGenerateNewLink] = useState(true);
    const [open, setOpen] = useState(false);

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: { users: [] },
    });

    // Track user list changes
    useEffect(() => {
        const newUserSet = new Set(users.map((user) => user.id));
        const hasUserListChanged = users.length !== currentUserSet.size || ![...newUserSet].every((id) => currentUserSet.has(id));

        setCanGenerateNewLink(hasUserListChanged || !inviteLink);
    }, [users, currentUserSet, inviteLink]);

    function onSelectUser(user: User) {
        setUsers((prev) => [...prev, user]);
        if (users.length > 0) {
            form.setValue(
                "users",
                users.map((user) => user.id)
            );
        }
        setOpen(false);
    }

    const WrappedUserSearch: React.FC = () => <UserSearch onSelectUser={onSelectUser} />;

    async function onInvite() {
        if (!roomId) return;
        setIsLoading(true);
        try {
            const inviteId = nanoid(10);
            await createRoomInvite(users, roomId, inviteId);
            setInviteLink(`${window.location.origin}/room/${inviteId}`);
            // Update current user set after successful invite generation
            setCurrentUserSet(new Set(users.map((user) => user.id)));
        } catch (error) {
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    }

    const copyToClipboard = async () => {
        if (inviteLink) {
            await navigator.clipboard.writeText(inviteLink);
            setIsCopied(true);
            setTimeout(() => setIsCopied(false), 2000);
        }
    };

    const handleRemoveUser = (userId: string) => {
        setUsers(users.filter((u) => u.id !== userId));
    };

    return (
        <div className="p-4">
            <div className="max-w-3xl mx-auto">
                <Card className="shadow-lg">
                    <CardHeader className="space-y-1">
                        <div className="flex items-center space-x-2">
                            <Users className="w-5 h-5 text-primary" />
                            <CardTitle>Invite Users to Room</CardTitle>
                        </div>
                        <CardDescription>Add team members to collaborate in this room</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <Form {...form}>
                            <form className="space-y-4">
                                <FormField
                                    control={form.control}
                                    name="users"
                                    render={() => (
                                        <FormItem>
                                            <FormLabel className="text-base">Select Users</FormLabel>
                                            <FormControl>
                                                <AddUser ContentChild={WrappedUserSearch} users={users} setUsers={setUsers} open={open} setOpen={setOpen} />
                                            </FormControl>
                                            <FormDescription>Search and select users to invite to this room</FormDescription>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </form>
                        </Form>
                    </CardContent>
                    <CardFooter className="flex flex-col space-y-4">
                        <Button className="w-full" onClick={onInvite} disabled={users.length === 0 || isLoading || !canGenerateNewLink}>
                            {isLoading ? (
                                <div className="flex items-center space-x-2">
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                    <span>Generating invite...</span>
                                </div>
                            ) : (
                                <div className="flex items-center space-x-2">
                                    <Link className="w-4 h-4" />
                                    <span>Generate Invite Link</span>
                                </div>
                            )}
                        </Button>

                        {inviteLink && (
                            <div className="w-full p-4 border rounded-lg bg-muted">
                                <div className="flex items-center justify-between">
                                    <code className="relative rounded bg-background px-[0.3rem] py-[0.2rem] font-mono text-sm">{inviteLink}</code>
                                    <Button variant="outline" size="sm" onClick={copyToClipboard} className="ml-2">
                                        {isCopied ? <CheckCircle className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                                    </Button>
                                </div>
                            </div>
                        )}
                    </CardFooter>
                </Card>
            </div>
        </div>
    );
};

export default JoinRoom;
