"use client";

import { useRef, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { ImageIcon, Loader2Icon, SendIcon } from "lucide-react";
import { Avatar, AvatarImage } from "./ui/avatar";
import { Button } from "./ui/button";
import { Card, CardContent } from "./ui/card";
import { Textarea } from "./ui/textarea";
import { createPost } from "@/actions/post.action";
import { useToast } from "@/hooks/use-toast";
import MediaUpload, { type MediaItem } from "./MediaUpload";

const MAX_CAPTION_LENGTH = 300;

type CreatePostProps = {
  roomId?: string;
};

type MentionSuggestion = {
  id: string;
  userName: string;
  name: string | null;
  image: string | null;
};

/** Get pixel coordinates of caret position in a textarea */
function getCaretCoordinates(textarea: HTMLTextAreaElement, position: number): { top: number; left: number } {
  const div = document.createElement("div");
  const style = window.getComputedStyle(textarea);
  const props = [
    "fontFamily", "fontSize", "fontWeight", "lineHeight", "letterSpacing",
    "wordSpacing", "textIndent", "whiteSpace", "overflowWrap",
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

function CreatePost({ roomId }: CreatePostProps) {
  const { user } = useUser();
  const { toast } = useToast();
  const [content, setContent] = useState("");
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
  const [showMediaUpload, setShowMediaUpload] = useState(false);
  const [isPosting, setIsPosting] = useState(false);

  // @mention autocomplete state
  const [mentionSuggestions, setMentionSuggestions] = useState<MentionSuggestion[]>([]);
  const [mentionedUserIds, setMentionedUserIds] = useState<string[]>([]);
  const [mentionPos, setMentionPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const mentionDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleContentChange = (value: string) => {
    if (value.length > MAX_CAPTION_LENGTH) return;
    setContent(value);

    const cursorPos = textareaRef.current?.selectionStart ?? value.length;
    const match = value.slice(0, cursorPos).match(/@(\w*)$/);
    if (match) {
      const query = match[1] ?? "";
      if (mentionDebounceRef.current) clearTimeout(mentionDebounceRef.current);

      // Compute caret position for dropdown
      if (textareaRef.current) {
        const atIndex = cursorPos - (match[0]?.length ?? 0);
        const coords = getCaretCoordinates(textareaRef.current, atIndex);
        setMentionPos({ top: coords.top + 20, left: coords.left });
      }

      mentionDebounceRef.current = setTimeout(async () => {
        if (query.length < 1) {
          setMentionSuggestions([]);
          return;
        }
        try {
          const res = await fetch(`/api/users/search?q=${encodeURIComponent(query)}`);
          if (res.ok) {
            const data = await res.json() as MentionSuggestion[];
            setMentionSuggestions(data);
          }
        } catch {
          // ignore
        }
      }, 200);
    } else {
      setMentionSuggestions([]);
    }
  };

  const insertMention = (suggestion: MentionSuggestion) => {
    const ta = textareaRef.current;
    const cursorPos = ta?.selectionStart ?? content.length;
    const before = content.slice(0, cursorPos).replace(/@\w*$/, "");
    const after = content.slice(cursorPos);
    setContent(`${before}@${suggestion.userName} ${after}`);
    setMentionedUserIds((ids) => [...new Set([...ids, suggestion.id])]);
    setMentionSuggestions([]);
    setTimeout(() => ta?.focus(), 0);
  };

  const handleSubmit = async () => {
    const hasContent = content.trim().length > 0;
    const hasMedia = mediaItems.length > 0;
    if (!hasContent && !hasMedia) return;

    setIsPosting(true);
    try {
      const result = await createPost({
        content: content.trim(),
        image: "",
        roomId,
        mediaItems: mediaItems.length > 0 ? mediaItems : undefined,
        mentionedUserIds: mentionedUserIds.length > 0 ? mentionedUserIds : undefined,
      });

      if (result.success) {
        setContent("");
        setMediaItems([]);
        setShowMediaUpload(false);
        setMentionedUserIds([]);
        toast({ description: "Post created" });
      } else {
        toast({ description: result.error, variant: "destructive" });
      }
    } catch {
      toast({ description: "Failed to create post", variant: "destructive" });
    } finally {
      setIsPosting(false);
    }
  };

  const charsLeft = MAX_CAPTION_LENGTH - content.length;

  return (
    <Card className="mb-6">
      <CardContent className="pt-6">
        <div className="space-y-4">
          <div className="flex space-x-4">
            <Avatar className="w-10 h-10">
              <AvatarImage src={user?.imageUrl || "/avatar.png"} />
            </Avatar>
            <div className="flex-1 relative">
              <Textarea
                ref={textareaRef}
                placeholder="What's on your mind? Use @username to mention someone."
                className="min-h-[100px] resize-none border-none focus-visible:ring-0 p-0 text-base"
                value={content}
                onChange={(e) => handleContentChange(e.target.value)}
                disabled={isPosting}
                maxLength={MAX_CAPTION_LENGTH}
              />
              {/* Character counter */}
              <div className={`text-xs text-right mt-1 ${charsLeft <= 30 ? (charsLeft <= 10 ? "text-red-500 font-medium" : "text-yellow-500") : "text-muted-foreground"}`}>
                {content.length}/{MAX_CAPTION_LENGTH}
              </div>
              {/* Mention dropdown */}
              {mentionSuggestions.length > 0 && (
                <div
                  className="absolute z-[9999] w-64 bg-popover border rounded-md shadow-md overflow-hidden max-h-48 overflow-y-auto"
                  style={{ top: mentionPos.top, left: mentionPos.left }}
                >
                  {mentionSuggestions.map((s) => (
                    <button
                      key={s.id}
                      className="flex items-center gap-2 w-full px-3 py-2 hover:bg-muted text-sm text-left"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        insertMention(s);
                      }}
                    >
                      <img
                        src={s.image ?? "/avatar.png"}
                        alt={s.userName}
                        className="size-6 rounded-full object-cover"
                      />
                      <div>
                        <div className="font-medium">{s.name ?? s.userName}</div>
                        <div className="text-muted-foreground text-xs">@{s.userName}</div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {showMediaUpload && (
            <div className="border rounded-lg p-4">
              <MediaUpload value={mediaItems} onChange={setMediaItems} />
            </div>
          )}

          <div className="flex items-center justify-between border-t pt-4">
            <div className="flex space-x-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-muted-foreground hover:text-primary"
                onClick={() => setShowMediaUpload((p) => !p)}
                disabled={isPosting}
              >
                <ImageIcon className="size-4 mr-2" />
                Media
              </Button>
            </div>
            <Button
              onClick={handleSubmit}
              disabled={(!content.trim() && mediaItems.length === 0) || isPosting || content.length > MAX_CAPTION_LENGTH}
            >
              {isPosting ? (
                <>
                  <Loader2Icon className="size-4 mr-2 animate-spin" />
                  Posting...
                </>
              ) : (
                <>
                  <SendIcon className="size-4 mr-2" />
                  Post
                </>
              )}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default CreatePost;
