"use client";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { SquarePlusIcon } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { createRoom } from "@/actions/room.action";
import AddUser from "@/components/AddUser";
import { UserSearch } from "@/components/UserSearch";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { ToastAction } from "@/components/ui/toast"; // Added for toast action
import { Loader2 } from "lucide-react";
import { combinedSearch } from "@/actions/user.action";

type Users = Awaited<ReturnType<typeof combinedSearch>>;
type User = Users[number];
const formSchema = z.object({
    topic: z.string().min(5, {
        message: "Topic must be at least 5 characters.",
    }),
    desription: z.string().max(150, {
        message: "Description should be less than 150 characters",
    }),
    users: z.array(z.custom<User>()).min(1).nonempty("Please add atleast one user"),
});

export default function Room() {
    const router = useRouter();
    const { toast } = useToast(); // Added for toast notifications
    const [users, setUsers] = useState<User[]>([]);
    const [open, setOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false); // Added for loading state

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            topic: "",
            desription: "",
            users: [],
        },
    });

    async function onSubmit(values: z.infer<typeof formSchema>) {
        setIsLoading(true);
        try {
            const newRoom = await createRoom(values.topic, values.desription);
            if (newRoom && newRoom.roomSlug) {
                toast({
                    title: "Success!",
                    description: `Room "${newRoom.name}" created successfully. Redirecting...`,
                    variant: "default",
                });
                router.refresh(); // Re-fetch server-side data
                setTimeout(() => {
                    router.push(`/room/${newRoom.roomSlug}`);
                }, 1500); // Delay for toast visibility
            } else {
                toast({
                    title: "Error",
                    description: "Failed to create room. Please try again.",
                    variant: "destructive",
                    action: (
                        <ToastAction altText="Try again" onClick={() => form.handleSubmit(onSubmit)()}>
                            Try again
                        </ToastAction>
                    ),
                });
                setIsLoading(false);
            }
        } catch (error) {
            console.error("Error creating room:", error);
            toast({
                title: "Error",
                description: "An unexpected error occurred. Please try again.",
                variant: "destructive",
                action: (
                    <ToastAction altText="Try again" onClick={() => form.handleSubmit(onSubmit)()}>
                        Try again
                    </ToastAction>
                ),
            });
            setIsLoading(false);
        }
    }
    function onSelectUser(user: User) {
        console.log(user);
        setUsers((users) => [...users, user]);
        if (users.length > 0) {
            form.setValue("users", [users[0], ...users.slice(1)]);
        }
        setOpen(false);
    }
    const WrappedUserSearch: React.FC = () => <UserSearch onSelectUser={onSelectUser} />;
    return (
        <div className="grid grid-cols-1 lg:grid-cols-10 gap-6">
            <div className="lg:col-span-6 lg:col-start-3">
                <Card>
                    <CardHeader>
                        <CardTitle>Create Room</CardTitle>
                        <CardDescription></CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Form {...form}>
                            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                                <FormField
                                    control={form.control}
                                    name="topic"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Room Topic</FormLabel>
                                            <FormControl>
                                                <Input placeholder="Cool Stuff" {...field} />
                                            </FormControl>
                                            <FormDescription>This is public topic of your room </FormDescription>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="desription"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Description</FormLabel>
                                            <FormControl>
                                                <Textarea placeholder="This room is all about cool stuff ..." {...field} />
                                            </FormControl>
                                            <FormDescription>Describe the theme of your room </FormDescription>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="users"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Add Users</FormLabel>
                                            <FormControl>
                                                <AddUser ContentChild={WrappedUserSearch} users={users} setUsers={setUsers} open={open} setOpen={setOpen} />
                                            </FormControl>
                                            <FormDescription>Add some users to your room</FormDescription>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </form>
                        </Form>
                    </CardContent>
                    <CardFooter>
                        <Button className="w-full" type="submit" onClick={form.handleSubmit(onSubmit)} disabled={isLoading}>
                            {isLoading ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                                <SquarePlusIcon className="size-4 mr-2" />
                            )}
                            {isLoading ? "Creating Room..." : "Create Room"}
                        </Button>
                    </CardFooter>
                </Card>
            </div>
        </div>
    );
}
