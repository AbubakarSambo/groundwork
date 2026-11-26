/**
 * WHAT SOMEBODY WHO ACTS FOR A SENIOR PERSON CAN ACT ON, as Today reads it (Ebele round 2, D3). The assistant's web screens showed nothing about the people she acts
 * for, so a delegate who signed in saw her own empty Today. For each principal she acts for, there is one row: whose it is, how many matters are outstanding, what
 * waits for the principal's decision, and where the year-end draft stands.
 *
 * THE LIMIT IS THE ONE THAT ALREADY HOLDS. The words come from the register built for a delegate (`forADelegate: true`, so the principal's private to-do list is never
 * read) and from the same plain-words functions the assistant uses in chat (the-register-in-plain-words.ts), so Today and Ask cannot disagree. Only a live grant
 * counts (`whoThisPersonActsFor`): somebody whose grant was revoked has no rows. Nothing here is wider than what the delegate could already be told in Ask.
 */
import { buildTheRegister } from './the-outstanding-register';
import { whatIsOutstandingSaid, whatNeedsTheDecisionSaid } from './the-register-in-plain-words';
import { whoThisPersonActsFor } from './a-delegate-acts-for-a-principal';
import { latestDraft } from '../year-end/the-year-end-versions';

export interface AMatterTheyActOn {
  key: string;
  kind: 'decide' | 'look';
  title: string;
  detail: string | null;
  action: { label: string; to: string };
  groundId: string;
  organizationId: string;
}

const SHOWN = 3;

export const theDraftIsAt = (first: string, d: { version: number; status: string } | null): string =>
  !d ? 'There is no year-end draft yet.'
    : d.status === 'approved' ? `Version ${d.version} of the year-end draft is approved, and the final files are on their way.`
      : d.status === 'final' ? `Version ${d.version} of the year-end report is final.`
        : `The year-end draft is version ${d.version}, and it is waiting for ${first}'s approval. You can ask for changes, and only ${first} can approve it.`;

const count = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
/** The draft's place in one clause, for the one short line. */
export const theDraftIsAtShort = (first: string, d: { version: number; status: string }): string =>
  d.status === 'approved' ? `version ${d.version} of the year-end draft is approved` : d.status === 'final' ? `version ${d.version} of the year-end report is final` : `version ${d.version} of the year-end draft waits for ${first}'s approval`;

export async function theMattersSheActsOn(prisma: any, a: { organizationId: string; userId: string; now: Date }): Promise<AMatterTheyActOn[]> {
  const grants = await whoThisPersonActsFor(prisma, a.organizationId, a.userId);
  const out: AMatterTheyActOn[] = [];
  const quiet: { name: string; first: string; groundId: string }[] = [];
  for (const g of grants) {
    const who: any = await prisma.user?.findUnique?.({ where: { id: g.principalUserId }, select: { firstName: true, lastName: true } }).catch(() => null);
    const first = who?.firstName ?? 'the person you act for';
    const name = [who?.firstName, who?.lastName].filter(Boolean).join(' ') || first;
    const register = await buildTheRegister(prisma, { organizationId: a.organizationId, principalUserId: g.principalUserId, now: a.now, forADelegate: true });
    const view = { forName: first, now: a.now };
    const lines = whatIsOutstandingSaid(register, view).split('\n');
    const open = register.rows.filter((r) => r.status !== 'completed' && r.status !== 'cancelled').length;
    const waiting = register.rows.filter((r) => r.status === 'awaiting decision' && r.decision).length;
    const decisions = register.rows.some((r) => r.status === 'awaiting decision' && r.decision) ? whatNeedsTheDecisionSaid(register, view).split('\n').slice(0, 2) : [];
    const draft = await latestDraft(prisma, { organizationId: a.organizationId, principalUserId: g.principalUserId, year: a.now.getUTCFullYear() }).catch(() => null);
    /* A person with nothing open and no draft is not a row of her own: they are named together in one line after the others (Ebele round 11). */
    if (!register.rows.some((r) => r.status !== 'completed' && r.status !== 'cancelled') && !draft) { quiet.push({ name, first, groundId: g.principalUserId }); continue; }
    out.push({
      key: `acts-for-${g.principalUserId}`,
      kind: decisions.length ? 'decide' : 'look',
      /* One short line for each person: how many matters are open, how many wait for the decision, and where the draft stands. The list itself is one question away, in Ask (Ebele round 13). */
      title: `You act for ${name}.`,
      detail: `${count(open, 'matter is', 'matters are')} open${waiting ? `, ${waiting} ${waiting === 1 ? 'needs' : 'need'} ${first}'s decision,` : ''}${draft ? ` and ${theDraftIsAtShort(first, draft)}` : ''}.`.replace(/,\.$/, '.').replace(/ open,? and /, ' open and '),
      action: { label: `Ask about ${first}'s matters`, to: '/chat' },
      groundId: '',
      organizationId: a.organizationId,
    });
  }
  if (quiet.length) {
    const names = quiet.map((q) => q.name);
    out.push({
      key: 'acts-for-nothing-open', kind: 'look',
      title: `Nothing is open for ${names.length === 1 ? names[0] : `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`}.`,
      detail: null, action: { label: `Ask about ${quiet[0].first}'s matters`, to: '/chat' }, groundId: '', organizationId: a.organizationId,
    });
  }
  return out;
}

/**
 * HER OWN DECISIONS ON HER OWN TODAY (Halden stress test, D5: Ask said "150 things need your decision", her assistant's Today said 141, and her own Today said
 * "Nothing needs you right now"). For somebody whose work Groundwork keeps (she has a year-end job), the decisions are read from the same register and the same
 * words as Ask's "What needs my decision?", so the number cannot differ. Nothing for anybody else, and nothing when there is no decision.
 */
export async function herOwnDecisions(prisma: any, a: { organizationId: string; userId: string; now: Date }): Promise<AMatterTheyActOn[]> {
  const job = await Promise.resolve(prisma.persistentJob?.findFirst?.({ where: { organizationId: a.organizationId, principalUserId: a.userId, kind: 'annual_report' }, select: { id: true } })).catch(() => null);
  if (!job) return [];
  const register = await buildTheRegister(prisma, { organizationId: a.organizationId, principalUserId: a.userId, now: a.now, forADelegate: false });
  if (!register.rows.some((r) => r.status === 'awaiting decision' && r.decision)) return [];
  const [title, ...rest] = whatNeedsTheDecisionSaid(register, { forName: null, now: a.now }).split('\n');
  return [{ key: 'her-own-decisions', kind: 'decide', title, detail: rest.slice(0, 1).join(' ') || null, action: { label: 'Ask about your decisions', to: '/chat' }, groundId: '', organizationId: a.organizationId }];
}
