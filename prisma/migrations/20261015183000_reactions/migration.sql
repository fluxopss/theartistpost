-- Reactions: a small, kind-only emoji set on Community posts and Wall posts.
-- Additive only. Existing Community support rows become SUPPORT and existing
-- Wall likes become LOVE (the heart they always were) through column defaults,
-- so no row is rewritten or lost.

-- CreateEnum
CREATE TYPE "Reaction" AS ENUM ('SUPPORT', 'LOVE', 'FIRE', 'APPLAUSE', 'INSPIRED');

-- AlterTable
ALTER TABLE "CommunityReaction" ADD COLUMN "reaction" "Reaction" NOT NULL DEFAULT 'SUPPORT';

-- AlterTable
ALTER TABLE "Like" ADD COLUMN "reaction" "Reaction" NOT NULL DEFAULT 'LOVE';
