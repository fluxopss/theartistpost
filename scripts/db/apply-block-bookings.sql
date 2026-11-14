-- Idempotent, additive-only equivalent of
-- prisma/migrations/20261111120000_block_bookings/migration.sql
-- Safe to run more than once. No DROP / ALTER of existing tables.
BEGIN;

CREATE TABLE IF NOT EXISTS "BlockBooking" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "day" TEXT NOT NULL,
    "blockIndex" INTEGER NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BlockBooking_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "BlockBooking_day_blockIndex_idx" ON "BlockBooking"("day", "blockIndex");
CREATE INDEX IF NOT EXISTS "BlockBooking_userId_endsAt_idx" ON "BlockBooking"("userId", "endsAt");
CREATE UNIQUE INDEX IF NOT EXISTS "BlockBooking_day_blockIndex_userId_key" ON "BlockBooking"("day", "blockIndex", "userId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'BlockBooking_userId_fkey'
  ) THEN
    ALTER TABLE "BlockBooking"
      ADD CONSTRAINT "BlockBooking_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END
$$;

COMMIT;
