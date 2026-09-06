-- A figure held as a value rather than as a sentence in a document, and a
-- difference that survives the conversation. Money is minor units, integer.
CREATE TABLE "reported_figures" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "ground_id" TEXT NOT NULL,
    "says" TEXT NOT NULL,
    "minor_units" INTEGER NOT NULL,
    "currency" TEXT NOT NULL,
    "period_from" DATE NOT NULL,
    "period_to" DATE NOT NULL,
    "source" TEXT NOT NULL,
    "stated_by" TEXT NOT NULL,
    "from" TEXT NOT NULL,
    "document_id" TEXT,
    "confirmed_at" TIMESTAMP(3),
    "confirmed_by_user" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reported_figures_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "reported_figures_ground_id_period_from_idx" ON "reported_figures"("ground_id", "period_from");
ALTER TABLE "reported_figures" ADD CONSTRAINT "reported_figures_ground_id_fkey" FOREIGN KEY ("ground_id") REFERENCES "grounds"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "differences" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "ground_id" TEXT NOT NULL,
    "between" TEXT NOT NULL,
    "minor_units" INTEGER NOT NULL,
    "currency" TEXT NOT NULL,
    "period_from" DATE NOT NULL,
    "period_to" DATE NOT NULL,
    "state" TEXT NOT NULL DEFAULT 'not explained yet',
    "stated_figure_id" TEXT NOT NULL,
    "counted_figure_ids" TEXT[],
    "ruled_out" TEXT[],
    "accounted_for_by" TEXT,
    "accounted_at" TIMESTAMP(3),
    "last_asked" TEXT,
    "last_asked_at" TIMESTAMP(3),
    "first_seen_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "differences_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "differences_ground_id_state_idx" ON "differences"("ground_id", "state");
ALTER TABLE "differences" ADD CONSTRAINT "differences_ground_id_fkey" FOREIGN KEY ("ground_id") REFERENCES "grounds"("id") ON DELETE CASCADE ON UPDATE CASCADE;
