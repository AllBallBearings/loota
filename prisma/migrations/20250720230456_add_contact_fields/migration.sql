-- CreateIndex
-- Add email column to User table
ALTER TABLE "User" ADD COLUMN "email" TEXT;

-- Add contact fields to Hunt table  
ALTER TABLE "Hunt" ADD COLUMN "creatorPhone" TEXT;
ALTER TABLE "Hunt" ADD COLUMN "creatorEmail" TEXT;
ALTER TABLE "Hunt" ADD COLUMN "preferredContactMethod" TEXT;
ALTER TABLE "Hunt" ADD COLUMN "isCompleted" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Hunt" ADD COLUMN "completedAt" TIMESTAMP(3);

-- Add participant phone to HuntParticipation table
ALTER TABLE "HuntParticipation" ADD COLUMN "participantPhone" TEXT;
ALTER TABLE "HuntParticipation" ADD COLUMN "notifiedOfCompletion" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");