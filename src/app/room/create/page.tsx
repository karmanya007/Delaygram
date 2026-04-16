"use client";

import { useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import { useRouter } from "next/navigation";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, SquarePlusIcon } from "lucide-react";

import { createRoom } from "@/actions/room.action";
import { combinedSearch } from "@/actions/user.action";
import AddUser from "@/components/AddUser";
import { UserSearch } from "@/components/UserSearch";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ToastAction } from "@/components/ui/toast";
import { useToast } from "@/hooks/use-toast";

type Users = Awaited<ReturnType<typeof combinedSearch>>;
type User = Users[number];

const formSchema = z.object({
  topic: z.string().min(5, {
    message: "Topic must be at least 5 characters.",
  }),
  description: z.string().max(150, {
    message: "Description should be less than 150 characters",
  }),
  users: z.array(z.custom<User>()),
});

export default function RoomCreatePage() {
  const router = useRouter();
  const { toast } = useToast();
  const [users, setUsers] = useState<User[]>([]);
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      topic: "",
      description: "",
      users: [],
    },
  });

  const handleSetUsers: Dispatch<SetStateAction<User[]>> = (nextUsers) => {
    setUsers((previous) => {
      const resolved = typeof nextUsers === "function" ? nextUsers(previous) : nextUsers;
      form.setValue("users", resolved, { shouldDirty: true });
      return resolved;
    });
  };

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true);
    try {
      const result = await createRoom({
        name: values.topic,
        description: values.description,
        users: values.users.map((user) => ({ id: user.id })),
      });

      if (result.success) {
        toast({
          title: "Success!",
          description: `Room "${result.data.name}" created successfully. Redirecting...`,
          variant: "default",
        });
        router.refresh();
        setTimeout(() => {
          router.push(`/room/${result.data.roomSlug}`);
        }, 1200);
        return;
      }

      toast({
        title: "Error",
        description: result.error,
        variant: "destructive",
        action: (
          <ToastAction altText="Try again" onClick={() => form.handleSubmit(onSubmit)()}>
            Try again
          </ToastAction>
        ),
      });
    } catch (error) {
      console.error("Error creating room:", error);
      toast({
        title: "Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }

  function onSelectUser(user: User) {
    handleSetUsers((prevUsers) => {
      if (prevUsers.some((entry) => entry.id === user.id)) {
        return prevUsers;
      }

      const nextUsers = [...prevUsers, user];
      return nextUsers;
    });
    setOpen(false);
  }

  const WrappedUserSearch = () => <UserSearch onSelectUser={onSelectUser} />;

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-10">
      <div className="lg:col-span-6 lg:col-start-3">
        <Card>
          <CardHeader>
            <CardTitle>Create Room</CardTitle>
            <CardDescription>Invite users now or later from the room invite page.</CardDescription>
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
                      <FormDescription>This is the public topic of your room.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea placeholder="This room is all about cool stuff..." {...field} />
                      </FormControl>
                      <FormDescription>Describe the theme of your room.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="users"
                  render={() => (
                    <FormItem>
                      <FormLabel>Add Users (Optional)</FormLabel>
                      <FormControl>
                        <AddUser
                          ContentChild={WrappedUserSearch}
                          users={users}
                          setUsers={handleSetUsers}
                          open={open}
                          setOpen={setOpen}
                        />
                      </FormControl>
                      <FormDescription>
                        Selected users will receive an invite link for this room.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </form>
            </Form>
          </CardContent>
          <CardFooter>
            <Button
              className="w-full"
              type="submit"
              onClick={form.handleSubmit(onSubmit)}
              disabled={isLoading}
            >
              {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <SquarePlusIcon className="mr-2 size-4" />}
              {isLoading ? "Creating Room..." : "Create Room"}
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
