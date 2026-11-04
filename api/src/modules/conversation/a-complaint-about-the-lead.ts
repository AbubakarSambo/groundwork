import { readDuties } from '../suites/who-holds-each-duty';
import { theAssessmentIn, type TheAssessment } from './the-assessment';

/**
 * A COMPLAINT ABOUT THE LEAD GOES TO SOMEBODY ELSE, AND THE PERSON IS TOLD WHO (Hafsah, 3 November 2026, word for word: "A team
 * member's complaint about their lead is never shown to that lead anywhere they read; it goes privately to an admin, or HR where there
 * is one (and to someone else when the HR person is the lead, as in Joyce and Daniel's case), and the person is told exactly who will
 * see it.")
 *
 * WHO HEARS IT. Whoever the organisation says looks after HR (its duties, suites/who-holds-each-duty.ts), unless that is the lead or the
 * person complaining. Otherwise every admin of the organisation who is neither. When there is nobody, nobody else sees it, and the
 * person is told so plainly.
 *
 * HOW IT IS KEPT FROM THE LEAD. The conversation's assessment reads a complaint by its meaning and sets it aside, with everything read
 * from the same messages, before anything reads the assessment (withWhatIsAboutTheLeadSetAside); the one reader of the facts serves it
 * only to the person and whoever hears it (the-facts-on-record.ts). This file decides who, and writes what each of them reads.
 */
export interface SomeoneWhoHearsIt {
  userId: string;
  name: string;
  firstName: string;
  email: string | null;
  holds: 'HR' | 'an admin';
}

const nameOf = (u: { firstName?: string | null; lastName?: string | null }) => [u.firstName, u.lastName].map((x) => (x ?? '').trim()).filter(Boolean).join(' ');

export async function whoHearsAComplaintAbout(
  prisma: any,
  input: { organizationId: string; leadUserId: string; personUserId: string | null },
): Promise<SomeoneWhoHearsIt[]> {
  const notThem = (id: string | null | undefined): id is string => !!id && id !== input.leadUserId && id !== input.personUserId;
  const people = async (ids: string[], holds: SomeoneWhoHearsIt['holds']) => (((await Promise.resolve(prisma.user?.findMany?.({
    where: { id: { in: ids }, deletedAt: null }, select: { id: true, firstName: true, lastName: true, email: true },
  })).catch(() => [])) ?? []) as any[])
    .map((u) => ({ userId: String(u.id), name: nameOf(u), firstName: String(u.firstName ?? '').trim(), email: u.email ?? null, holds }))
    .filter((p) => p.name)
    .sort((a, b) => a.name.localeCompare(b.name));
  const hr = (await readDuties(prisma, input.organizationId).catch(() => ({} as { hr?: string }))).hr;
  if (notThem(hr)) {
    const found = await people([hr], 'HR');
    if (found.length) return found;
  }
  const admins = (((await Promise.resolve(prisma.organizationMembership?.findMany?.({
    where: { organizationId: input.organizationId, role: 'ADMIN' }, select: { userId: true },
  })).catch(() => [])) ?? []) as any[]).map((m) => String(m.userId)).filter(notThem);
  return admins.length ? people([...new Set(admins)], 'an admin') : [];
}

const listed = (names: string[]) => (names.length < 2 ? names.join('') : `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`);

/** Who will see it, in one or two plain sentences, as the person is told it: the lead by first name, whoever hears it by full name. */
export function whoWillSeeIt(leadFirstName: string, people: SomeoneWhoHearsIt[], organisation: string | null): string {
  const lead = leadFirstName.trim() || 'Your lead';
  const where = organisation?.trim() || 'your organisation';
  if (!people.length) {
    return `${lead} will not see this. There is nobody else in ${where} who can look at a complaint about ${lead} yet, so for now nobody else will see it either.`;
  }
  if (people[0].holds === 'HR') return `${lead} will not see this. ${people[0].name}, who looks after HR, will see it, and nobody else will.`;
  if (people.length === 1) return `${lead} will not see this. ${people[0].name}, an admin of ${where}, will see it, and nobody else will.`;
  return `${lead} will not see this. ${listed(people.map((p) => p.name))}, the admins of ${where}, will see it, and nobody else will.`;
}

/**
 * WHAT THE CONVERSATION IS TOLD, for somebody who is not the lead. The model decides by meaning whether they are complaining about the
 * lead; the words it says about who sees it are written here, so the names are right.
 */
export function aComplaintAboutTheLeadBlock(leadFullName: string, leadFirstName: string, sentence: string): string {
  const lead = leadFirstName.trim() || leadFullName.trim();
  return [
    `IF THEY COMPLAIN ABOUT ${leadFullName.toUpperCase()}, WHO LEADS THIS CHECK-IN.`,
    `A complaint is anything they say against how ${lead} treats them, leads them, speaks to them or behaves. Read it by what they mean, in any words or language. Waiting on ${lead} for a piece of work, or disagreeing about the work, is not a complaint.`,
    `When they make one, take it seriously and say this once, in your next reply, in these words: "${sentence}" Then carry on with them as before. Do not ask them to repeat it, do not defend ${lead}, and do not say it again later in this conversation.`,
  ].join('\n');
}

/** The email to each person who hears it. Their words, who said them, about whom, in which check-in, and why it comes to them. */
export function theComplaintAsTheyReadIt(
  to: SomeoneWhoHearsIt,
  about: { personName: string; leadName: string; checkIn: string | null; on: string | null; organisation: string | null },
  words: string[],
): { subject: string; lines: string[] } {
  const person = about.personName;
  const firstOf = (n: string) => n.split(/\s+/)[0] || n;
  const inWhat = about.checkIn ? ` in their check-in for "${about.checkIn}"` : ' in their check-in';
  const when = about.on ? ` on ${about.on}` : '';
  const why = to.holds === 'HR' ? 'It comes to you because you look after HR.' : `It comes to you because you are an admin of ${about.organisation?.trim() || 'the organisation'}.`;
  return {
    subject: `${person} has made a complaint about ${about.leadName}`,
    lines: [
      `Hello ${to.firstName || to.name},`,
      `${person} said this about ${about.leadName}${inWhat}${when}. ${why}`,
      ...words.map((w) => `“${w}”`),
      `You may want to speak to ${firstOf(person)} about it.`,
    ],
  };
}

/** The words of a complaint kept from the lead, in the order they were said. Only the complaint itself, not what came with it. */
export function theComplaintsWords(a: TheAssessment | null): string[] {
  return (a?.keptFromTheLead?.items ?? []).filter((i) => i.readAs === 'aboutTheLead').map((i) => i.words.trim()).filter(Boolean);
}

/** Read from a stored column, for a listener that has only the check-in. */
export const theComplaintsWordsIn = (column: unknown) => theComplaintsWords(theAssessmentIn(column));
