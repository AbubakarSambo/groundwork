/**
 * REAL HELP FOR THE TEAM MEMBER, PRIVATELY (Fatima, increment 6a; plan 6.3, 11, 26.1 and 31: "each team member can ask Groundwork to help draft, plan,
 * clarify or follow through on their own work, within permissions").
 *
 * They can ask for an update, a letter, a meeting agenda, a next step, or help preparing for a hard follow-up, in plain words on WhatsApp or email.
 * The model writes it (the-team-mind.ts helpThem), from their own promises and nothing else: no colleague's words, no word from Fatima, no number
 * of any kind about anybody.
 *
 * PRIVATE, IN THE BACKEND. What they ask and what Groundwork writes back is kept only in the assistant's own private history for that person (the table
 * Ask Groundwork already keeps, `assistant_turns`, which is read only for the person it belongs to), never as material, a commitment, a gap or a
 * report line. Nothing here is read by the register, the year-end work, the first picture, the weekly email or any account of her team, and
 * a test reads each of those to prove it. Fatima only ever sees work that was documented (a promise, a document, an update the person sent as their
 * own check-in). Bank and card numbers are hidden before anything is kept or read by the model (decision 35).
 */
import { remember } from './the-conversation-so-far';
import { withoutBankDetails } from '../documents/bank-details-are-never-kept';
import { HELP_CANNOT_NOW, HELP_NEEDS_MORE } from './the-team-words';
import { theirWorkNow, thePersonBehind } from './what-their-reply-says';
import type { TheTeamMind } from './the-team-mind';

export const THE_HELP_LANE = 'team-help';

export async function helpTheTeamMember(prisma: any, mind: TheTeamMind | null | undefined, a: { contact: any; message: string; now: Date; recent?: string }): Promise<string> {
  const person = await thePersonBehind(prisma, a.contact);
  /* What they wrote before and what help last said go with the message, so "They are the Director and two officers" is read as the next part of the same request (the-conversation-so-far.ts). */
  const message = withoutBankDetails(`${a.recent ? `The conversation so far:\n${a.recent}\nThey now say: ` : ''}${String(a.message ?? '')}`).slice(0, 3000);
  const { work } = await theirWorkNow(prisma, a.contact);
  const drafted = await mind?.helpThem({ first: work.first, message, work }).catch(() => null);
  /* A draft with a bracketed blank in it is not help: it asks for the one thing it needs instead of sending the blanks. */
  const written = drafted && !/\[[^\]]{1,40}\]/.test(drafted) ? drafted : null;
  /* Without the model there is nothing honest to draft: it asks the one thing it needs, and says so, rather than writing something empty. */
  const reply = written ?? (drafted || !mind ? HELP_NEEDS_MORE(work.first) : HELP_CANNOT_NOW(work.first));
  remember(String(a.contact?.id ?? ''), { by: 'groundwork', text: reply, help: true });
  if (person) {
    const keep = (role: string, content: string) => prisma.assistantTurn.create({ data: { organizationId: a.contact.organizationId, personExternalId: person.externalId, role, content, lane: THE_HELP_LANE, composedBy: written ? 'model' : 'rules' } });
    await keep('person', withoutBankDetails(String(a.message ?? '')).slice(0, 3000)).catch(() => undefined);
    await keep('assistant', reply).catch(() => undefined);
  }
  return reply;
}
