/**
 * A SMALL IN-MEMORY WORLD FOR THE TESTS OF THE TEAM LOOP (Fatima, increment 6a), built on the one for onboarding without registration. Fatima has been
 * added; Amina Yusuf (email) and Ibrahim Sule (email and WhatsApp) are the two people she named and said yes to. Mail and WhatsApp are fakes that write
 * down exactly what a person would have read. The model is a script: a test says what it would read, so no network is needed, and a test can also
 * leave it out to see the plain reading carry on.
 */
import { aTable } from '../outstanding/an-organisation-for-an-executive';
import { addAnExecutive } from '../executive-onboarding/onboard-an-executive';
import { hearHer } from '../executive-onboarding/her-words';
import { aWorldForOnboarding, addFatima, ORG } from '../executive-onboarding/a-world-for-onboarding';
import { keepATeamMembersReply } from '../executive-onboarding/a-team-members-reply';
import { answerTheQuietBatches } from '../executive-onboarding/the-first-picture';
import { TeamLoopService } from './team-loop.service';
import type { TheTeamMind, WhatTheySaid, TheInstruction } from './the-team-mind';

export { ORG };

export const nothingSaid: WhatTheySaid = { kind: 'other', commitments: [], outcomes: [], blockers: [], answers: [], vague: null };

/** A model that reads what a test tells it to. `reading` is chosen by a word the text holds; anything else is "other" (the plain reading takes over when it returns null). */
export function aScriptedMind(a: { readings?: [string, Partial<WhatTheySaid> | null][]; instruction?: Partial<TheInstruction> | null; help?: string | null; narrate?: { says: string; from: string[] }[] | null; /** Which document shows a thing, as the model would say; by default none does. */ shows?: (a: { thing: string; documents: { id: string; text: string }[] }) => string | null } = {}): TheTeamMind & { saw: { text: string; openQuestions: string[] }[]; helped: string[]; helpWork: any[] } {
  const saw: { text: string; openQuestions: string[] }[] = [];
  const helped: string[] = [];
  const helpWork: any[] = [];
  return {
    saw, helped, helpWork,
    readTheirWords: async (x) => {
      saw.push({ text: x.text, openQuestions: x.work.openQuestions.map((q) => q.slug) });
      const hit = (a.readings ?? []).find(([word]) => x.text.includes(word));
      return hit ? (hit[1] === null ? null : { ...nothingSaid, ...hit[1] }) : null;
    },
    readAnInstruction: async () => (a.instruction === undefined ? null : a.instruction === null ? { kind: 'none', reportWeekday: null, matter: null, who: [] } : { kind: 'none', reportWeekday: null, matter: null, who: [], ...a.instruction }),
    helpThem: async (x) => { helped.push(x.message); helpWork.push(x.work); return a.help ?? null; },
    narrate: async () => a.narrate ?? null,
    whichShowsIt: async (x) => a.shows?.(x) ?? null,
  };
}

export async function aTeamLoopWorld(over: { mind?: TheTeamMind | null; now?: Date; engine?: any } = {}) {
  const now = over.now ?? new Date('2026-11-11T10:00:00Z');
  const w = aWorldForOnboarding(now);
  w.settings.whatsapp = 'accept';
  const t: any = w.t;
  t.commitment = aTable([], 'cm', { state: 'OPEN', statedAt: now, lastFollowedUpAt: null, waitingOn: null, provenBy: null, resolvedAt: null });
  /* The private history Ask keeps for a person: every read of it is counted, so a test can prove nothing on her side ever reads it. */
  const turns = aTable([], 'at');
  const reads = { assistantTurn: 0 };
  for (const m of ['findMany', 'findFirst', 'findUnique', 'count'] as const) { const real = (turns as any)[m]; (turns as any)[m] = async (...args: any[]) => { reads.assistantTurn += 1; return real(...args); }; }
  t.assistantTurn = turns;
  t.persistentJob = aTable([], 'pj');
  const prisma: any = new Proxy(w.prisma, { get: (target, name: string) => (name === 'withAdvisoryLock' ? (_k: number, fn: () => Promise<unknown>) => fn() : target[name]) });
  await addAnExecutive(prisma, w.ports, addFatima(w));
  const says = (userId: string, message: string) => hearHer(prisma, w.ports, { organizationId: ORG, userId, message, now: w.now });
  await says('u-fatima', 'My team is Amina Yusuf, amina@example.com and Ibrahim Sule, ibrahim@example.com, +234 803 555 0101.');
  await says('u-fatima', 'Yes');
  w.sent.length = 0;

  const mail = { sendTheRoutineMessageByEmail: async (to: string, subject: string, text: string) => { w.sent.push({ to, subject, text, channel: 'email', kind: 'routine' }); return 'sent' as const; }, sendTheIntroduction: async (to: string, subject: string, text: string, replyTo: string, sendKey: string) => { if (w.sent.some((m) => (m as any).sendKey === sendKey)) return 'suppressed' as const; w.sent.push({ to, subject, text, replyTo, channel: 'email', kind: 'once', ...({ sendKey } as any) }); return 'sent' as const; } };
  const chat = { sendFor: async (_o: string, phone: string, text: string, ctx: any) => { w.sent.push({ to: phone, text, channel: 'whatsapp', kind: ctx?.kind }); return { sent: true }; } };
  const engine: any = over.engine ?? { extract: async () => null };
  const service = new TeamLoopService(prisma, mail as any, chat as any, over.mind === undefined ? aScriptedMind() : over.mind ?? undefined, engine, undefined);
  /* The service falls back to the model client when no mind is given; a test that wants the plain reading passes one that returns null. */
  if (over.mind === null) (service as any).mind = aScriptedMind();

  const person = (email: string) => t.person.rows.find((p: any) => (p.email ?? '').toLowerCase() === email);
  const contact = (name: string) => t.outreachContact.rows.find((c: any) => c.name === name);

  /** A team member writes in (words, files); the batch goes quiet; the one answer is read. Returns what they read. */
  async function theyWrite(name: string, a: { words?: string; files?: { fileName: string; text: string }[]; at?: Date }): Promise<string | null> {
    const c = contact(name);
    const at = a.at ?? new Date(now.getTime());
    await keepATeamMembersReply(prisma, { transcriber: w.intake.transcriber, read: async (f: any) => ({ text: (a.files ?? []).find((x) => x.fileName === f.fileName)?.text ?? 'Contents' }) } as any, {
      organizationId: ORG, contact: c, fromAddress: c.email ?? c.phone, channel: 'email', providerId: null, subject: null, body: a.words ?? null, receivedAt: at,
      files: (a.files ?? []).map((f) => ({ fileName: f.fileName, mimeType: 'text/plain', bytes: Buffer.from(f.text) })), beyondTheLimit: 0, now: at,
    } as any);
    const later = new Date(at.getTime() + 4 * 60_000);
    const sentBefore = w.sent.length;
    await answerTheQuietBatches(prisma, { ...w.ports, theirCheckIn: (b: any) => service.theirCheckIn(b) } as any, later, async () => 'assistant+dangote-abuja@myground.work');
    const said = w.sent.slice(sentBefore).filter((m) => m.to === c.email || m.to === c.phone).map((m) => m.text);
    return said[0] ?? null;
  }

  return { w, t, prisma, service, says, person, contact, theyWrite, reads, now };
}
