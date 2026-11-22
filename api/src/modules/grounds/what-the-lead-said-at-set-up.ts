/**
 * WHAT THE LEAD SAID AT SET-UP, FROM ONE PLACE (existing customers, 22 November 2026).
 *
 * The kind of work and the targets given at set-up are read from what the lead said when she set the check-in up. A check-in set up in
 * the chat keeps an empty brief and end state, so those are not it. Her own words are kept in lead_setup_words. A check-in saved before
 * that was kept for every save (721b352e6: a save resumed from the save card sent none of her words) holds them nowhere, only in the
 * set-up read-back she saved: what Groundwork said it understood, the targets agreed, and the people named. So that is read where her
 * own words are not, and said as what it is, never as her words.
 */
import { GroundworkEvents, type SetupReadEvent } from '../../common/events';
import type { TheSetupGiven } from '../conversation/assess-the-conversation';
import { readUntilItLands } from '../entry/a-slow-reading-does-not-hold-the-save';

export async function whatTheLeadSaidAtSetUp(prisma: any, groundId: string): Promise<string> {
  const own = await Promise.resolve(prisma.leadSetupWords?.findUnique?.({ where: { groundId }, select: { text: true } })).catch(() => null);
  if (String(own?.text ?? '').trim()) return `What the lead typed when setting it up:\n${String(own.text).trim()}`;
  const ground = await Promise.resolve(prisma.ground?.findUnique?.({ where: { id: groundId }, select: { initiatorId: true } })).catch(() => null);
  const lead = ground?.initiatorId
    ? await Promise.resolve(prisma.groundParticipant?.findFirst?.({ where: { groundId, userId: ground.initiatorId }, select: { id: true } })).catch(() => null)
    : null;
  const first = lead
    ? await Promise.resolve(prisma.checkIn?.findFirst?.({ where: { participantId: lead.id }, orderBy: { sessionNumber: 'asc' }, select: { sessionReport: true } })).catch(() => null)
    : null;
  return theSetUpReadBackInWords((first?.sessionReport as any)?.reportTheyRead ?? null);
}

/** The set-up read-back she saved, as plain lines: what Groundwork understood, what was agreed, and who was named. Empty where there is none. */
export function theSetUpReadBackInWords(r: any): string {
  if (!r || typeof r !== 'object') return '';
  const lines = [
    String(r.yourRole ?? '').trim(),
    String(r.whatGroundworkSaw ?? '').trim(),
    ...((Array.isArray(r.alignmentReached) ? r.alignmentReached : []) as any[]).map((a) => String(a?.note ?? a?.title ?? '').trim()),
    ...((Array.isArray(r.mentionedPeople) ? r.mentionedPeople : []) as any[]).map((p) => [p?.name, p?.context].filter(Boolean).join(': ').trim()),
  ].filter(Boolean);
  return lines.length ? `What Groundwork said back to the lead at set-up, and she saved:\n${lines.join('\n')}` : '';
}

/**
 * HER OWN WORDS, KEPT, BY ONE WRITER FOR EVERY DOOR (/start and a check-in set up in the chat, 22 November 2026). Kept apart from the
 * ground's row, so nothing spreads them; shown only to her while she leads it, and read for its kind of work and its targets.
 */
export async function keepWhatTheLeadTyped(prisma: any, groundId: string, authorUserId: string, text: string, logger?: { warn: (m: string) => void }): Promise<void> {
  const words = String(text ?? '').trim().slice(0, 20_000);
  if (!words) return;
  await Promise.resolve(prisma.leadSetupWords?.upsert?.({
    where: { groundId },
    create: { groundId, authorUserId, text: words },
    update: { authorUserId, text: words },
  })).catch((err: any) => logger?.warn(`Could not keep the lead's setup words on ${groundId}: ${err?.message}`));
}

/** What reading her set-up needs: the record, the conversation's writers, the check-in's own writer and the events. */
export interface TheSetUpReaders {
  prisma: any;
  conversation: {
    extractExpectations: (checkInId: string, participantId: string, groundId: string, spokenElsewhere?: { role: string; content: string }[]) => Promise<unknown>;
    assessAndThenRead?: (checkIn: { id: string; participantId: string; groundId: string; sessionNumber: number }, how: { howItEnded: 'setup saved'; closedAt: Date; setup: TheSetupGiven }) => Promise<unknown>;
  };
  grounds?: { keepWhatSetupGave: (groundId: string, leadUserId: string, setupCheckInId: string) => Promise<unknown> } | null;
  events?: { emit: (event: string, payload: unknown) => unknown } | null;
  logger?: { log?: (m: string) => void; warn: (m: string) => void; error?: (m: string) => void };
}

/**
 * WHAT SHE SAID AT SET-UP, READ ONTO THE RECORD, AFTER THE PEOPLE ARE ON IT (a check-in set up in the chat, 22 November 2026).
 *
 * The same readers a save on /start runs, in the same order: her set-up is assessed as set-up (the team's aims), the targets for each
 * person are read from her words (extractExpectations), the board is warmed again when they land (SETUP_READ), and once the assessment is
 * written, what else set-up gave goes where it lives (keepWhatSetupGave). Saving it is her yes, so nothing she gave here waits for a card.
 *
 * `setup` is her set-up as she gave it: her messages and what was given beside them. Without it (a check-in saved before, read again by
 * scripts/re-read-existing-check-ins.ts), what she said at set-up is read from its one owner, and only her targets are read from it,
 * because her first check-in's assessment may already hold her own account. Never throws; resolves true when her targets were read.
 */
export async function readTheTargetsSheGaveAtSetUp(d: TheSetUpReaders, groundId: string, setup?: TheSetupGiven | null): Promise<boolean> {
  const ground = await Promise.resolve().then(() => d.prisma.ground.findUnique({ where: { id: groundId }, select: { initiatorId: true } })).catch(() => null);
  if (!ground?.initiatorId) return false;
  const lead = await Promise.resolve().then(() => d.prisma.groundParticipant.findFirst({ where: { groundId, userId: ground.initiatorId }, select: { id: true } })).catch(() => null);
  const first = lead
    ? await Promise.resolve().then(() => d.prisma.checkIn.findFirst({ where: { participantId: lead.id }, orderBy: { sessionNumber: 'asc' }, select: { id: true, sessionNumber: true } })).catch(() => null)
    : null;
  if (!lead || !first) return false;
  const words = setup?.words?.length ? setup.words : [(await whatTheLeadSaidAtSetUp(d.prisma, groundId)).trim()].filter(Boolean);
  if (!words.length) return false;
  const herSetUp = setup?.words?.length ? setup : null;
  const assessed = herSetUp && d.conversation.assessAndThenRead
    ? Promise.resolve().then(() => d.conversation.assessAndThenRead!({ id: first.id, participantId: lead.id, groundId, sessionNumber: first.sessionNumber ?? 1 }, { howItEnded: 'setup saved', closedAt: new Date(), setup: herSetUp }))
      .catch((err: any) => d.logger?.warn(`The assessment of ${groundId}'s setup could not be written: ${err?.message ?? err}`))
    : Promise.resolve();
  const landed = await readUntilItLands(
    () => d.conversation.extractExpectations(first.id, lead.id, groundId, words.map((content) => ({ role: 'user', content }))),
    (err, tried, willTryAgain) => d.logger?.warn(`The targets given at set-up on ${groundId} could not be read (try ${tried}): ${err?.message}${willTryAgain ? '; trying again' : '; giving up'}`),
  );
  if (landed) d.events?.emit?.(GroundworkEvents.SETUP_READ, { groundId } satisfies SetupReadEvent);
  await assessed;
  if (herSetUp && d.grounds) {
    await Promise.resolve().then(() => d.grounds!.keepWhatSetupGave(groundId, ground.initiatorId, first.id))
      .catch((err: any) => d.logger?.warn(`What setup gave could not be kept on ${groundId}: ${err?.message ?? err}`));
    d.events?.emit?.(GroundworkEvents.SETUP_READ, { groundId } satisfies SetupReadEvent);
  }
  return landed;
}
