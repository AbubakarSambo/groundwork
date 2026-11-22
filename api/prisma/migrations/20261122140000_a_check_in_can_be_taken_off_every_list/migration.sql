-- A check-in people have answered can be taken off everyone's lists by its lead or an admin (Hafsah, 22 November 2026).
-- One new nullable column; nothing existing changes, and every check-in stays on its lists until someone sets it.
ALTER TABLE "grounds" ADD COLUMN "hidden_at" TIMESTAMP(3);
