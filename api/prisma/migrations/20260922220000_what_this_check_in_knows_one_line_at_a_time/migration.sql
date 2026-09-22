-- What this check-in knows, one line at a time. The paste used to write four long notes, each a
-- list inside one blob; a blob cannot be edited, shared, retired or asked about. A line is a row
-- now, with a kind for its bucket, an audience, and an id so "drop that one" is a sentence.
CREATE TYPE "ContextItemKind" AS ENUM ('STRATEGY', 'WAY_OF_WORKING', 'DECISION', 'UNSETTLED', 'NOTE', 'ABOUT_A_PERSON', 'QUESTION_FOR_PERSON', 'BETWEEN_PEOPLE');

CREATE TABLE "ground_context_items" (
    "id" TEXT NOT NULL,
    "ground_id" TEXT NOT NULL,
    "kind" "ContextItemKind" NOT NULL,
    "text" TEXT NOT NULL,
    "said_as" TEXT,
    "audience" "ContextNoteAudience" NOT NULL DEFAULT 'EVERYONE',
    "about_participant_id" TEXT,
    "source" TEXT NOT NULL DEFAULT 'PASTE',
    "author_user_id" TEXT,
    "closed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ground_context_items_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ground_context_items_ground_id_idx" ON "ground_context_items"("ground_id");
CREATE INDEX "ground_context_items_about_participant_id_idx" ON "ground_context_items"("about_participant_id");

ALTER TABLE "ground_context_items" ADD CONSTRAINT "ground_context_items_ground_id_fkey" FOREIGN KEY ("ground_id") REFERENCES "grounds"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ground_context_items" ADD CONSTRAINT "ground_context_items_about_participant_id_fkey" FOREIGN KEY ("about_participant_id") REFERENCES "ground_participants"("id") ON DELETE SET NULL ON UPDATE CASCADE;
