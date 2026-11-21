import { aTeamLoopWorld } from './a-world-for-the-team-loop';
import { theUpdateForHer } from './the-update-for-her';
import { theTeamSheMayAsk } from './standing-instructions';

/**
 * DANGOTE STRESS TEST, D12: Fatima's team summary said "I have had no new message from ... Ruth ... Oluwaseun ..." although both wrote corrections that afternoon,
 * Bilkisu was in the replied and the not-replied lists, and the lines it gave were the year's old promises. Who has not answered is now read from the same record as
 * who has (what each person sent since the ask went), an ask whose message has not gone is said as that, and only what was said since the ask is told.
 */
describe('who answered, and who did not, in the summary she reads', () => {
  it('reads each person once, from what they sent since the message to them went', async () => {
    const x = await aTeamLoopWorld({ mind: null });
    const contacts = await theTeamSheMayAsk(x.prisma, 'u-fatima');
    const amina = contacts.find((c: any) => c.name === 'Amina Yusuf')!;
    const ibrahim = contacts.find((c: any) => c.name === 'Ibrahim Sule')!;
    const askedAt = new Date(x.now.getTime() - 6 * 3_600_000);
    /* Amina wrote a correction this afternoon, after she was asked; Ibrahim has sent nothing since. */
    await x.t.principalMaterial.create({ data: { organizationId: 'org-1', principalUserId: 'u-fatima', batchId: 'b-1', fromUserId: `contact:${amina.id}`, kind: 'message', fileName: 'message:1', text: 'Correction. Please use 5, not 7.', state: 'kept', receivedAt: new Date(x.now.getTime() - 3_600_000) } });
    /* An old promise from January is not news in this summary. */
    await x.t.commitment.create({ data: { organizationId: 'org-1', personExternalId: 'p-ibrahim', text: 'I will send the January letters', dueSaid: null, dueAt: null, state: 'OPEN', source: 'team_reply', statedAt: new Date('2026-01-15T10:00:00Z') } });
    const asks = [
      { askedOfEmail: amina.contactKey, askedOfName: amina.name, state: 'asked', askedAt },
      { askedOfEmail: ibrahim.contactKey, askedOfName: ibrahim.name, state: 'asked', askedAt },
    ];
    const email = await theUpdateForHer(x.prisma, null, { organizationId: 'org-1', principalUserId: 'u-fatima', first: 'Fatima', contacts, since: askedAt, now: x.now, lead: 'week', asks });
    console.log(`WHAT FATIMA READS\n${email}`);
    expect(email).toContain('I have had no new message from Ibrahim since I asked.');
    expect(email).not.toMatch(/no new message from[^.]*Amina/);
    expect(email).toContain('Amina replied, and nothing in it adds a promise or a result to what I already have.');
    expect(email).not.toContain('January letters');
  });

  it('a person whose message has not gone yet was not asked, and is never told as silent', async () => {
    const x = await aTeamLoopWorld({ mind: null });
    const contacts = await theTeamSheMayAsk(x.prisma, 'u-fatima');
    const ibrahim = contacts.find((c: any) => c.name === 'Ibrahim Sule')!;
    const email = await theUpdateForHer(x.prisma, null, { organizationId: 'org-1', principalUserId: 'u-fatima', first: 'Fatima', contacts, since: x.now, now: x.now, lead: 'week', asks: [{ askedOfEmail: ibrahim.contactKey, askedOfName: ibrahim.name, state: 'queued', askedAt: null }] });
    console.log(`WHAT FATIMA READS\n${email}`);
    expect(email).toContain('My message to Ibrahim has not gone out yet, so I have not asked them yet.');
    expect(email).not.toContain('no new message from');
  });
});
