-- AlterTable: Make assigned_to_id nullable for "available" chores
ALTER TABLE "chores" ALTER COLUMN "assigned_to_id" DROP NOT NULL;

-- Add new columns for available chores feature
ALTER TABLE "chores" ADD COLUMN "claimed_at" TIMESTAMP(3);
ALTER TABLE "chores" ADD COLUMN "is_bonus" BOOLEAN NOT NULL DEFAULT false;

-- Add index for finding available chores efficiently
CREATE INDEX "chores_family_id_assigned_to_id_idx" ON "chores"("family_id", "assigned_to_id");
