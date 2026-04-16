import { createUploadthing, type FileRouter } from "uploadthing/next";
import { auth } from "@clerk/nextjs/server";

const f = createUploadthing();

// FileRouter for your app, can contain multiple FileRoutes
export const ourFileRouter = {
    // Multi-image uploader for posts (up to 10 images)
    imageUploader: f({
        image: {
            maxFileSize: "8MB",
            maxFileCount: 10,
        },
    })
        .middleware(async ({ req }) => {
            const { userId } = await auth();
            if (!userId) throw new Error("Unauthorized");
            return { userId };
        })
        .onUploadComplete(async ({ metadata, file }) => {
            try {
                return { fileUrl: file.url, uploadedBy: metadata.userId };
            } catch (error) {
                console.error("Error in onUploadComplete:", error);
                throw error;
            }
        }),

    // Video uploader for posts
    videoUploader: f({
        video: {
            maxFileSize: "256MB",
            maxFileCount: 5,
        },
    })
        .middleware(async ({ req }) => {
            const { userId } = await auth();
            if (!userId) throw new Error("Unauthorized");
            return { userId };
        })
        .onUploadComplete(async ({ metadata, file }) => {
            try {
                return { fileUrl: file.url, uploadedBy: metadata.userId };
            } catch (error) {
                console.error("Error in onUploadComplete:", error);
                throw error;
            }
        }),

    // Profile background image uploader
    profileBgUploader: f({
        image: {
            maxFileSize: "8MB",
            maxFileCount: 1,
        },
    })
        .middleware(async ({ req }) => {
            const { userId } = await auth();
            if (!userId) throw new Error("Unauthorized");
            return { userId };
        })
        .onUploadComplete(async ({ metadata, file }) => {
            try {
                return { fileUrl: file.url, uploadedBy: metadata.userId };
            } catch (error) {
                console.error("Error in onUploadComplete:", error);
                throw error;
            }
        }),

    // Comment image uploader
    commentImageUploader: f({
        image: {
            maxFileSize: "4MB",
            maxFileCount: 1,
        },
    })
        .middleware(async ({ req }) => {
            const { userId } = await auth();
            if (!userId) throw new Error("Unauthorized");
            return { userId };
        })
        .onUploadComplete(async ({ metadata, file }) => {
            try {
                return { fileUrl: file.url, uploadedBy: metadata.userId };
            } catch (error) {
                console.error("Error in onUploadComplete:", error);
                throw error;
            }
        }),
} satisfies FileRouter;

export type OurFileRouter = typeof ourFileRouter;
