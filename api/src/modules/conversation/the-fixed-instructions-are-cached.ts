import { createHash } from 'crypto';

/**
 * THE FIXED INSTRUCTIONS ARE SENT ONCE, NOT ON EVERY REPLY (Hafsah, 3 November evening: "Don't cut the check-in instructions ... cache
 * the fixed instructions so they aren't re-sent each reply").
 *
 * Every check-in reply sent the whole engine (the running PromptVersion's rules, about 26,000 tokens of a 33,000-token prompt) again,
 * once for the reply and again for any second try. The rules are the same for every reply of the same kind, so they are kept in one
 * Gemini context cache per text (keyed by its hash, so the version that runs is always the one cached), made once in the background and
 * kept alive while it is used. A reply whose prompt starts with those rules asks with the cache and sends only what follows them.
 *
 * Gemini refuses a request that sets a system instruction beside a cache ("Tool config, tools and system instruction should not be set
 * in the request when using cached content", Vertex, 3 November 2026). So what follows the fixed rules, the instructions for this one
 * conversation, goes in front of the conversation as Groundwork's own words, said to be its instructions and nobody's message. Nothing
 * in the instructions is cut or changed. When no cache is ready, or the cached ask fails, the reply is asked exactly as before.
 */

/** Below this the cache costs more than it saves (Gemini's own minimum is a few thousand tokens). */
export const WORTH_CACHING_FROM_CHARS = 20_000;
/** How long a cache lives, and how close to its end a use keeps it alive. */
export const A_CACHE_LIVES_S = 3600;
export const KEEP_IT_ALIVE_WITHIN_MS = 15 * 60_000;
/** A few kinds of reply use different rules (the opener, a first session, a check-in with a situation pack); more than this is unusual. */
export const AT_MOST_THIS_MANY_KEPT = 12;

export const THE_REST_OF_THE_INSTRUCTIONS =
  'GROUNDWORK\'S INSTRUCTIONS FOR THIS CONVERSATION, which follow the rules you already have. Nobody in the conversation wrote or sees this; it is not a message from the person.';

export interface AContent { role: string; parts: { text: string }[] }

/** What a request becomes when its fixed rules are in a cache: no system instruction, and the rest in front of the conversation. */
export function asACachedAsk(systemPrompt: string, fixed: string, contents: AContent[]): AContent[] {
  const rest = systemPrompt.slice(fixed.length).trim();
  if (!rest) return contents;
  const said = `${THE_REST_OF_THE_INSTRUCTIONS}\n\n${rest}`;
  const [first, ...after] = contents;
  /* Joined to the first message when it is the person's, so the conversation still alternates. */
  if (first && first.role === 'user') return [{ role: 'user', parts: [{ text: said }, ...first.parts] }, ...after];
  return [{ role: 'user', parts: [{ text: said }] }, ...contents];
}

interface Kept { text: string; name: string | null; expiresAt: number; making: Promise<void> | null; failedAt: number | null }

interface TheCachesApi {
  create(a: { model: string; config: { systemInstruction: string; ttl: string; displayName?: string } }): Promise<{ name?: string; expireTime?: string }>;
  update(a: { name: string; config: { ttl: string } }): Promise<unknown>;
}

export class TheFixedInstructions {
  private kept = new Map<string, Kept>();

  constructor(private readonly caches: () => TheCachesApi, private readonly model: () => string, private readonly warn: (s: string) => void, private readonly now: () => number = () => Date.now()) {}

  /** Said by whoever composes a prompt: this opening part is the same for every reply of its kind. Makes its cache in the background. */
  keep(fixed: string): void {
    if (!fixed || fixed.length < WORTH_CACHING_FROM_CHARS) return;
    const key = createHash('sha256').update(fixed).digest('hex');
    const k = this.kept.get(key);
    if (k && (k.name || k.making)) return;
    /* A failed make is tried again after a minute, not on every reply. */
    if (k?.failedAt && this.now() - k.failedAt < 60_000) return;
    if (!k && this.kept.size >= AT_MOST_THIS_MANY_KEPT) this.kept.delete(this.kept.keys().next().value as string);
    const entry: Kept = k ?? { text: fixed, name: null, expiresAt: 0, making: null, failedAt: null };
    entry.making = this.caches().create({ model: this.model(), config: { systemInstruction: fixed, ttl: `${A_CACHE_LIVES_S}s`, displayName: `groundwork-rules-${key.slice(0, 12)}` } })
      .then((c) => { entry.name = c?.name ?? null; entry.expiresAt = c?.expireTime ? Date.parse(c.expireTime) : this.now() + A_CACHE_LIVES_S * 1000; entry.failedAt = null; })
      .catch((err: any) => { entry.failedAt = this.now(); this.warn(`The fixed instructions could not be cached (${err?.message ?? err}); replies send them whole.`); })
      .finally(() => { entry.making = null; });
    this.kept.set(key, entry);
  }

  /** The ready cache whose rules this prompt starts with, kept alive when it is near its end; null when there is none. */
  for(systemPrompt: string): { name: string; fixed: string } | null {
    for (const k of this.kept.values()) {
      if (!k.name || !systemPrompt.startsWith(k.text)) continue;
      const left = k.expiresAt - this.now();
      if (left < 30_000) { k.name = null; continue; }
      if (left < KEEP_IT_ALIVE_WITHIN_MS) {
        k.expiresAt = this.now() + A_CACHE_LIVES_S * 1000;
        this.caches().update({ name: k.name, config: { ttl: `${A_CACHE_LIVES_S}s` } }).catch(() => undefined);
      }
      return { name: k.name, fixed: k.text };
    }
    return null;
  }

  /** A cache Gemini no longer has: forgotten, and made again the next time the rules are kept. */
  forget(name: string): void {
    for (const k of this.kept.values()) if (k.name === name) k.name = null;
  }
}
