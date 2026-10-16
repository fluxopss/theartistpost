-- Optional artist payment usernames (link-out only; nothing is processed).
-- Additive: three nullable columns, no defaults, no row rewrite.
ALTER TABLE "User" ADD COLUMN "venmoUsername" TEXT;
ALTER TABLE "User" ADD COLUMN "cashAppTag" TEXT;
ALTER TABLE "User" ADD COLUMN "paypalMeUsername" TEXT;
