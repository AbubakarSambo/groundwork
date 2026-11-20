/**
 * WHERE HER WORDS ARE HEARD, ON ANY CHANNEL (Fatima, increment 5). Chat, a reply to the mail, a WhatsApp message and a voice note's words all come
 * here with the same text. It answers only for a senior person who was added by an admin (a `principal_setups` row) and for the people she lets act
 * for her, and says nothing (null) for everybody else, so the caller carries on with what it was doing.
 *
 *   "Stop", "Slow down", "Carry on"   her-preferences.ts, hers alone
 *   her answer to the one go-ahead     team-introductions.ts
 *   names with their contacts           team-introductions.ts, which asks the one question
 *
 * Her words are her own only above the forwarded part of a message (the-intake.ts herOwnWords), so a forwarded message cannot answer for her.
 */
import { whoIsTheReader, whoThisPersonActsFor, type TheReader } from '../outstanding/a-delegate-acts-for-a-principal';
import { whichOneIsItFor } from './an-assistant-for-several-principals';
import { hearHerAboutQuiet, isAboutHerQuiet } from './her-preferences';
import { answerTheGoAhead, herAnswerToTheGoAhead, proposeThePeople, theGoAheadQuestionWaiting, type TheTeamPorts } from './team-introductions';
import type { AChannel } from '../principal-work/principal-work';

/** The ports her words are heard with, and the one place the payments, voice, recipient and briefing work (principal-work/) hears them too. */
export type TheHearingPorts = TheTeamPorts & {
  /** A standing instruction about her team, or her answer to one that is waiting (team-loop/standing-instructions.ts). Read before the briefings, because "get everyone's updates and email me Friday" is an instruction to the team, not a request for her own update. */
  theInstruction?: (a: { organizationId: string; userId: string | null; message: string; now: Date; principalUserId?: string }) => Promise<string | null>;
  theWork?: (a: { organizationId: string; principalUserId: string; principalFirst: string; speaker: { userId: string; isPrincipal: boolean }; message: string; channel?: AChannel; now: Date }) => Promise<string | null>;
};

/** Who is speaking, and for whom: herself, or somebody acting for a senior person who was added by an admin. Null for everybody else. */
export async function whoIsSpeakingForWhom(prisma: any, organizationId: string, userId: string | null, chosen?: string | null): Promise<{ principalUserId: string; principalFirst: string; speaker: { userId: string; isPrincipal: boolean; reader: TheReader }; byName: string } | null> {
  if (!userId) return null;
  /* One cheap read first: an organisation with no senior person added this way (nearly all of them) is nobody's business here. */
  const setups: any[] = (await prisma.principalSetup?.findMany?.({ where: { organizationId }, select: { principalUserId: true } }).catch(() => [])) ?? [];
  if (!setups.length) return null;
  const hasSetup = async (id: string) => setups.some((x) => x.principalUserId === id);
  const me: any = await prisma.user?.findUnique?.({ where: { id: userId }, select: { firstName: true, lastName: true } }).catch(() => null);
  const byName = [me?.firstName, me?.lastName].filter(Boolean).join(' ') || 'Somebody';
  if (await hasSetup(userId)) return { principalUserId: userId, principalFirst: me?.firstName ?? 'there', speaker: { userId, isPrincipal: true, reader: { kind: 'own', principalUserId: userId } }, byName };
  const grants = await whoThisPersonActsFor(prisma, organizationId, userId);
  const withSetup: { principalUserId: string }[] = [];
  for (const g of grants) if (await hasSetup(g.principalUserId)) withSetup.push(g);
  /* Somebody who acts for several is nobody's assistant until the one it is for is named (an-assistant-for-several-principals.ts, which passes `chosen`). */
  const picked = withSetup.length === 1 ? withSetup[0] : chosen ? withSetup.find((g) => g.principalUserId === chosen) : undefined;
  if (!picked) return null;
  const principal: any = await prisma.user.findUnique({ where: { id: picked.principalUserId }, select: { firstName: true } });
  const reader = await whoIsTheReader(prisma, organizationId, userId, principal?.firstName ?? null);
  if (reader.kind !== 'delegate') return null;
  return { principalUserId: picked.principalUserId, principalFirst: principal?.firstName ?? 'her', speaker: { userId, isPrincipal: false, reader }, byName };
}

/**
 * Nothing is matched against her words here. What they mean is read further in, by the model where there is one, and only for a senior person an
 * admin added (whoIsSpeakingForWhom, one read that is empty for nearly everybody), so a message that is not hers costs a single look.
 */
export const mightBeHerWords = (message: string): boolean => String(message ?? '').trim().length > 0;

export async function hearHer(prisma: any, ports: TheHearingPorts, a: { organizationId: string; userId: string | null; message: string; now: Date; channel?: AChannel }): Promise<string | null> {
  if (!mightBeHerWords(a.message)) return null;
  let who = await whoIsSpeakingForWhom(prisma, a.organizationId, a.userId);
  let message = a.message;
  let thanks: string | null = null;
  /* Somebody who acts for several senior people: held, and asked which one, once (an-assistant-for-several-principals.ts). What was held is then carried on as that person's. */
  if (!who && a.userId) {
    const several = await whichOneIsItFor(prisma, { organizationId: a.organizationId, userId: a.userId, text: a.message, now: a.now });
    if (several?.kind === 'ask') return several.say;
    if (several?.kind === 'go') {
      who = await whoIsSpeakingForWhom(prisma, a.organizationId, a.userId, several.principalUserId);
      message = several.text;
      thanks = several.say;
    }
  }
  if (!who) return null;
  const said = await carryOn(prisma, ports, who, { ...a, message });
  return thanks ? (said ? `${thanks} ${said}` : thanks) : said;
}

async function carryOn(prisma: any, ports: TheHearingPorts, who: NonNullable<Awaited<ReturnType<typeof whoIsSpeakingForWhom>>>, a: { organizationId: string; userId: string | null; message: string; now: Date; channel?: AChannel }): Promise<string | null> {
  const message = a.message;
  const quiet = await hearHerAboutQuiet(prisma, { organizationId: a.organizationId, principalUserId: who.principalUserId, byPrincipal: who.speaker.isPrincipal, first: who.principalFirst, message, now: a.now });
  if (quiet) return quiet;
  /* Her yes or no to the one go-ahead, in any words that mean it. Only read where a question is waiting. */
  const waitingQuestion = await theGoAheadQuestionWaiting(prisma, who.principalUserId);
  if (waitingQuestion) {
    const answer = await herAnswerToTheGoAhead(ports.mind, waitingQuestion, message);
    if (answer) return answerTheGoAhead(prisma, ports, { organizationId: a.organizationId, principalUserId: who.principalUserId, principalFirst: who.principalFirst, speaker: who.speaker, answer, now: a.now });
  }
  const instruction = await ports.theInstruction?.({ organizationId: a.organizationId, userId: a.userId, message, now: a.now, principalUserId: who.principalUserId });
  if (instruction) return instruction;
  /* A name to add as a recipient, a briefing, a yes to a question about the files or the summary: read before names are taken as new contacts, because "send it to Musa at musa@x.com too" names a recipient, not a team member. */
  const work = await ports.theWork?.({ organizationId: a.organizationId, principalUserId: who.principalUserId, principalFirst: who.principalFirst, speaker: { userId: who.speaker.userId, isPrincipal: who.speaker.isPrincipal }, message, channel: a.channel, now: a.now });
  if (work) return work;
  return proposeThePeople(prisma, { organizationId: a.organizationId, principalUserId: who.principalUserId, principalFirst: who.principalFirst, speaker: who.speaker, message, now: a.now, mind: ports.mind });
}
