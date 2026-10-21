import { FC } from './the-final-check-bed';
import { theDealsThePromisesAreAbout } from './the-deal-a-promise-is-about';
import { whatHappensNext } from './what-happens-next-to-a-record';
import { theDayTheyMeant } from '../grounds/when-a-handoff-is-due';

/**
 * KEVIN'S NEXT STEPS REACH HIS DEALS (final real-model check, coordinator's follow-up). From the run's own rows: Kevin's promises "I'll follow
 * up with him" (on Monday) and "I'll send Paul a follow-up email" (by end of day today) named no deal, so Ngong Road Minimart and Upper Hill
 * Offices read "Nothing booked" and his My work said "2 of your 2 open deals have no next step with a day".
 */
const D = FC.drop;
const kevin = D.participants.find((p: any) => p.user?.firstName === 'Kevin').id;
const promises = D.commitments.filter((c: any) => c.participantId === kevin && c.status === 'UNKNOWN');
const whose = new Map(D.checkIns.map((c: any) => [c.id, c.participantId]));
const turns = D.turns.map((t: any) => ({ checkInId: t.checkInId, participantId: whose.get(t.checkInId) ?? null, role: t.role, content: t.content, createdAt: t.createdAt }));
const deals = D.items.filter((i: any) => i.kind === 'deal').map((i: any) => ({ name: i.name, ownerParticipantId: i.ownerParticipantId }));

describe('the deal a promise is about', () => {
  it('reads Ngong Road Minimart and Upper Hill Offices from the questions Kevin answered', () => {
    const about = theDealsThePromisesAreAbout(promises, turns, deals);
    const of = (t: RegExp) => about.get(promises.find((c: any) => t.test(c.text)).id);
    expect(of(/follow up with him/)).toBe('Ngong Road Minimart');
    expect(of(/send Paul/)).toBe('Upper Hill Offices');
  });
  it('so each deal row says the next step with its day, and the day can be read', () => {
    const about = theDealsThePromisesAreAbout(promises, turns, deals);
    const open = promises.map((c: any) => ({ ...c, about: about.get(c.id) ?? null }));
    const ngong = whatHappensNext({ name: 'Ngong Road Minimart' }, open, () => 'Kevin');
    expect(ngong.next).toBe('Kevin committed to follow up with him on Monday.');
    expect(theDayTheyMeant(String(ngong.nextStep), new Date('2026-10-14T11:02:00Z'))).not.toBeNull();
    const upper = whatHappensNext({ name: 'Upper Hill Offices' }, open, () => 'Kevin');
    expect(upper.next).toMatch(/^Kevin committed to /);
    expect(upper.next).not.toBe('Kevin committed to follow up to understand their needs this week.');
  });
});

describe('planning ahead on My work', () => {
  it('counts no deal that cannot buy now, and keeps a deal’s own dated step', async () => {
    const { myWorkFrom } = await import('./my-work');
    const row = (name: string, more: Record<string, any>) => ({ id: name, kind: 'deal', name, stage: 'Contacted', group: 'contacted', ownerParticipantId: 'p-mercy', fields: {}, ...more });
    const page: any = myWorkFrom({
      reader: 'self', person: { participantId: 'p-mercy', name: 'Mercy Wairimu', firstName: 'Mercy' }, leadFirst: 'Grace', kindOfWork: 'sales team',
      items: [
        row('Greenfield Supermarket', { next: 'Call Mrs. Achola first thing tomorrow' }),
        row('Ngong Road Minimart', { next: 'Follow up with him on Monday' }),
        row('the school lead', { fields: { 'Budget stated': "They wouldn't have the budget until January" } }),
        row('Sunrise Primary School', { fields: { 'Budget stated': 'no budget this year' }, next: 'Follow up with them early next year, maybe January' }),
      ] as any,
      commitments: [], waitsOnThem: [], raised: [], credits: [], checkIns: [], ownLines: [], patterns: [], teamCoaching: [], helpWith: null,
      target: null, now: new Date('2026-10-16T14:30:00Z'), timeZone: 'Africa/Nairobi',
    } as any, 'Sales team, Q4');
    expect(page.performing.behaviours.find((b: any) => b.key === 'planning-ahead')).toMatchObject({ verdict: 'Strength', happened: 'Every open deal you have has a next step and a day.' });
  });
});
