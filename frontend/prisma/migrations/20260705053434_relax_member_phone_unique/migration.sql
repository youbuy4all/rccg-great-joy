/*
  Warnings:

  - You are about to drop the column `from_date` on the `monthly_returns` table. All the data in the column will be lost.
  - You are about to drop the column `to_date` on the `monthly_returns` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "monthly_returns" DROP COLUMN "from_date",
DROP COLUMN "to_date";
