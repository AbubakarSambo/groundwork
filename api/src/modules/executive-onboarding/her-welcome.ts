/**
 * A HELLO FROM HER IS MET BY AN ASSISTANT THAT KNOWS HER OFFICE (Batch D, R7, D6).
 *
 * Ebele's first words on the web, "Good morning. Kabiru said you will help my office this year.", read "I cannot answer that one yet. Here is what I
 * can do with ...", and the old menu. An assistant her administrator set up for her knows who set it up, for which office, what it is keeping for her,
 * who acts for her and how many of her people it may write to. That is what she is told, from the record of her setup, in plain sentences. Whether her
 * words are a hello is the model's reading in Ask; this only writes what is true. No model is run here, and nothing is sent or written.
 */
import { theOffice } from './the-introductions';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const onTheDay = (d: Date | string) => { const x = new Date(d); return `${x.getUTCDate()} ${MONTHS[x.getUTCMonth()]}`; };
const list = (xs: string[]) => (xs.length <= 1 ? xs.join('') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`);

/** The welcome, for a senior person an admin set up. Null for anybody else, so their hello is answered as before. */
export async function aWelcomeThatKnowsHerOffice(prisma: any, a: { organizationId: string; userId: string }): Promise<string | null> {
  const setup: any = await Promise.resolve(prisma.principalSetup?.findFirst?.({ where: { organizationId: a.organizationId, principalUserId: a.userId } })).catch(() => null);
  if (!setup) return null;
  const [me, admin, jobs, delegates, people, draft]: any[] = await Promise.all([
    Promise.resolve(prisma.user?.findUnique?.({ where: { id: a.userId }, select: { firstName: true } })).catch(() => null),
    setup.addedByUserId ? Promise.resolve(prisma.user?.findUnique?.({ where: { id: setup.addedByUserId }, select: { firstName: true, lastName: true } })).catch(() => null) : null,
    Promise.resolve(prisma.persistentJob?.findMany?.({ where: { organizationId: a.organizationId, principalUserId: a.userId, kind: { in: ['annual_report', 'outstanding_register'] } }, select: { title: true } })).catch(() => []),
    Promise.resolve(prisma.delegate?.findMany?.({ where: { organizationId: a.organizationId, principalUserId: a.userId, revokedAt: null }, select: { delegateName: true } })).catch(() => []),
    Promise.resolve(prisma.outreachContact?.count?.({ where: { principalUserId: a.userId, state: 'introduced' } })).catch(() => 0),
    Promise.resolve(prisma.yearEndDraft?.findFirst?.({ where: { organizationId: a.organizationId, principalUserId: a.userId }, orderBy: { version: 'desc' }, select: { version: true, status: true } })).catch(() => null),
  ]);
  const first = me?.firstName ?? 'there';
  const office = theOffice(setup.preferences?.officeName);
  const by = admin?.firstName ? `${admin.firstName}` : 'your administrator';
  const titles = ((jobs ?? []) as any[]).map((j) => j.title).filter(Boolean).map((t: string) => `“${t}”`);
  const acting = ((delegates ?? []) as any[]).map((d) => d.delegateName).filter(Boolean);
  const n = Number(people) || 0;
  const out: string[] = [`Hello, ${first}. Yes, I am the assistant ${by} set up for ${office} on ${onTheDay(setup.createdAt)}.`];
  if (titles.length) out.push(`I am keeping ${titles.length === 1 ? 'one piece' : `${titles.length === 2 ? 'two' : titles.length} pieces`} of work for you, ${list(titles)}.`);
  if (draft) out.push(`Version ${draft.version} of your year-end report is ${draft.status === 'final' ? 'final' : draft.status === 'approved' ? 'approved' : 'ready for you to read'}.`);
  if (acting.length) out.push(`${list(acting)} can act for you.`);
  out.push(n ? `I can write to the ${n === 1 ? 'one person' : `${n} people`} you work with whenever you ask, and I will not write to anyone else without your yes.` : 'When you tell me who works with you, I can write to them for you, and only on your yes.');
  out.push('Forward me emails, documents, spreadsheets or voice notes about your office’s work, and I will put them together and ask for what is missing. What would you like to start with?');
  return out.join(' ');
}
