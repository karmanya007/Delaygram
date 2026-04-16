"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { formatDistanceToNow } from "date-fns";
import { SignInButton, useUser } from "@clerk/nextjs";
import {
  BookmarkIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  HeartIcon,
  ImageIcon,
  LogInIcon,
  MessageCircleIcon,
  PinIcon,
  SendIcon,
  SmileIcon,
} from "lucide-react";

import {
  createComment,
  deletePost,
  getPosts,
  toggleLike,
  togglePinPost,
  toggleSavePost,
} from "@/actions/post.action";
import { toast } from "@/hooks/use-toast";
import { DeleteAlertDialog } from "./DeleteAlertDialog";
import ImageUpload from "./ImageUpload";
import { Avatar, AvatarImage } from "./ui/avatar";
import { Button } from "./ui/button";
import { Card, CardContent } from "./ui/card";
import { Textarea } from "./ui/textarea";

import data from "@emoji-mart/data";

const EmojiPicker = dynamic(() => import("@emoji-mart/react"), { ssr: false });

type Posts = Awaited<ReturnType<typeof getPosts>>;
type Post = Posts[number];

/** Get pixel coordinates of caret position in a textarea */
function getCaretCoordinates(textarea: HTMLTextAreaElement, position: number): { top: number; left: number } {
  const div = document.createElement("div");
  const style = window.getComputedStyle(textarea);
  const props = [
    "fontFamily", "fontSize", "fontWeight", "lineHeight", "letterSpacing",
    "wordSpacing", "textIndent", "whiteSpace", "wordWrap", "overflowWrap",
    "paddingTop", "paddingRight", "paddingBottom", "paddingLeft",
    "borderTopWidth", "borderRightWidth", "borderBottomWidth", "borderLeftWidth",
    "boxSizing", "width",
  ] as const;
  div.style.position = "absolute";
  div.style.visibility = "hidden";
  div.style.whiteSpace = "pre-wrap";
  div.style.overflowWrap = "break-word";
  for (const p of props) div.style[p as any] = style.getPropertyValue(p.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`));
  div.style.overflow = "hidden";
  div.style.height = "auto";

  const text = textarea.value.substring(0, position);
  div.textContent = text;
  const span = document.createElement("span");
  span.textContent = textarea.value.substring(position) || ".";
  div.appendChild(span);
  document.body.appendChild(div);

  const top = span.offsetTop - textarea.scrollTop;
  const left = span.offsetLeft;
  document.body.removeChild(div);
  return { top, left };
}

/** Render text with @username as profile links */
function RichText({ content }: { content: string }) {
  const parts = content.split(/(@\w+)/g);
  return (
    <>
      {parts.map((part, i) => {
        if (/^@\w+$/.test(part)) {
          const username = part.slice(1);
          return (
            <Link key={i} href={`/profile/${username}`} className="text-primary hover:underline font-medium">
              {part}
            </Link>
          );
        }
        return <span key={i}>{part}</span>;
      })}
    </>
  );
}

/** Simple media carousel for PostMedia items */
function MediaCarousel({ media }: { media: Post["media"] }) {
  const [index, setIndex] = useState(0);
  if (!media || media.length === 0) return null;

  const current = media[index];
  if (!current) return null;

  return (
    <div className="relative overflow-hidden rounded-lg bg-black">
      {current.type === "VIDEO" ? (
        <video
          src={current.url}
          controls
          playsInline
          preload="metadata"
          className="w-full max-h-[500px] object-contain"
        />
      ) : (
        <img
          src={current.url}
          alt={`Media ${index + 1}`}
          className="h-auto w-full max-h-[500px] object-cover"
        />
      )}

      {media.length > 1 && (
        <>
          <button
            onClick={() => setIndex((i) => Math.max(0, i - 1))}
            disabled={index === 0}
            className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-black/50 p-1 text-white disabled:opacity-30"
          >
            <ChevronLeftIcon className="size-5" />
          </button>
          <button
            onClick={() => setIndex((i) => Math.min(media.length - 1, i + 1))}
            disabled={index === media.length - 1}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-black/50 p-1 text-white disabled:opacity-30"
          >
            <ChevronRightIcon className="size-5" />
          </button>
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
            {media.map((_, i) => (
              <button
                key={i}
                onClick={() => setIndex(i)}
                className={`size-2 rounded-full ${i === index ? "bg-white" : "bg-white/50"}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function PostCard({ post, dbUserId, canPinPost = false }: { post: Post; dbUserId: string | null; canPinPost?: boolean }) {
  const { user } = useUser();
  const [newComment, setNewComment] = useState("");
  const [commentImageUrl, setCommentImageUrl] = useState("");
  const [showCommentImageUpload, setShowCommentImageUpload] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isCommenting, setIsCommenting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isLiking, setIsLiking] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isPinning, setIsPinning] = useState(false);
  const [hasLiked, setHasLiked] = useState(post.likes.some((like) => like.userId === dbUserId));
  const [hasSaved, setHasSaved] = useState(post.savedBy?.some((s) => s.userId === dbUserId) ?? false);
  const [isPinned, setIsPinned] = useState(post.isPinned ?? false);
  const [likes, setLikes] = useState(post._count.likes);
  const likeRequestRef = useRef(0);
  const [showComments, setShowComments] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // @mention autocomplete for comments
  const [commentMentionSuggestions, setCommentMentionSuggestions] = useState<Array<{ id: string; userName: string; name: string | null; image: string | null }>>([]);
  const [commentMentionedUserIds, setCommentMentionedUserIds] = useState<string[]>([]);
  const [mentionPos, setMentionPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const mentionDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => { if (mentionDebounceRef.current) clearTimeout(mentionDebounceRef.current); };
  }, []);

  const handleCommentChange = (value: string) => {
    setNewComment(value);
    const cursorPos = textareaRef.current?.selectionStart ?? value.length;
    const match = value.slice(0, cursorPos).match(/@(\w*)$/);
    if (match) {
      const query = match[1] ?? "";
      if (mentionDebounceRef.current) clearTimeout(mentionDebounceRef.current);
      if (query.length < 1) { setCommentMentionSuggestions([]); return; }
      // Compute caret position for dropdown placement
      if (textareaRef.current) {
        const atIndex = cursorPos - (match[0]?.length ?? 0);
        const coords = getCaretCoordinates(textareaRef.current, atIndex);
        setMentionPos({ top: coords.top + 20, left: coords.left });
      }
      mentionDebounceRef.current = setTimeout(async () => {
        try {
          const res = await fetch(`/api/users/search?q=${encodeURIComponent(query)}`);
          if (res.ok) setCommentMentionSuggestions(await res.json());
        } catch { /* ignore */ }
      }, 200);
    } else {
      setCommentMentionSuggestions([]);
    }
  };

  const insertCommentMention = (s: { id: string; userName: string }) => {
    const ta = textareaRef.current;
    const cursorPos = ta?.selectionStart ?? newComment.length;
    const before = newComment.slice(0, cursorPos).replace(/@\w*$/, "");
    const after = newComment.slice(cursorPos);
    setNewComment(`${before}@${s.userName} ${after}`);
    setCommentMentionedUserIds((ids) => [...new Set([...ids, s.id])]);
    setCommentMentionSuggestions([]);
    setTimeout(() => ta?.focus(), 0);
  };

  const isOwnPost = dbUserId === post.author.id;

  const handleLike = async () => {
    if (isLiking) return;

    const requestId = ++likeRequestRef.current;
    const prevHasLiked = hasLiked;
    const prevLikes = likes;

    setIsLiking(true);
    setHasLiked(!prevHasLiked);
    setLikes(prevHasLiked ? prevLikes - 1 : prevLikes + 1);

    try {
      const result = await toggleLike({ postId: post.id, roomId: post.roomId });

      if (requestId === likeRequestRef.current) {
        if (!result.success) {
          setHasLiked(prevHasLiked);
          setLikes(prevLikes);
          toast({ description: result.error, variant: "destructive" });
        }
        setIsLiking(false);
      }
    } catch {
      if (requestId === likeRequestRef.current) {
        setHasLiked(prevHasLiked);
        setLikes(prevLikes);
        setIsLiking(false);
      }
    }
  };

  const handleSave = async () => {
    if (isSaving) return;
    setIsSaving(true);
    const prev = hasSaved;
    setHasSaved(!prev);
    try {
      const result = await toggleSavePost({ postId: post.id });
      if (!result.success) {
        setHasSaved(prev);
        toast({ description: result.error, variant: "destructive" });
      }
    } catch {
      setHasSaved(prev);
    } finally {
      setIsSaving(false);
    }
  };

  const handlePin = async () => {
    if (isPinning) return;
    setIsPinning(true);
    try {
      const result = await togglePinPost({ postId: post.id });
      if (result.success) {
        setIsPinned(result.data.pinned);
        toast({ description: result.data.pinned ? "Post pinned" : "Post unpinned" });
      } else {
        toast({ description: result.error, variant: "destructive" });
      }
    } catch {
      toast({ description: "Failed to pin post", variant: "destructive" });
    } finally {
      setIsPinning(false);
    }
  };

  const handleAddComment = async () => {
    if (isCommenting || !newComment.trim()) return;

    try {
      setIsCommenting(true);
      const result = await createComment({
        postId: post.id,
        content: newComment,
        roomId: post.roomId,
        image: commentImageUrl || undefined,
        mentionedUserIds: commentMentionedUserIds.length > 0 ? commentMentionedUserIds : undefined,
      });

      if (result.success) {
        toast({ description: "Comment added" });
        setNewComment("");
        setCommentImageUrl("");
        setShowCommentImageUpload(false);
        setShowEmojiPicker(false);
        setCommentMentionedUserIds([]);
      } else {
        toast({ description: result.error, variant: "destructive" });
      }
    } catch {
      toast({ description: "Failed to add comment", variant: "destructive" });
    } finally {
      setIsCommenting(false);
    }
  };

  const handleDeletePost = async () => {
    if (isDeleting) return;

    try {
      setIsDeleting(true);
      const result = await deletePost({ postId: post.id });

      if (result.success) {
        toast({ description: "Post deleted" });
      } else {
        toast({ description: result.error, variant: "destructive" });
      }
    } catch {
      toast({ description: "Failed to delete post", variant: "destructive" });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleEmojiSelect = (emoji: { native: string }) => {
    const ta = textareaRef.current;
    if (ta) {
      const start = ta.selectionStart ?? newComment.length;
      const end = ta.selectionEnd ?? newComment.length;
      setNewComment(newComment.slice(0, start) + emoji.native + newComment.slice(end));
    } else {
      setNewComment((c) => c + emoji.native);
    }
    setShowEmojiPicker(false);
  };

  // Determine what media to show: PostMedia takes priority over legacy image field
  const hasPostMedia = post.media && post.media.length > 0;

  return (
    <Card className="max-w-2xl min-w-[300px] mx-auto">
      <CardContent className="p-4 sm:p-6">
        <div className="space-y-4">
          {/* Header */}
          <div className="flex space-x-3 sm:space-x-4">
            <Link href={`/profile/${post.author.userName}`}>
              <Avatar className="size-8 sm:h-10 sm:w-10">
                <AvatarImage src={post.author.image ?? "/avatar.png"} />
              </Avatar>
            </Link>

            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between">
                <div className="truncate sm:flex sm:items-center sm:space-x-2">
                  <Link href={`/profile/${post.author.userName}`} className="truncate font-semibold">
                    {post.author.name}
                  </Link>
                  <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                    <Link href={`/profile/${post.author.userName}`}>@{post.author.userName}</Link>
                    <span>|</span>
                    <span>{formatDistanceToNow(new Date(post.createdAt))} ago</span>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  {canPinPost ? (
                    <>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-muted-foreground"
                        onClick={handlePin}
                        disabled={isPinning}
                        title={isPinned ? "Unpin post" : "Pin post"}
                      >
                        <PinIcon className={`size-4 ${isPinned ? "fill-current" : ""}`} />
                      </Button>
                    </>
                  ) : null}
                  {isOwnPost ? <DeleteAlertDialog isDeleting={isDeleting} onDelete={handleDeletePost} /> : null}
                </div>
              </div>

              {post.content && (
                <p className="mt-2 break-words text-sm text-foreground">
                  <RichText content={post.content} />
                </p>
              )}
            </div>
          </div>

          {/* Media */}
          {hasPostMedia ? (
            <MediaCarousel media={post.media} />
          ) : post.image ? (
            <div className="overflow-hidden rounded-lg">
              <img src={post.image} alt="Post content" className="h-auto w-full object-cover" />
            </div>
          ) : null}

          {/* Actions */}
          <div className="flex items-center justify-between pt-2">
            <div className="flex items-center space-x-2">
              {user ? (
                <Button
                  variant="ghost"
                  size="sm"
                  className={`gap-2 text-muted-foreground ${hasLiked ? "text-red-500 hover:text-red-600" : "hover:text-red-500"}`}
                  onClick={handleLike}
                >
                  {hasLiked ? <HeartIcon className="size-5 fill-current" /> : <HeartIcon className="size-5" />}
                  <span>{likes}</span>
                </Button>
              ) : (
                <SignInButton mode="modal">
                  <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground">
                    <HeartIcon className="size-5" />
                    <span>{likes}</span>
                  </Button>
                </SignInButton>
              )}

              <Button
                variant="ghost"
                size="sm"
                className="gap-2 text-muted-foreground hover:text-blue-500"
                onClick={() => setShowComments((p) => !p)}
              >
                <MessageCircleIcon className={`size-5 ${showComments ? "fill-blue-500 text-blue-500" : ""}`} />
                <span>{post.comments.length}</span>
              </Button>
            </div>

            {user ? (
              <Button
                variant="ghost"
                size="sm"
                className={`text-muted-foreground ${hasSaved ? "text-yellow-500 hover:text-yellow-600" : "hover:text-yellow-500"}`}
                onClick={handleSave}
                disabled={isSaving}
                title={hasSaved ? "Unsave post" : "Save post"}
              >
                <BookmarkIcon className={`size-5 ${hasSaved ? "fill-current" : ""}`} />
              </Button>
            ) : null}
          </div>

          {/* Comments section */}
          {showComments && (
            <div className="space-y-4 border-t pt-4">
              <div className="space-y-4">
                {post.comments.map((comment) => (
                  <div key={comment.id} className="flex space-x-3">
                    <Avatar className="size-8 flex-shrink-0">
                      <AvatarImage src={comment.author.image ?? "/avatar.png"} />
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        <span className="text-sm font-medium">{comment.author.name}</span>
                        <span className="text-sm text-muted-foreground">@{comment.author.userName}</span>
                        <span className="text-sm text-muted-foreground">|</span>
                        <span className="text-sm text-muted-foreground">
                          {formatDistanceToNow(new Date(comment.createdAt))} ago
                        </span>
                      </div>
                      <p className="break-words text-sm">
                        <RichText content={comment.content} />
                      </p>
                      {comment.image && (
                        <img
                          src={comment.image}
                          alt="Comment media"
                          className="mt-2 rounded-md max-h-48 object-cover"
                        />
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {user ? (
                <div className="flex space-x-3">
                  <Avatar className="size-8 flex-shrink-0">
                    <AvatarImage src={user.imageUrl || "/avatar.png"} />
                  </Avatar>
                  <div className="flex-1 space-y-2">
                    <div className="relative">
                      <Textarea
                        ref={textareaRef}
                        placeholder="Write a comment... Use @username to mention"
                        value={newComment}
                        onChange={(e) => handleCommentChange(e.target.value)}
                        className="min-h-[80px] resize-none"
                      />
                      {commentMentionSuggestions.length > 0 && (
                        <div
                          className="absolute z-[9999] w-64 bg-popover border rounded-md shadow-md overflow-hidden max-h-48 overflow-y-auto"
                          style={{ top: mentionPos.top, left: mentionPos.left }}
                        >
                          {commentMentionSuggestions.map((s) => (
                            <button
                              key={s.id}
                              className="flex items-center gap-2 w-full px-3 py-2 hover:bg-muted text-sm text-left"
                              onMouseDown={(e) => { e.preventDefault(); insertCommentMention(s); }}
                            >
                              <img src={s.image ?? "/avatar.png"} alt={s.userName} className="size-6 rounded-full object-cover" />
                              <div>
                                <div className="font-medium">{s.name ?? s.userName}</div>
                                <div className="text-muted-foreground text-xs">@{s.userName}</div>
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {showCommentImageUpload && (
                      <div className="border rounded-lg p-3">
                        <ImageUpload
                          endpoint="commentImageUploader"
                          value={commentImageUrl}
                          onChange={(url) => {
                            setCommentImageUrl(url);
                            if (!url) setShowCommentImageUpload(false);
                          }}
                        />
                      </div>
                    )}

                    <div className="flex items-center justify-between">
                      <div className="flex gap-1">
                        <div className="relative">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="text-muted-foreground"
                            onClick={() => setShowEmojiPicker((p) => !p)}
                          >
                            <SmileIcon className="size-4" />
                          </Button>
                          {showEmojiPicker && (
                            <div className="absolute bottom-full mb-1 right-0 z-[9999]">
                              <EmojiPicker
                                data={data}
                                onEmojiSelect={handleEmojiSelect}
                                theme="auto"
                              />
                            </div>
                          )}
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="text-muted-foreground"
                          onClick={() => setShowCommentImageUpload((p) => !p)}
                        >
                          <ImageIcon className="size-4" />
                        </Button>
                      </div>
                      <Button
                        size="sm"
                        onClick={handleAddComment}
                        className="flex items-center gap-2"
                        disabled={!newComment.trim() || isCommenting}
                      >
                        {isCommenting ? "Posting..." : (
                          <>
                            <SendIcon className="size-4" />
                            Comment
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex justify-center rounded-lg border bg-muted/50 p-4">
                  <SignInButton mode="modal">
                    <Button variant="outline" className="gap-2">
                      <LogInIcon className="size-4" />
                      Sign in to comment
                    </Button>
                  </SignInButton>
                </div>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default PostCard;
