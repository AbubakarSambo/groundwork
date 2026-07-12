-- AlterTable
ALTER TABLE "users" ADD COLUMN "phone_number" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "users_phone_number_key" ON "users"("phone_number");
