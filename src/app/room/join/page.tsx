"use client";

import { useMemo, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { nanoid } from "nanoid";
import { CheckCircle, Copy, Link2, Users } from "lucide-react";
import { SignInButton } from "@clerk/nextjs";

import { acceptRoomInvite, createRoomInvite } from "@/actions/room.action";
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
import { useToast } from "@/hooks/use-toast";

const formSchema = z.object({
  users: z.array(z.string()).min(1, "Please add at least one user."),
});

type Users = Awaited<ReturnType<typeof combinedSearch>>;
type User = Users[number];

const JoinRoom = () => {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { toast } = useToast();

  const roomId = searchParams.get("roomId");
  const inviteId = searchParams.get("invite");
  const isInviteAcceptanceMode = Boolean(inviteId && !roomId);

  const [users, setUsers] = useState<User[]>([]);
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [isCopied, setIsCopied] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [lastGeneratedUserIds, setLastGeneratedUserIds] = useState<Set<string>>(new Set());

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { users: [] },
  });

  const canGenerateNewLink = useMemo(() => {
    const currentUserIds = new Set(users.map((user) => user.id));
    if (!inviteLink) {
      return true;
    }

    if (currentUserIds.size !== lastGeneratedUserIds.size) {
      return true;
    }

    for (const userId of currentUserIds) {
      if (!lastGeneratedUserIds.has(userId)) {
        return true;
      }
    }

    return false;
  }, [inviteLink, lastGeneratedUserIds, users]);

  const handleSetUsers: Dispatch<SetStateAction<User[]>> = (nextUsers) => {
    setUsers((previous) => {
      const resolved = typeof nextUsers === "function" ? nextUsers(previous) : nextUsers;
      form.setValue(
        "users",
        resolved.map((entry) => entry.id),
        { shouldDirty: true },
      );
      return resolved;
    });
  };

  function onSelectUser(user: User) {
    handleSetUsers((previous) => {
      if (previous.some((entry) => entry.id === user.id)) {
        return previous;
      }

      return [...previous, user];
    });
    setOpen(false);
  }

  const WrappedUserSearch = () => <UserSearch onSelectUser={onSelectUser} />;

  async function onInvite() {
    if (!roomId) {
      return;
    }

    setIsLoading(true);
    try {
      const generatedInviteId = nanoid(10);
      const result = await createRoomInvite({ users, roomId, inviteId: generatedInviteId });

      if (!result.success) {
        toast({
          description: result.error,
          variant: "destructive",
        });
        return;
      }

      const generatedLink = `${window.location.origin}/room/join?invite=${result.data.inviteId}`;
      setInviteLink(generatedLink);
      setLastGeneratedUserIds(new Set(users.map((user) => user.id)));
      toast({
        description: "Invite link generated",
      });
    } catch (error) {
      console.error("Failed generating invite", error);
      toast({
        description: "Failed to generate invite link",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }

  async function onAcceptInvite() {
    if (!inviteId) {
      return;
    }

    setIsLoading(true);
    try {
      const result = await acceptRoomInvite({ inviteId });

      if (!result.success) {
        toast({
          description: result.error,
          variant: "destructive",
        });
        return;
      }

      toast({
        description: "You have joined the room",
      });
      router.push(`/room/${result.data.roomSlug}`);
      router.refresh();
    } catch (error) {
      console.error("Failed accepting invite", error);
      toast({
        description: "Failed to accept invite",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }

  const copyToClipboard = async () => {
    if (!inviteLink) {
      return;
    }

    await navigator.clipboard.writeText(inviteLink);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  if (isInviteAcceptanceMode) {
    return (
      <div className="p-4">
        <div className="mx-auto max-w-xl">
          <Card className="shadow-lg">
            <CardHeader className="space-y-1">
              <div className="flex items-center space-x-2">
                <Users className="h-5 w-5 text-primary" />
                <CardTitle>Room Invite</CardTitle>
              </div>
              <CardDescription>Accept this invite to join the room.</CardDescription>
            </CardHeader>
            <CardFooter className="flex flex-col items-stretch gap-3">
              <Button className="w-full" onClick={onAcceptInvite} disabled={isLoading}>
                {isLoading ? "Joining..." : "Accept Invite"}
              </Button>
              <SignInButton mode="modal">
                <Button variant="outline" className="w-full" disabled={isLoading}>
                  Sign in with invited account
                </Button>
              </SignInButton>
            </CardFooter>
          </Card>
        </div>
      </div>
    );
  }

  if (!roomId) {
    return (
      <div className="p-4">
        <div className="mx-auto max-w-xl">
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle>Invite Users</CardTitle>
              <CardDescription>Missing `roomId` or `invite` in query params.</CardDescription>
            </CardHeader>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4">
      <div className="mx-auto max-w-3xl">
        <Card className="shadow-lg">
          <CardHeader className="space-y-1">
            <div className="flex items-center space-x-2">
              <Users className="h-5 w-5 text-primary" />
              <CardTitle>Invite Users to Room</CardTitle>
            </div>
            <CardDescription>Add members and generate an invite link</CardDescription>
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
                        <AddUser
                          ContentChild={WrappedUserSearch}
                          users={users}
                          setUsers={handleSetUsers}
                          open={open}
                          setOpen={setOpen}
                        />
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
            <Button
              className="w-full"
              onClick={onInvite}
              disabled={users.length === 0 || isLoading || !canGenerateNewLink}
            >
              {isLoading ? "Generating invite..." : "Generate Invite Link"}
            </Button>

            {inviteLink ? (
              <div className="w-full rounded-lg border bg-muted p-4">
                <div className="flex items-center justify-between gap-3">
                  <code className="overflow-x-auto rounded bg-background px-[0.3rem] py-[0.2rem] font-mono text-sm">
                    {inviteLink}
                  </code>
                  <Button variant="outline" size="sm" onClick={copyToClipboard}>
                    {isCopied ? <CheckCircle className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
            ) : null}
            <div className="text-xs text-muted-foreground flex items-center gap-2">
              <Link2 className="h-3.5 w-3.5" />
              Invite links are scoped to selected users.
            </div>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
};

export default JoinRoom;
