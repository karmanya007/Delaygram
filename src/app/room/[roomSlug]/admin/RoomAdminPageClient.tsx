"use client";

import { useMemo, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCircle, Copy, Link2, Loader2, Settings, Users } from "lucide-react";
import { nanoid } from "nanoid";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { createRoomInvite, updateRoomDetails } from "@/actions/room.action";
import { combinedSearch } from "@/actions/user.action";
import AddUser from "@/components/AddUser";
import { UserSearch } from "@/components/UserSearch";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
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
import { useToast } from "@/hooks/use-toast";

type UsersResult = Awaited<ReturnType<typeof combinedSearch>>;
type SearchUser = UsersResult[number];

const settingsSchema = z.object({
  name: z.string().min(1, "Room name is required.").max(50, "Room name must be 50 characters or less."),
  description: z.string().max(300, "Description must be 300 characters or less."),
});

type RoomAdminPageClientProps = {
  room: {
    id: string;
    name: string;
    description: string | null;
    roomSlug: string;
  };
  members: Array<{
    id: string;
    userName: string;
    name: string | null;
    image: string | null;
    isAdmin: boolean;
  }>;
};

export default function RoomAdminPageClient({ room, members }: RoomAdminPageClientProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);
  const [users, setUsers] = useState<SearchUser[]>([]);
  const [open, setOpen] = useState(false);
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [isCopied, setIsCopied] = useState(false);
  const [isInviting, setIsInviting] = useState(false);
  const [lastGeneratedUserIds, setLastGeneratedUserIds] = useState<Set<string>>(new Set());

  const memberIds = useMemo(() => new Set(members.map((member) => member.id)), [members]);

  const form = useForm<z.infer<typeof settingsSchema>>({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
      name: room.name,
      description: room.description ?? "",
    },
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

  const handleSetUsers: Dispatch<SetStateAction<SearchUser[]>> = (nextUsers) => {
    setUsers((previous) => (typeof nextUsers === "function" ? nextUsers(previous) : nextUsers));
  };

  function onSelectUser(user: SearchUser) {
    if (memberIds.has(user.id)) {
      toast({
        description: "That user is already a member of this room.",
        variant: "destructive",
      });
      setOpen(false);
      return;
    }

    handleSetUsers((previous) => {
      if (previous.some((entry) => entry.id === user.id)) {
        return previous;
      }

      return [...previous, user];
    });
    setOpen(false);
  }

  async function onSave(values: z.infer<typeof settingsSchema>) {
    setIsSaving(true);
    try {
      const result = await updateRoomDetails({
        roomId: room.id,
        name: values.name,
        description: values.description,
      });

      if (!result.success) {
        toast({
          description: result.error,
          variant: "destructive",
        });
        return;
      }

      toast({
        description: "Room settings updated.",
      });
      router.refresh();
    } catch (error) {
      console.error("Failed updating room settings", error);
      toast({
        description: "Failed to update room settings.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  }

  async function onInvite() {
    setIsInviting(true);
    try {
      const generatedInviteId = nanoid(10);
      const result = await createRoomInvite({
        users,
        roomId: room.id,
        inviteId: generatedInviteId,
      });

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
        description: "Invite link generated.",
      });
    } catch (error) {
      console.error("Failed generating invite", error);
      toast({
        description: "Failed to generate invite link.",
        variant: "destructive",
      });
    } finally {
      setIsInviting(false);
    }
  }

  async function copyToClipboard() {
    if (!inviteLink) {
      return;
    }

    await navigator.clipboard.writeText(inviteLink);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  }

  const WrappedUserSearch = () => <UserSearch onSelectUser={onSelectUser} />;

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-10">
      <div className="space-y-6 lg:col-span-6 lg:col-start-3">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm text-muted-foreground">Room admin</p>
            <h1 className="text-2xl font-semibold tracking-tight">{room.name}</h1>
            <p className="text-sm text-muted-foreground">
              Manage room details, review members, and create invite links.
            </p>
          </div>
          <Button variant="outline" asChild>
            <Link href={`/room/${room.roomSlug}`}>Back to Room</Link>
          </Button>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Settings className="h-5 w-5 text-primary" />
              <CardTitle>Room Settings</CardTitle>
            </div>
            <CardDescription>Update the room topic and description shown to members.</CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSave)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Room Name</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormDescription>This is the main label used in the room switcher.</FormDescription>
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
                        <Textarea {...field} placeholder="Describe what this room is for..." />
                      </FormControl>
                      <FormDescription>Keep it short so members can scan it quickly.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" disabled={isSaving}>
                  {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  {isSaving ? "Saving..." : "Save Changes"}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              <CardTitle>Members</CardTitle>
            </div>
            <CardDescription>{members.length} member{members.length === 1 ? "" : "s"} in this room.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {members.map((member) => (
              <div key={member.id} className="flex items-center justify-between rounded-lg border p-3">
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={member.image ?? undefined} />
                    <AvatarFallback>{(member.name ?? member.userName)[0]?.toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium leading-none">{member.name ?? member.userName}</p>
                    <p className="mt-1 text-sm text-muted-foreground">@{member.userName}</p>
                  </div>
                </div>
                {member.isAdmin ? <Badge>Admin</Badge> : null}
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Link2 className="h-5 w-5 text-primary" />
              <CardTitle>Invite Members</CardTitle>
            </div>
            <CardDescription>Select users and generate an invite link scoped to them.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <AddUser
              ContentChild={WrappedUserSearch}
              users={users}
              setUsers={handleSetUsers}
              open={open}
              setOpen={setOpen}
            />
            <p className="text-sm text-muted-foreground">
              Existing members cannot be added again. Invite links continue using the current `/room/join?invite=...` flow.
            </p>
          </CardContent>
          <CardFooter className="flex flex-col items-stretch gap-4">
            <Button
              className="w-full"
              onClick={onInvite}
              disabled={users.length === 0 || isInviting || !canGenerateNewLink}
            >
              {isInviting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {isInviting ? "Generating Invite..." : "Generate Invite Link"}
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
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
