"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { XIcon, PlayIcon, UploadCloudIcon, Loader2Icon } from "lucide-react";
import { useUploadThing } from "@/lib/uploadthing";
import { toast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";

export type MediaItem = {
  url: string;
  type: "IMAGE" | "VIDEO";
  order: number;
};

interface MediaUploadProps {
  value: MediaItem[];
  onChange: (items: MediaItem[]) => void;
}

type PendingFile = {
  preview: string;
  type: "IMAGE" | "VIDEO";
};

function MediaUpload({ value, onChange }: MediaUploadProps) {
  const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selectedPreview, setSelectedPreview] = useState<MediaItem | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const latestValueRef = useRef(value);

  useEffect(() => {
    latestValueRef.current = value;
  }, [value]);

  useEffect(() => {
    return () => {
      for (const pendingFile of pendingFiles) {
        URL.revokeObjectURL(pendingFile.preview);
      }
    };
  }, [pendingFiles]);

  const updateItems = useCallback((items: MediaItem[]) => {
    latestValueRef.current = items;
    onChange(items);
  }, [onChange]);

  const clearPendingFiles = useCallback((type: PendingFile["type"]) => {
    setPendingFiles((current) => {
      const remaining = current.filter((file) => file.type !== type);
      for (const file of current) {
        if (file.type === type) {
          URL.revokeObjectURL(file.preview);
        }
      }
      return remaining;
    });
  }, []);

  const { startUpload, isUploading } = useUploadThing("imageUploader", {
    onUploadProgress: (p) => setUploadProgress(p),
    onClientUploadComplete: (res) => {
      const newItems: MediaItem[] = res.map((file, i) => ({
        url: file.url,
        type: "IMAGE" as const,
        order: latestValueRef.current.length + i,
      }));
      updateItems([...latestValueRef.current, ...newItems]);
      clearPendingFiles("IMAGE");
      setUploadProgress(0);
      toast({ description: `${res.length} file${res.length > 1 ? "s" : ""} uploaded` });
    },
    onUploadError: () => {
      clearPendingFiles("IMAGE");
      setUploadProgress(0);
      toast({ description: "Upload failed", variant: "destructive" });
    },
  });

  const { startUpload: startVideoUpload, isUploading: isVideoUploading } = useUploadThing("videoUploader", {
    onUploadProgress: (p) => setUploadProgress(p),
    onClientUploadComplete: (res) => {
      const newItems: MediaItem[] = res.map((file, i) => ({
        url: file.url,
        type: "VIDEO" as const,
        order: latestValueRef.current.length + i,
      }));
      updateItems([...latestValueRef.current, ...newItems]);
      clearPendingFiles("VIDEO");
      setUploadProgress(0);
      toast({ description: "Video uploaded" });
    },
    onUploadError: () => {
      clearPendingFiles("VIDEO");
      setUploadProgress(0);
      toast({ description: "Video upload failed", variant: "destructive" });
    },
  });

  const processFiles = useCallback((files: File[]) => {
    const images = files.filter((f) => f.type.startsWith("image/"));
    const videos = files.filter((f) => f.type.startsWith("video/"));

    const previews: PendingFile[] = [
      ...images.map((file) => ({
        preview: URL.createObjectURL(file),
        type: "IMAGE" as const,
      })),
      ...videos.map((file) => ({
        preview: URL.createObjectURL(file),
        type: "VIDEO" as const,
      })),
    ];

    setPendingFiles(previews);

    if (images.length > 0) startUpload(images);
    if (videos.length > 0) startVideoUpload(videos);
  }, [startUpload, startVideoUpload]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files).filter(
      (f) => f.type.startsWith("image/") || f.type.startsWith("video/")
    );
    if (files.length > 0) processFiles(files);
  }, [processFiles]);

  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    const files = Array.from(e.clipboardData.files).filter(
      (f) => f.type.startsWith("image/") || f.type.startsWith("video/")
    );
    if (files.length > 0) {
      e.preventDefault();
      processFiles(files);
    }
  }, [processFiles]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length > 0) processFiles(files);
    e.target.value = "";
  }, [processFiles]);

  const removeItem = (index: number) => {
    updateItems(value.filter((_, i) => i !== index).map((item, i) => ({ ...item, order: i })));
  };

  const uploading = isUploading || isVideoUploading;

  return (
    <div className="space-y-3" onPaste={handlePaste}>
      <Dialog open={selectedPreview !== null} onOpenChange={(open) => !open && setSelectedPreview(null)}>
        <DialogContent className="max-w-3xl border-none bg-black p-2 text-white">
          <DialogTitle className="sr-only">Media preview</DialogTitle>
          {selectedPreview ? (
            selectedPreview.type === "VIDEO" ? (
              <video
                src={selectedPreview.url}
                controls
                playsInline
                preload="metadata"
                className="max-h-[80vh] w-full rounded-md bg-black"
              />
            ) : (
              <img
                src={selectedPreview.url}
                alt="Media preview"
                className="max-h-[80vh] w-full rounded-md object-contain"
              />
            )
          ) : null}
        </DialogContent>
      </Dialog>

      {/* Uploaded items grid */}
      {value.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {value.map((item, i) => (
            <div key={i} className="relative rounded-md overflow-hidden bg-muted aspect-square">
              {item.type === "VIDEO" ? (
                <button
                  type="button"
                  onClick={() => setSelectedPreview(item)}
                  className="relative h-full w-full bg-black text-left"
                >
                  <video
                    src={item.url}
                    muted
                    playsInline
                    preload="metadata"
                    className="h-full w-full object-cover"
                  />
                  <div className="pointer-events-none absolute inset-0 bg-black/20" />
                  <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                    <span className="rounded-full bg-black/60 p-2">
                      <PlayIcon className="size-6 text-white" />
                    </span>
                  </div>
                  <span className="pointer-events-none absolute bottom-1 left-1 text-[10px] text-white bg-black/60 px-1 rounded">
                    video
                  </span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setSelectedPreview(item)}
                  className="h-full w-full"
                >
                  <img src={item.url} alt={`media ${i + 1}`} className="w-full h-full object-cover" />
                </button>
              )}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  removeItem(i);
                }}
                className="absolute top-0.5 right-0.5 bg-red-500 rounded-full p-0.5 shadow"
              >
                <XIcon className="size-3 text-white" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Pending upload previews */}
      {pendingFiles.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {pendingFiles.map((pf, i) => (
            <div key={i} className="relative rounded-md overflow-hidden bg-muted aspect-square opacity-60">
              {pf.type === "VIDEO" ? (
                <div className="relative h-full w-full bg-black">
                  <video
                    src={pf.preview}
                    muted
                    playsInline
                    preload="metadata"
                    className="h-full w-full object-cover"
                  />
                  <div className="pointer-events-none absolute inset-0 bg-black/20" />
                  <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                    <span className="rounded-full bg-black/60 p-2">
                      <PlayIcon className="size-6 text-white" />
                    </span>
                  </div>
                </div>
              ) : (
                <img src={pf.preview} alt="uploading" className="w-full h-full object-cover" />
              )}
              <div className="absolute inset-0 flex items-center justify-center">
                <Loader2Icon className="size-6 text-white animate-spin" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Upload progress bar */}
      {uploading && uploadProgress > 0 && (
        <div className="w-full bg-muted rounded-full h-1.5">
          <div
            className="bg-primary h-1.5 rounded-full transition-all duration-300"
            style={{ width: `${uploadProgress}%` }}
          />
        </div>
      )}

      {/* Drop zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !uploading && fileInputRef.current?.click()}
        className={`
          flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-6 cursor-pointer transition-colors
          ${isDragging ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-muted-foreground/50"}
          ${uploading ? "pointer-events-none opacity-50" : ""}
        `}
      >
        <UploadCloudIcon className="size-8 text-muted-foreground" />
        <div className="text-sm text-muted-foreground text-center">
          <span className="font-medium">Click, drag & drop, or paste</span>
          <br />
          <span className="text-xs">Images (8MB) &middot; Videos (256MB)</span>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,video/*"
          multiple
          className="hidden"
          onChange={handleFileSelect}
        />
      </div>
    </div>
  );
}

export default MediaUpload;
