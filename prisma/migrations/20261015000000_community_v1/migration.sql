-- CreateEnum
CREATE TYPE "CommunityKind" AS ENUM ('SHOUTOUT', 'COLLAB', 'SHOWING', 'ASK', 'KINDNESS', 'UPDATE');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('FOLLOW', 'LIKE', 'COMMENT', 'REPLY', 'SUPPORT', 'MENTION');

-- CreateEnum
CREATE TYPE "ReportTargetType" AS ENUM ('POST', 'COMMENT', 'COMMUNITY_POST', 'USER');

-- CreateEnum
CREATE TYPE "ReportStatus" AS ENUM ('OPEN', 'ACTIONED', 'DISMISSED');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "bio" TEXT,
ADD COLUMN     "chapterId" TEXT,
ADD COLUMN     "handle" TEXT,
ADD COLUMN     "headline" TEXT,
ADD COLUMN     "location" TEXT,
ADD COLUMN     "suspendedAt" TIMESTAMP(3),
ADD COLUMN     "termsAcceptedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Comment" ADD COLUMN     "hiddenAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "Topic" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "kind" TEXT NOT NULL DEFAULT 'genre',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Topic_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserTopic" (
    "userId" TEXT NOT NULL,
    "topicId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserTopic_pkey" PRIMARY KEY ("userId","topicId")
);

-- CreateTable
CREATE TABLE "Follow" (
    "followerId" TEXT NOT NULL,
    "followingId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Follow_pkey" PRIMARY KEY ("followerId","followingId")
);

-- CreateTable
CREATE TABLE "Block" (
    "blockerId" TEXT NOT NULL,
    "blockedId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Block_pkey" PRIMARY KEY ("blockerId","blockedId")
);

-- CreateTable
CREATE TABLE "CommunityPost" (
    "id" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "kind" "CommunityKind" NOT NULL,
    "body" TEXT NOT NULL,
    "imageUrl" TEXT,
    "topicId" TEXT,
    "parentId" TEXT,
    "hiddenAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CommunityPost_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommunityReaction" (
    "userId" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CommunityReaction_pkey" PRIMARY KEY ("userId","postId")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "actorId" TEXT,
    "targetKind" TEXT NOT NULL,
    "targetRef" TEXT,
    "preview" TEXT,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Report" (
    "id" TEXT NOT NULL,
    "reporterId" TEXT NOT NULL,
    "targetType" "ReportTargetType" NOT NULL,
    "targetId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "note" TEXT,
    "status" "ReportStatus" NOT NULL DEFAULT 'OPEN',
    "resolvedById" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Report_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Topic_slug_key" ON "Topic"("slug");

-- CreateIndex
CREATE INDEX "UserTopic_topicId_idx" ON "UserTopic"("topicId");

-- CreateIndex
CREATE INDEX "Follow_followingId_createdAt_idx" ON "Follow"("followingId", "createdAt");

-- CreateIndex
CREATE INDEX "Block_blockedId_idx" ON "Block"("blockedId");

-- CreateIndex
CREATE INDEX "CommunityPost_parentId_createdAt_idx" ON "CommunityPost"("parentId", "createdAt");

-- CreateIndex
CREATE INDEX "CommunityPost_authorId_createdAt_idx" ON "CommunityPost"("authorId", "createdAt");

-- CreateIndex
CREATE INDEX "CommunityPost_topicId_createdAt_idx" ON "CommunityPost"("topicId", "createdAt");

-- CreateIndex
CREATE INDEX "CommunityPost_createdAt_idx" ON "CommunityPost"("createdAt");

-- CreateIndex
CREATE INDEX "CommunityReaction_postId_idx" ON "CommunityReaction"("postId");

-- CreateIndex
CREATE INDEX "Notification_userId_readAt_createdAt_idx" ON "Notification"("userId", "readAt", "createdAt");

-- CreateIndex
CREATE INDEX "Report_status_createdAt_idx" ON "Report"("status", "createdAt");

-- CreateIndex
CREATE INDEX "Report_targetType_targetId_idx" ON "Report"("targetType", "targetId");

-- CreateIndex
CREATE UNIQUE INDEX "Report_reporterId_targetType_targetId_key" ON "Report"("reporterId", "targetType", "targetId");

-- CreateIndex
CREATE UNIQUE INDEX "User_handle_key" ON "User"("handle");

-- AddForeignKey
ALTER TABLE "UserTopic" ADD CONSTRAINT "UserTopic_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserTopic" ADD CONSTRAINT "UserTopic_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "Topic"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Follow" ADD CONSTRAINT "Follow_followerId_fkey" FOREIGN KEY ("followerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Follow" ADD CONSTRAINT "Follow_followingId_fkey" FOREIGN KEY ("followingId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Block" ADD CONSTRAINT "Block_blockerId_fkey" FOREIGN KEY ("blockerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Block" ADD CONSTRAINT "Block_blockedId_fkey" FOREIGN KEY ("blockedId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunityPost" ADD CONSTRAINT "CommunityPost_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunityPost" ADD CONSTRAINT "CommunityPost_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "Topic"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunityPost" ADD CONSTRAINT "CommunityPost_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "CommunityPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunityReaction" ADD CONSTRAINT "CommunityReaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunityReaction" ADD CONSTRAINT "CommunityReaction_postId_fkey" FOREIGN KEY ("postId") REFERENCES "CommunityPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_reporterId_fkey" FOREIGN KEY ("reporterId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- Backfill: artists keep their ArtistProfile handle as their community handle.
-- (Guarded so a case-insensitive duplicate can never violate User_handle_key.)
UPDATE "User" u
SET "handle" = lower(ap."handle")
FROM "ArtistProfile" ap
WHERE ap."userId" = u."id"
  AND u."handle" IS NULL
  AND ap."id" = (
    SELECT ap2."id"
    FROM "ArtistProfile" ap2
    WHERE lower(ap2."handle") = lower(ap."handle")
    ORDER BY ap2."createdAt", ap2."id"
    LIMIT 1
  );

-- Seed: curated topics (data, not code — Robbi can rename/add later).
INSERT INTO "Topic" ("id", "slug", "name", "kind", "sortOrder", "active", "createdAt") VALUES
  (gen_random_uuid()::text, 'visual-art', 'Visual Artists', 'genre', 1, true, CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'music', 'Musicians', 'genre', 2, true, CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'photo', 'Photographers', 'genre', 3, true, CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'dance', 'Dancers', 'genre', 4, true, CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'film', 'Filmmakers', 'genre', 5, true, CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'stage', 'Actors', 'genre', 6, true, CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'laugh', 'Comedians', 'genre', 7, true, CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'frame', 'Models', 'genre', 8, true, CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'collabs', 'Collabs', 'community', 9, true, CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'gigs', 'Gigs & Calls', 'community', 10, true, CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'venues', 'Venues & Spaces', 'community', 11, true, CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'kindness', 'Kindness', 'community', 12, true, CURRENT_TIMESTAMP)
ON CONFLICT ("slug") DO NOTHING;
