-- WHAT THE LEAD TYPED IN SETUP (U.7 re-check): the person's own messages from the setup
-- conversation, one row per check-in, shown only to the person who wrote them while they lead it.
CREATE TABLE "lead_setup_words" (
    "id" TEXT NOT NULL,
    "ground_id" TEXT NOT NULL,
    "author_user_id" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lead_setup_words_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "lead_setup_words_ground_id_key" ON "lead_setup_words"("ground_id");

ALTER TABLE "lead_setup_words" ADD CONSTRAINT "lead_setup_words_ground_id_fkey" FOREIGN KEY ("ground_id") REFERENCES "grounds"("id") ON DELETE CASCADE ON UPDATE CASCADE;
