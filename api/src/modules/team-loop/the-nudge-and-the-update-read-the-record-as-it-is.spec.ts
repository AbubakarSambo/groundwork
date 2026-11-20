import { aScriptedMind, aTeamLoopWorld } from './a-world-for-the-team-loop';
import { nudgeWhereItHelps, theThingWithItsDay } from './a-nudge-that-helps';
import { whatIsOutstandingSaid } from '../outstanding/the-register-in-plain-words';
import { buildTheRegister } from '../outstanding/the-outstanding-register';

/**
 * Fatima round 1: H2 (a proof must show the thing it is said to prove), I-10 and I-12 (counts, and nudge sentences), and the approver nudge
 * (a promise that waits on an approver is not chased from its owner). Every text a person reads is printed so it can be judged.
 */
const DAY = 86_400_000;
const ports = (sent: { to: string; text: string }[]) => ({ whatsapp: { send: async (a: any) => { sent.push({ to: a.phone, text: a.text }); return { sent: true }; } }, email: { send: async (a: any) => { sent.push({ to: a.to, text: a.text }); return 'sent'; } } });

describe('a document that arrives with a claim does not prove it', () => {
  it('Hauwa says the payment was made and sends the tracker: it stays only said, and the weekly update does not say the record shows it', async () => {
    const mind = aScriptedMind({ readings: [['payment has been made', { kind: 'update', outcomes: [{ commitmentId: null, text: 'The payment has been made' }] }]], shows: () => null });
    const x = await aTeamLoopWorld({ mind });
    await x.theyWrite('Ibrahim Sule', { words: 'The payment has been made.', files: [{ fileName: 'tracker.txt', text: 'Payments tracker. Sahel Print, NGN 4,850,000, pending approval.' }] });
    const row = x.t.commitment.rows.find((c: any) => /payment has been made/.test(c.text));
    expect(row.state).toBe('KEPT');
    expect(row.provenBy).toBeNull();
    const reg = await buildTheRegister(x.prisma, { organizationId: 'org-1', principalUserId: 'u-fatima', now: x.now, forADelegate: false });
    const said = whatIsOutstandingSaid(reg, { forName: null, now: x.now });
    console.log(`WHAT FATIMA READS\n${said}`);
    expect(reg.rows.find((r) => /payment has been made/.test(r.item))?.status).toBe('unverified');
    expect(said).toMatch(/nothing shows it yet/);
  });
});

describe('what is outstanding counts the lines it reads out', () => {
  it('the number is the number of lines on the list, and the rest is said as "more"', async () => {
    const x = await aTeamLoopWorld();
    for (let i = 1; i <= 10; i += 1) await x.t.commitment.create({ data: { organizationId: 'org-1', personExternalId: 'p-amina', text: `I will send letter ${i}`, dueSaid: null, dueAt: null, state: i > 7 ? 'KEPT' : 'OPEN', source: 'team_reply', statedAt: x.now } });
    const person = x.person('amina@example.com');
    for (const c of x.t.commitment.rows) c.personExternalId = person.externalId;
    const reg = await buildTheRegister(x.prisma, { organizationId: 'org-1', principalUserId: 'u-fatima', now: x.now, forADelegate: false });
    const said = whatIsOutstandingSaid(reg, { forName: null, now: x.now });
    console.log(`WHAT FATIMA READS\n${said}`);
    const lines = said.split('\n');
    const n = Number(/^You have (\d+) matters outstanding\./.exec(lines[0])?.[1]);
    const read = lines.slice(1).filter((l) => !/more (?:is|are) on the list/.test(l)).length;
    const more = Number(/^(\d+) more/.exec(lines[lines.length - 1])?.[1] ?? 0);
    expect(n).toBe(read + more);
  });
});

describe('the nudge reads as a sentence', () => {
  it('a date on its own is joined with "by", never run into the promise', () => {
    expect(theThingWithItsDay('send the briefing note beforehand', '1 Oct 2026')).toBe('send the briefing note beforehand by 1 Oct 2026');
    expect(theThingWithItsDay('send the letter', 'by Friday')).toBe('send the letter by Friday');
  });

  it('something that is not a promise in their own voice is never said back as "you told me you would"', async () => {
    const x = await aTeamLoopWorld();
    const person = x.person('amina@example.com');
    await x.t.commitment.create({ data: { organizationId: 'org-1', personExternalId: person.externalId, text: 'Please can we have 30 minutes with the Permanent Secretary in November', dueSaid: '1 Oct 2026', dueAt: null, state: 'OPEN', source: 'team_reply', statedAt: new Date(x.now.getTime() - 6 * DAY) } });
    const sent: { to: string; text: string }[] = [];
    await nudgeWhereItHelps(x.prisma, ports(sent) as any, x.now);
    console.log(`WHAT AMINA READS\n${sent.map((m) => m.text).join('\n')}`);
    expect(sent).toHaveLength(1);
    expect(sent[0].text).toBe('Amina, I still have “Please can we have 30 minutes with the Permanent Secretary in November” open from what you sent me. Has it moved? If it has, send me the message or document that shows it, and I will update it for you.');
  });
});

describe('a promise that waits on an approver is not chased from its owner', () => {
  it('Hauwa says she will pay as soon as Grace says yes: Grace is asked once, Hauwa is not chased', async () => {
    const mind = aScriptedMind({ readings: [['Sahel', { kind: 'update', commitments: [{ text: 'I will pay as soon as she says yes', whenSaid: 'by Friday', waitingOn: 'Grace' }] }]] });
    const x = await aTeamLoopWorld({ mind });
    await x.theyWrite('Amina Yusuf', { words: 'The Sahel Print payment is stuck. I will pay as soon as she says yes, by Friday.' });
    const row = x.t.commitment.rows.find((c: any) => /pay as soon as/.test(c.text));
    expect(row.waitingOn).toBe('Grace');
    const sent: { to: string; text: string }[] = [];
    const later = await nudgeWhereItHelps(x.prisma, ports(sent) as any, new Date(x.now.getTime() + 10 * DAY));
    console.log(`WHAT GOES OUT\n${sent.map((m) => `${m.to}: ${m.text}`).join('\n') || '(nothing)'}`);
    expect(later.sent.filter((n) => n.kind === 'evidence')).toHaveLength(0);
    expect(sent.some((m) => /you told me you would pay/.test(m.text))).toBe(false);
  });
});
