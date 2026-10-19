import { aMatterCheckIn, theBillsThatWait, theEventAsSaid, plainWords } from '../board/a-fee-note-due-on-an-event';
import { F } from '../board/the-collections-record';
import { theWordsNameTheMatter } from '../board/the-matter-board';

/**
 * WHAT THE OPEN FEE NOTES WAIT FOR, AS KNOWLEDGE FOR A MATTER CHECK-IN (Release 2, pull request 3 of 3; release plan, Release 2,
 * "Due on an event": "when the litigation check-in reports the event a fee note waits for ... the fee note becomes due that day").
 *
 * KNOWLEDGE, NEVER A SCRIPT. One block of the events the firm's open fee notes wait for, by matter, so the check-in notices when one
 * is reported and knows the day it happened (which is the day the fee note falls due). The tone, the flow and every rule of the
 * conversation are untouched: it adds no question to ask, and it is never read out.
 *
 * NEVER MONEY. The block names the matter and the event only: never a fee note, an amount, a number or who follows it up. A
 * paralegal in the litigation check-in only is not one of the people who read the fees (part 2's rule), so nothing about them reaches
 * the check-in, and the model is told never to raise them.
 *
 * ONLY THIS CHECK-IN'S MATTERS. A matter is listed only where this check-in's own lines or deadlines already name it, so no matter
 * nobody here has spoken of is brought in.
 *
 * ONLY WHERE THE SWITCHBOARD PICKS THE MATTER BOARD: Release 2 on, a PULSE_CHECK whose type on record is a legal matter. Anywhere
 * else the block is empty, and every prompt is exactly as before. Code-side words, no stored prompt: no `PromptVersion` row is added
 * or changed, and a turn's `promptVersionId` still names only the stored prompts it ran.
 */

export const FEE_NOTES_WAIT_HEADING = 'EVENTS IN THESE MATTERS THAT THE FIRM IS WAITING FOR';

export function theEventsBlock(events: { matter: string; event: string }[]): string {
  if (!events.length) return '';
  return `${FEE_NOTES_WAIT_HEADING}
Some of the firm's work waits for something to happen in a matter. This is what it waits for, by matter. It is knowledge, not a question list: never read it out, never ask about it as a list, and never mention fees, bills, money or payment.
${events.map((e) => `- ${e.matter}: ${e.event}`).join('\n')}
When what someone says touches one of these, notice whether it has happened or is only expected. Where they say it has happened and have not said the day, ask for the day once, in your own words, as part of what you would ask anyway.`;
}

export async function whatTheOpenFeeNotesWaitFor(prisma: any, checkIn: { groundId: string }): Promise<{ block: string }> {
  const ground = await aMatterCheckIn(prisma, checkIn.groundId).catch(() => null);
  if (!ground) return { block: '' };
  const bills = await theBillsThatWait(prisma, ground.organizationId).catch(() => []);
  if (!bills.length) return { block: '' };
  const said = [
    ...(((await Promise.resolve(prisma?.recordEntry?.findMany?.({ where: { participant: { groundId: checkIn.groundId }, disputedAt: null }, select: { text: true } })).catch(() => [])) ?? []) as any[]).map((l) => String(l.text ?? '')),
    ...(((await Promise.resolve(prisma?.workItem?.findMany?.({ where: { groundId: checkIn.groundId, kind: 'deadline' }, select: { name: true } })).catch(() => [])) ?? []) as any[]).map((d) => String(d.name ?? '')),
  ];
  const seen = new Set<string>();
  const events: { matter: string; event: string }[] = [];
  for (const b of bills) {
    const f = (b.fields ?? {}) as any;
    const m = { client: String(f[F.client] ?? '').trim(), matter: String(f[F.matter] ?? '').trim() || null };
    if (!m.client && !m.matter) continue;
    if (!said.some((w) => theWordsNameTheMatter(w, m))) continue;
    const event = theEventAsSaid(String(f[F.dueWhen] ?? ''));
    /* The matter's whole name only where this check-in has said it; else its client's, as said here. */
    const name = m.matter && said.some((w) => ` ${plainWords(w)} `.includes(` ${plainWords(m.matter)} `)) ? m.matter : (m.client || m.matter as string);
    const key = `${name}|${event}`.toLowerCase();
    if (!event || seen.has(key)) continue;
    seen.add(key);
    events.push({ matter: name, event });
  }
  return { block: theEventsBlock(events) };
}
