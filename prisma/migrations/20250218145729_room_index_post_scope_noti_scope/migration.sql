-- AlterTable
ALTER TABLE "Notification" ALTER COLUMN "scope" SET DEFAULT 'GLOBAL';

-- AlterTable
ALTER TABLE "Post" ALTER COLUMN "scope" SET DEFAULT 'GLOBAL';

-- CreateIndex
CREATE INDEX "Room_roomSlug_idx" ON "Room"("roomSlug");
