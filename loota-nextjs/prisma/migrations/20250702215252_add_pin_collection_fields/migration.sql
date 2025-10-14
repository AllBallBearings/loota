-- AlterTable
ALTER TABLE "Pin" ADD COLUMN     "collectedAt" TIMESTAMP(3),
ADD COLUMN     "collectedByUserId" UUID;

-- AddForeignKey
ALTER TABLE "Pin" ADD CONSTRAINT "Pin_collectedByUserId_fkey" FOREIGN KEY ("collectedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
