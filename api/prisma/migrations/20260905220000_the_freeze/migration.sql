-- The freeze: a stable product, and nothing added to it.
--
-- Phase one's objective made enforceable. Append-only, because turning it off
-- is a decision with a name against it — each row is that decision and the
-- newest is the state. It carries an end date because a freeze nobody lifts
-- becomes the reason nothing ships in March.
CREATE TABLE "ops_freezes" (
  "id"             TEXT NOT NULL,
  "is_on"          BOOLEAN NOT NULL,
  "because"        TEXT NOT NULL,
  "until"          DATE,
  "decided_by_id"  TEXT NOT NULL,
  "decided_at"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ops_freezes_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ops_freezes_decided_at_idx" ON "ops_freezes"("decided_at");
