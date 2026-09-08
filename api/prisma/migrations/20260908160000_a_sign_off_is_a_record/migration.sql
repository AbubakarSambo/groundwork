-- A sign-off says a named person read a named setup question on a named date. It lived in
-- localStorage, keyed on the check-in alone, so it belonged to a browser rather than to anybody -
-- a second admin opened Setup and found questions already signed off by whoever last used that
-- machine, under a row reading "You have signed this off".
CREATE TABLE "ground_setup_sign_offs" (
    "id" TEXT NOT NULL,
    "ground_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "step" INTEGER NOT NULL,
    "signed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ground_setup_sign_offs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ground_setup_sign_offs_ground_id_user_id_idx" ON "ground_setup_sign_offs"("ground_id", "user_id");

-- One mark per person per question: pressing twice is not two sign-offs.
CREATE UNIQUE INDEX "ground_setup_sign_offs_ground_id_user_id_step_key" ON "ground_setup_sign_offs"("ground_id", "user_id", "step");

ALTER TABLE "ground_setup_sign_offs" ADD CONSTRAINT "ground_setup_sign_offs_ground_id_fkey" FOREIGN KEY ("ground_id") REFERENCES "grounds"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ground_setup_sign_offs" ADD CONSTRAINT "ground_setup_sign_offs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
