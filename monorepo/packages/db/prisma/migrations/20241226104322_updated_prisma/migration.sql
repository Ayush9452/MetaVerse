/*
  Warnings:

  - You are about to drop the column `createrId` on the `Space` table. All the data in the column will be lost.
  - Added the required column `static` to the `Element` table without a default value. This is not possible if the table is not empty.
  - Added the required column `thumbnail` to the `Map` table without a default value. This is not possible if the table is not empty.
  - Added the required column `creatorId` to the `Space` table without a default value. This is not possible if the table is not empty.
  - Made the column `height` on table `Space` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "Space" DROP CONSTRAINT "Space_createrId_fkey";

-- AlterTable
ALTER TABLE "Element" ADD COLUMN     "static" BOOLEAN NOT NULL;

-- AlterTable
ALTER TABLE "Map" ADD COLUMN     "thumbnail" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Space" DROP COLUMN "createrId",
ADD COLUMN     "creatorId" TEXT NOT NULL,
ALTER COLUMN "height" SET NOT NULL;

-- AddForeignKey
ALTER TABLE "Space" ADD CONSTRAINT "Space_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
