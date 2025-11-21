-- Step 1: Copy participant phone numbers to User table where they don't already exist
-- Only update User records that don't have a phone number set
UPDATE "User" u
SET phone = hp."participantPhone",
    "updatedAt" = NOW()
FROM "HuntParticipation" hp
WHERE hp."userId" = u.id
  AND u.phone IS NULL
  AND hp."participantPhone" IS NOT NULL;

-- Step 2: Drop the participantPhone column from HuntParticipation
ALTER TABLE "HuntParticipation" DROP COLUMN "participantPhone";
