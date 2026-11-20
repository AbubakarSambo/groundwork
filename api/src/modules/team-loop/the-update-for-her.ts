/**
 * WHAT FATIMA IS TOLD ABOUT HER TEAM'S WORK: THE EMAIL SHE ASKED FOR (Fatima, increment 6a; plan 11, 15 and 31).
 *
 * Built from the record only: each person's promises, what each waits on, and what was shown. Every sentence says where it came from ("in a message on
 * 12 November", "which shows it was done") or says plainly that it is not verified. It never reads what anybody said to the coach (the help in
 * help-the-team-member.ts is private), never counts messages, and never says anything about how any person is doing as a person: it says what was said,
 * what was shown and what is stuck, and who has not answered.
 *
 * The facts are written by code. The model may put them in a better order and words (the narrative seam, the-team-mind.ts narrate), but only with
 * sentences that name the facts they rest on, with no number the facts do not hold, and a sentence resting on something only said must still say so.
 * When the model gives nothing safe, the facts are told plainly, grouped by person. Either way it is the same facts.
 */
import { MONTHS } from '../year-end/the-year-end-content';
import { theThingOf, theThingWithItsDay } from './a-nudge-that-helps';
import { SOURCE, thePersonBehind } from './what-their-reply-says';
import { nameList } from './the-team-words';
import { theFactsToTell, theUpdateParagraphs } from './the-update-in-short';
import type { AFact, TheTeamMind } from './the-team-mind';

const day = (d: any) => { const x = new Date(d); return `${x.getUTCDate()} ${MONTHS[x.getUTCMonth()]}`; };
const firstOf = (n: string) => String(n ?? '').split(/\s+/)[0] || 'there';

export interface TheUpdateArgs {
  organizationId: string; principalUserId: string; first: string; contacts: any[]; since: Date; now: Date;
  lead: 'week' | 'ready' | 'partial'; forDay?: string; matter?: string | null; nobodyAnswered: (string | null)[];
}

/** The facts, by person, from the record. */
export async function theFactsAboutTheTeam(prisma: any, a: TheUpdateArgs): Promise<{ person: string; fact: AFact }[]> {
  const out: { person: string; fact: AFact }[] = [];
  let n = 0;
  const add = (person: string, says: string, unverified = false) => out.push({ person, fact: { id: `f${++n}`, says, unverified } });
  for (const c of a.contacts) {
    const first = firstOf(c.name);
    const person = await thePersonBehind(prisma, c);
    if (!person) continue;
    const rows: any[] = ((await prisma.commitment.findMany({ where: { organizationId: a.organizationId, personExternalId: person.externalId, source: SOURCE } })) ?? []).filter((m: any) => m.state !== 'DROPPED');
    for (const m of rows) {
      const thing = theThingOf(m.text);
      if (String(m.provenBy ?? '').startsWith('disputed:')) add(first, `A claim in what ${first} sent, “${thing}”, has been marked as not backed up, so I have not counted it as done.`, true);
      else if (m.state === 'KEPT') {
        const id = String(m.provenBy ?? '').startsWith('material:') ? String(m.provenBy).slice(9) : null;
        const doc: any = id ? await prisma.principalMaterial.findFirst({ where: { id, fromUserId: { startsWith: 'contact:' } } }) : null;
        if (doc) add(first, `${first} sent “${doc.fileName}” as the proof for “${thing}”, and it is counted as done.`);
        else add(first, `${first} says ${thing} is done, but nothing shows it yet, so I have not counted it as done.`, true);
      } else if (m.waitingOn) add(first, `${first} said they will ${theThingWithItsDay(thing, m.dueSaid ?? null)}, and that depends on ${m.waitingOn}, in a message on ${day(m.statedAt ?? m.createdAt)}.`);
      else add(first, `${first} said they will ${theThingWithItsDay(thing, m.dueSaid ?? null)}, in a message on ${day(m.statedAt ?? m.createdAt)}.`);
    }
    if (!rows.length) {
      const sent: any[] = (await prisma.principalMaterial.findMany({ where: { principalUserId: a.principalUserId, fromUserId: `contact:${c.id}` } })) ?? [];
      if (sent.some((s) => new Date(s.receivedAt).getTime() >= a.since.getTime())) add(first, `${first} replied, and nothing in it adds a promise or a result to what I already have.`);
    }
  }
  return out;
}

export async function theUpdateForHer(prisma: any, mind: TheTeamMind | null | undefined, a: TheUpdateArgs): Promise<string> {
  const facts = await theFactsAboutTheTeam(prisma, a);
  const quiet = a.nobodyAnswered.filter((x): x is string => !!x).map(firstOf);
  const opening = a.lead === 'ready'
    ? `${a.first}, the team has answered${a.matter ? ` about ${a.matter}` : ''}. Here is where things stand.`
    : a.lead === 'partial'
      ? `${a.first}, not everybody has answered${a.matter ? ` about ${a.matter}` : ''} yet, but here is where things stand.`
      : `${a.first}, here is what your team has told me since I asked on ${day(a.since)}${a.forDay ? ' for ' + day(a.forDay) : ''}.`;
  const paragraphs: string[] = [opening];
  /* A long list is not told line by line: the most that matter are told, and the rest are counted (the-update-in-short.ts). */
  const { shown, left } = theFactsToTell(facts);
  const narrated = shown.length ? await mind?.narrate({ facts: shown.map((f) => f.fact) }).catch(() => null) : null;
  if (facts.length) paragraphs.push(...theUpdateParagraphs(shown, left, narrated));
  else paragraphs.push('Nobody has told me anything I can add yet.');
  if (quiet.length) paragraphs.push(`I have had no new message from ${nameList(quiet)} since I asked.`);
  if (facts.length) paragraphs.push(facts.some((f) => f.fact.unverified) ? 'Everything above comes from what they sent me. Where it is only what somebody said, I have said so.' : 'Everything above comes from what they sent me.');
  return paragraphs.join('\n\n');
}
