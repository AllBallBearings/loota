-- Migration: Add contact fields for hunt creators and participants
-- This adds the new columns we need for contact information

-- Add email column to User table
ALTER TABLE "User" ADD COLUMN "email" TEXT;
ALTER TABLE "User" ADD CONSTRAINT "User_email_key" UNIQUE ("email");

-- Add contact fields to Hunt table
ALTER TABLE "Hunt" ADD COLUMN "creatorPhone" TEXT;
ALTER TABLE "Hunt" ADD COLUMN "creatorEmail" TEXT;
ALTER TABLE "Hunt" ADD COLUMN "preferredContactMethod" TEXT;
ALTER TABLE "Hunt" ADD COLUMN "isCompleted" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Hunt" ADD COLUMN "completedAt" TIMESTAMP(3);

-- Add participant phone to HuntParticipation table
ALTER TABLE "HuntParticipation" ADD COLUMN "participantPhone" TEXT;
ALTER TABLE "HuntParticipation" ADD COLUMN "notifiedOfCompletion" BOOLEAN NOT NULL DEFAULT false;