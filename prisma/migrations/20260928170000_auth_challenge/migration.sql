-- Passwordless sign-in challenges for mobile (and future web) email codes.
-- Additive only. Safe on a DB previously created via db push.

CREATE TYPE "AuthChallengePurpose" AS ENUM ('SIGN_IN');

CREATE TABLE "AuthChallenge" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "purpose" "AuthChallengePurpose" NOT NULL DEFAULT 'SIGN_IN',
    "codeHash" TEXT NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "consumedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuthChallenge_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AuthChallenge_email_purpose_createdAt_idx" ON "AuthChallenge"("email", "purpose", "createdAt");
CREATE INDEX "AuthChallenge_expiresAt_idx" ON "AuthChallenge"("expiresAt");
