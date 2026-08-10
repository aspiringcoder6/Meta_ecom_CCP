CREATE TYPE "UserStatus" AS ENUM ('PENDING', 'ACTIVE', 'REJECTED', 'SUSPENDED');
CREATE TYPE "AuthProvider" AS ENUM ('LOCAL', 'GOOGLE');

ALTER TABLE "User"
  ADD COLUMN "username" TEXT,
  ADD COLUMN "name" TEXT,
  ADD COLUMN "status" "UserStatus" NOT NULL DEFAULT 'PENDING',
  ADD COLUMN "provider" "AuthProvider" NOT NULL DEFAULT 'LOCAL',
  ADD COLUMN "googleSubject" TEXT,
  ADD COLUMN "avatarUrl" TEXT,
  ADD COLUMN "department" TEXT,
  ADD COLUMN "emailVerified" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "rejectionReason" TEXT,
  ADD COLUMN "tokenVersion" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "lastLoginAt" TIMESTAMP(3),
  ADD COLUMN "reviewedAt" TIMESTAMP(3),
  ADD COLUMN "reviewedById" TEXT,
  ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ALTER COLUMN "password" DROP NOT NULL,
  ALTER COLUMN "role" DROP NOT NULL;

UPDATE "User"
SET "name" = split_part("email", '@', 1),
    "status" = 'ACTIVE',
    "emailVerified" = true;

ALTER TABLE "User" ALTER COLUMN "name" SET NOT NULL;

CREATE UNIQUE INDEX "User_username_key" ON "User"("username");
CREATE UNIQUE INDEX "User_googleSubject_key" ON "User"("googleSubject");
CREATE INDEX "User_status_idx" ON "User"("status");
CREATE INDEX "User_role_idx" ON "User"("role");

ALTER TABLE "User"
  ADD CONSTRAINT "User_reviewedById_fkey"
  FOREIGN KEY ("reviewedById") REFERENCES "User"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
