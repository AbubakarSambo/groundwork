import { createHash } from 'crypto';
import type { PrismaService } from '../prisma/prisma.service';
import type { Compose } from './the-engine-drafts-it-the-model-words-it';
import { STYLE_VERSION } from '../assistant/the-model-words-it-and-nothing-more';

/**
 * A LINE WORDED ONCE IS KEPT.
 *
 * Measured on 10 Sep 2026: a session report took 10.6 seconds cold and 7.5 seconds warm, the shared
 * report 6 seconds, the board 4 seconds. All of it was the wording pass: the same engine drafts sent
 * to the model on every read and coming back the same. The record only changes when somebody
 * checks in, so the wording of an unchanged record is a fact, not a computation.
 *
 * The key is the style version, the instruction and the draft, hashed. A changed style or a changed
 * draft is a new key and one model call. Nothing here decides what is safe to show: the guard in
 * `wordedByTheModel` still runs on what comes back, cached or not, so a line that would have been
 * refused is refused the same way.
 *
 * Failures of the cache are failures of the cache only: a lookup or a write that throws falls back to
 * the model call, as if the table were not there.
 */
/*
 * ONE QUESTION TO THE MODEL PER LINE, HOWEVER MANY ASK AT ONCE.
 *
 * The kept table answers a line that is already worded. It could not answer two warm-ups that
 * reached the same new line in the same second: neither found it kept, so both asked the model,
 * and on run-19 the same lines were asked for again and again while the model was refusing for
 * its rate limit (decision 44). Now the first asker's call is shared by everybody who reaches the
 * same key while it is out. Module-wide, so two instances of a service share it too.
 *
 * Only callers that may ask share it. Opening a page (`mayAsk` false) reads the kept line and never
 * waits on somebody else's model call.
 */
const beingWorded = new Map<string, Promise<string | null>>();

/** For tests: how many lines are out with the model right now. */
export const linesBeingWorded = (): number => beingWorded.size;

export function rememberedCompose(prisma: PrismaService, compose: Compose, mayAsk = true): Compose {
  return async (system, draft) => {
    const key = createHash('sha256').update(`${STYLE_VERSION}\u0000${system}\u0000${draft}`).digest('hex');
    if (mayAsk) {
      const out = beingWorded.get(key);
      if (out) return out;
    }
    const kept = await prisma.wordedLine.findUnique({ where: { key }, select: { text: true } }).catch(() => null);
    if (kept?.text) return kept.text;
    if (!mayAsk) return compose(system, draft);
    /* Looked again after the lookup: another asker may have started while this one was reading. */
    const started = beingWorded.get(key);
    if (started) return started;
    const asking = (async () => {
      const fresh = await compose(system, draft);
      if (fresh && fresh.trim()) {
        await prisma.wordedLine.upsert({ where: { key }, create: { key, text: fresh }, update: { text: fresh } }).catch(() => undefined);
      }
      return fresh;
    })();
    beingWorded.set(key, asking);
    try {
      return await asking;
    } finally {
      if (beingWorded.get(key) === asking) beingWorded.delete(key);
    }
  };
}
