/*
  Warnings:

  - A unique constraint covering the columns `[roomSlug]` on the table `Room` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "Room_roomSlug_key" ON "Room"("roomSlug");
