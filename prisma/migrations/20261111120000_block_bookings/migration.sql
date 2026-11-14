-- CreateTable
CREATE TABLE "BlockBooking" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "day" TEXT NOT NULL,
    "blockIndex" INTEGER NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BlockBooking_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BlockBooking_day_blockIndex_idx" ON "BlockBooking"("day", "blockIndex");

-- CreateIndex
CREATE INDEX "BlockBooking_userId_endsAt_idx" ON "BlockBooking"("userId", "endsAt");

-- CreateIndex
CREATE UNIQUE INDEX "BlockBooking_day_blockIndex_userId_key" ON "BlockBooking"("day", "blockIndex", "userId");

-- AddForeignKey
ALTER TABLE "BlockBooking" ADD CONSTRAINT "BlockBooking_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
