-- Sponsors + culinary nights (Phase 2 contract, 2026-10-27).
--
-- Additive only: three nullable sponsor columns and a vendors list that
-- defaults to an empty array, so every existing night reads as "no sponsor,
-- no vendors". IF NOT EXISTS makes a second run a no-op.
--
-- Founder's Vision: artists and vendors never pay. There is deliberately no
-- money column here.
--
-- Deploy order: the production deploy (pull, install, build, restart) does
-- NOT run migrations. Apply this file on production first, then merge.

ALTER TABLE "Event" ADD COLUMN IF NOT EXISTS "sponsorName" TEXT,
ADD COLUMN IF NOT EXISTS "sponsorUrl" TEXT,
ADD COLUMN IF NOT EXISTS "sponsorLogoUrl" TEXT,
ADD COLUMN IF NOT EXISTS "vendors" JSONB NOT NULL DEFAULT '[]';
