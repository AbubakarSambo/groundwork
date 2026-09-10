import type { Reply } from '../assistant/a-reply-is-a-payload-not-a-string';

/**
 * A REPLY AS ONE TEXT MESSAGE.
 *
 * The panel renders typed blocks: text, pickers, proposals, next steps. WhatsApp renders a string.
 * Pickers become a numbered list the person can answer by typing the words; a proposal keeps its
 * question, because the person's next message is the answer; a next step names what it is, since
 * nothing on WhatsApp can be clicked. Nothing is dropped silently.
 */
export function asATextMessage(reply: Reply): string {
  const parts: string[] = [];
  for (const b of reply.blocks) {
    if (b.type === 'text') parts.push(b.body);
    else if (b.type === 'picker') parts.push(b.options.map((o) => `- ${o.label}`).join('\n'));
    else if (b.type === 'proposal') { /* the summary is already in the text block beside it */ }
    else if (b.type === 'next_step') parts.push(`${b.label}: open Groundwork to do this.`);
    else if (b.type === 'board' || b.type === 'finding_list' || b.type === 'freshness' || b.type === 'draft') parts.push('(There is more on this in Groundwork.)');
  }
  return parts.filter(Boolean).join('\n\n').trim();
}

/**
 * WHERE A WHATSAPP MESSAGE GOES. An open check-in takes it as an answer; anything else goes to the
 * assistant, the same lanes the panel has. Pure, so the rule can be read.
 */
export function whereThisGoes(openCheckIn: { id: string; status: string } | null): 'open-the-check-in' | 'answer-in-the-check-in' | 'the-assistant' {
  if (!openCheckIn) return 'the-assistant';
  return openCheckIn.status === 'NOT_STARTED' ? 'open-the-check-in' : 'answer-in-the-check-in';
}
