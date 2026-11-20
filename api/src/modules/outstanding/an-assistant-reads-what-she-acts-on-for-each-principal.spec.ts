import { anOrganisationForAnExecutive, aTable, ORG } from './an-organisation-for-an-executive';
import { grantADelegate, revokeADelegate } from './a-delegate-acts-for-a-principal';
import { theMattersSheActsOn } from './what-an-assistant-acts-on';

/**
 * FATIMA ROUND 2, D3: the assistant's web screens showed nothing about the people she acts for. Today now has one row for each person she acts for, in plain
 * sentences that say whose it is, and it reads only what a delegate may read: no private to-do list, nothing from another lead's check-ins, nothing once the grant is gone.
 */
const NOW = new Date('2026-11-10T09:00:00Z');

async function aDelegateWorld() {
  const o = anOrganisationForAnExecutive(NOW);
  (o.tables as any).yearEndDraft = aTable([], 'yd');
  await grantADelegate(o.prisma, { organizationId: ORG, principalUserId: 'u-fatima', delegateEmail: 'amina@example.com', delegateName: 'Amina Yusuf', delegateUserId: 'u-amina', via: 'chat' });
  return o;
}

describe('what a person who acts for somebody reads on Today', () => {
  it('one row for the person she acts for: whose it is, what is outstanding, what waits for a decision, and where the draft is', async () => {
    const o = await aDelegateWorld();
    const rows = await theMattersSheActsOn(o.prisma, { organizationId: ORG, userId: 'u-amina', now: NOW });
    expect(rows).toHaveLength(1);
    const r = rows[0];
    console.log(`WHAT THE ASSISTANT READS ON TODAY\n${r.title}\n${r.detail}`);
    /* Round 13: one short line for each person, the title says whose it is and the line says how many are open. */
    expect(r.title).toBe('You act for Fatima Bello.');
    expect(r.detail).toMatch(/^\d+ matters? (?:is|are) open/);
    expect(r.action).toEqual({ label: "Ask about Fatima's matters", to: '/chat' });
    expect(`${r.title} ${r.detail}`).not.toMatch(/\b(she|he|her|his|him)\b/i);
  });

  it('says where the year-end draft stands, and that only the principal can approve it', async () => {
    const o = await aDelegateWorld();
    (o.tables as any).yearEndDraft.rows.push({ id: 'd1', organizationId: ORG, principalUserId: 'u-fatima', year: 2026, version: 2, status: 'revised', content: {}, createdAt: NOW });
    const [r] = await theMattersSheActsOn(o.prisma, { organizationId: ORG, userId: 'u-amina', now: NOW });
    expect(r.detail).toContain("version 2 of the year-end draft waits for Fatima's approval");
  });

  it('never carries the principal\'s private to-do list, or another lead\'s confidential matter', async () => {
    const o = await aDelegateWorld();
    const [r] = await theMattersSheActsOn(o.prisma, { organizationId: ORG, userId: 'u-amina', now: NOW });
    expect(`${r.title} ${r.detail}`).not.toMatch(/retirement|severance/i);
  });

  it('is empty for somebody who acts for nobody, and for a delegate whose grant was ended', async () => {
    const o = await aDelegateWorld();
    expect(await theMattersSheActsOn(o.prisma, { organizationId: ORG, userId: 'u-ibrahim', now: NOW })).toEqual([]);
    await revokeADelegate(o.prisma, { organizationId: ORG, principalUserId: 'u-fatima', delegateEmail: 'amina@example.com', via: 'chat' } as any);
    expect(await theMattersSheActsOn(o.prisma, { organizationId: ORG, userId: 'u-amina', now: NOW })).toEqual([]);
  });
});
