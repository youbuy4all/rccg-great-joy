-- DropIndex
DROP INDEX "members_phone_key";

-- AlterTable
ALTER TABLE "monthly_returns" ADD COLUMN     "from_date" DATE,
ADD COLUMN     "to_date" DATE;
