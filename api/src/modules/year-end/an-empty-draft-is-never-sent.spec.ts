import { aYearEndWorld } from './a-world-for-the-year-end';
import { actOnTheJobs } from './the-year-end-owner';
import { advanceThePersistentJobs, ensureThePrincipalsJobs } from '../outstanding/the-persistent-jobs';
import { aTable } from '../outstanding/an-organisation-for-an-executive';

/**
 * RELEASE TEST OF 21 NOVEMBER, BUG 92. Halima was added by an admin, introduced, and one minute later sent "Your year-end report and presentation are
 * ready for review" with nothing in it: "Nothing has been promised, paid or approved on Halima's record for 2026 yet ... Nothing has been forwarded for
 * January, February, March, April, May, June, July, August, September and October." A draft made on its own is made only when it has something to say.
 */
const NOW = new Date('2026-11-21T09:00:00Z');
const KEEP = new Set(['user', 'person', 'organization', 'organizationMembership', 'ground', 'groundParticipant', 'persistentJob', 'yearEndDraft', 'yearEndLog', 'yearEndRecipient', 'informationGap', 'principalSetup']);

function aNewSeniorPerson() {
  const w = aYearEndWorld(NOW);
  /* Nothing on her record yet: no promise, no payment, no note, no report. Only the file that came with her introduction, which is not a monthly note. */
  for (const [name, table] of Object.entries(w.t as Record<string, any>)) if (!KEEP.has(name) && Array.isArray(table?.rows)) table.rows.length = 0;
  for (const g of w.t.ground.rows) g.initiatorId = 'someone-else';
  w.t.principalMaterial = w.t.principalMaterial ?? aTable([], 'pm');
  w.t.principalMaterial.rows.push({ id: 'pm-1', organizationId: w.ORG, principalUserId: 'u-fatima', batchId: 'b1', fromUserId: 'u-fatima', fromAddress: 'fatima@example.com', channel: 'email', kind: 'file', fileName: 'signature.png', mimeType: 'image/png', state: 'kept', text: null, subject: null, receivedAt: NOW });
  return w;
}

describe('a year-end draft with nothing in it is never made on its own, so never sent', () => {
  it('right after she is added, nothing is mailed as ready for review, and no draft is written', async () => {
    const w = aNewSeniorPerson();
    await ensureThePrincipalsJobs(w.prisma, { organizationId: w.ORG, principalUserId: 'u-fatima', now: NOW });
    const later = new Date(NOW.getTime() + 60_000);
    await advanceThePersistentJobs(w.prisma, later);
    const done = await actOnTheJobs(w.prisma, w.ports, later);
    console.log(`WHAT SHE IS SENT\n${[...w.mails.map((m: any) => `${m.subject}\n${m.text ?? ''}`), ...w.whatsapps.map((x: any) => x.text)].join('\n\n') || '(nothing)'}`);
    expect(done.map((d) => d.action)).not.toContain('draft_ready');
    expect(w.t.yearEndDraft.rows).toHaveLength(0);
    expect(w.mails.filter((m: any) => /ready for review/.test(m.subject ?? ''))).toEqual([]);
    expect(JSON.stringify([w.mails, w.whatsapps])).not.toMatch(/Nothing has been promised, paid or approved/);
  });
});
