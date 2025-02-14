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
import { User } from "@prisma/client";

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
    const [users, setUsers] = useState<User[]>([]);
    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            topic: "",
            desription: "",
            users: [],
        },
    });

    function onSubmit(values: z.infer<typeof formSchema>) {
        createRoom(values.topic, values.desription);
    }
    function onSelectUser(user: User) {
        console.log(user);
        setUsers((users) => [...users, user]);
        if (users.length > 0) {
            form.setValue("users", [users[0], ...users.slice(1)]);
        }
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
                                                <AddUser Child={WrappedUserSearch} users={users} setUsers={setUsers} />
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
                        <Button className="w-full" type="submit" onClick={form.handleSubmit(onSubmit)}>
                            Create Room
                            <SquarePlusIcon className="size-4 mr-2" />
                        </Button>
                    </CardFooter>
                </Card>
            </div>
        </div>
    );
}
