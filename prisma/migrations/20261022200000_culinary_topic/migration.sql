-- Culinary Arts as a primary genre topic (Robbie, Founder's Vision, Oct 2026).
-- Production already has this row (added by hand 2026-10-15, audited:
-- slug culinary, kind genre, sortOrder 9, community topics shifted to 10-13).
-- This migration makes every fresh database match production. Safe to re-run:
-- the insert skips an existing slug and the updates set fixed values.

INSERT INTO "Topic" ("id", "slug", "name", "kind", "sortOrder", "active", "createdAt")
VALUES (gen_random_uuid()::text, 'culinary', 'Culinary', 'genre', 9, true, CURRENT_TIMESTAMP)
ON CONFLICT ("slug") DO NOTHING;

UPDATE "Topic" SET "sortOrder" = 10 WHERE "slug" = 'collabs';
UPDATE "Topic" SET "sortOrder" = 11 WHERE "slug" = 'gigs';
UPDATE "Topic" SET "sortOrder" = 12 WHERE "slug" = 'venues';
UPDATE "Topic" SET "sortOrder" = 13 WHERE "slug" = 'kindness';
