/**
 * THE CONVERSATION SO FAR, FOR THE MODEL (Ebele round 12). A reply read or written with only the latest message cannot tell what "They" is, what "the reminder"
 * is, or that "here is the signed copy" answers a request for proof: those come from the last few things this person wrote and what Groundwork last said to them.
 * The model is handed that as evidence, instead of one more rule for each case that went wrong.
 *
 * Kept in memory, per person, for two hours, and nowhere else. What a team member says to the coach is written to their private history and read nowhere
 * (the-team-loop-keeps-to-its-limits.spec.ts), so it is not read back from there; a restart forgets it, which is fine for two hours of talk. It is only ever
 * given to the model that is answering that same person.
 */
export interface ASaying { by: 'they' | 'groundwork'; text: string; at: number; help?: boolean }

const TWO_HOURS = 2 * 60 * 60 * 1000;
const MOST = 6;
const memory = new Map<string, ASaying[]>();

export function remember(contactId: string, saying: { by: 'they' | 'groundwork'; text: string; help?: boolean }): void {
  const text = String(saying.text ?? '').replace(/\s+/g, ' ').trim().slice(0, 500);
  if (!contactId || !text) return;
  memory.set(contactId, [...(memory.get(contactId) ?? []), { by: saying.by, text, at: Date.now(), ...(saying.help ? { help: true } : {}) }].slice(-MOST));
}

export const recently = (contactId: string): ASaying[] => (memory.get(contactId) ?? []).filter((s) => Date.now() - s.at < TWO_HOURS);

/** What Groundwork last said to them, when it was help (so a message that goes on from it is a part of the same request). */
export const theLastHelpWasAsking = (contactId: string): boolean => { const last = recently(contactId).filter((s) => s.by === 'groundwork').pop(); return !!last?.help; };

/** The evidence as the model reads it: oldest first, the speaker named. Empty when there is none. */
export const asEvidence = (contactId: string): string =>
  recently(contactId).map((s) => `${s.by === 'they' ? 'They wrote' : 'You said'}: ${s.text}`).join('\n');

/** For a test, so one conversation does not run on into the next. */
export const forgetTheConversation = (): void => memory.clear();
