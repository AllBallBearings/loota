-- AlterTable
ALTER TABLE "Hunt" ADD COLUMN     "creatorId" UUID;

-- AddForeignKey
ALTER TABLE "Hunt" ADD CONSTRAINT "Hunt_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
