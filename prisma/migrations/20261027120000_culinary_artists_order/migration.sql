-- Culinary Artists, listed right after Musicians (Robbie, Founder's Vision,
-- Oct 2026; matches houseGenres in src/content/stage.ts).
--
-- Data only. Every statement sets a fixed value, so running it again changes
-- nothing. Before (20261015000000_community_v1 + 20261022200000_culinary_topic):
--   visual-art 1, music 2, photo 3, dance 4, film 5, stage 6, laugh 7,
--   frame 8, culinary 9 ("Culinary"), collabs 10, gigs 11, venues 12, kindness 13
-- After:
--   visual-art 1, music 2, culinary 3 ("Culinary Artists"), photo 4, dance 5,
--   film 6, stage 7, laugh 8, frame 9, collabs 10, gigs 11, venues 12, kindness 13
-- A slug that is missing simply updates no row.

UPDATE "Topic" SET "sortOrder" = 1 WHERE "slug" = 'visual-art';
UPDATE "Topic" SET "sortOrder" = 2 WHERE "slug" = 'music';
UPDATE "Topic" SET "name" = 'Culinary Artists', "sortOrder" = 3 WHERE "slug" = 'culinary';
UPDATE "Topic" SET "sortOrder" = 4 WHERE "slug" = 'photo';
UPDATE "Topic" SET "sortOrder" = 5 WHERE "slug" = 'dance';
UPDATE "Topic" SET "sortOrder" = 6 WHERE "slug" = 'film';
UPDATE "Topic" SET "sortOrder" = 7 WHERE "slug" = 'stage';
UPDATE "Topic" SET "sortOrder" = 8 WHERE "slug" = 'laugh';
UPDATE "Topic" SET "sortOrder" = 9 WHERE "slug" = 'frame';
UPDATE "Topic" SET "sortOrder" = 10 WHERE "slug" = 'collabs';
UPDATE "Topic" SET "sortOrder" = 11 WHERE "slug" = 'gigs';
UPDATE "Topic" SET "sortOrder" = 12 WHERE "slug" = 'venues';
UPDATE "Topic" SET "sortOrder" = 13 WHERE "slug" = 'kindness';
