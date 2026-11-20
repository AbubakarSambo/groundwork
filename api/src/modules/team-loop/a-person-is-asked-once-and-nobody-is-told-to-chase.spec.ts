import { aScriptedMind, aTeamLoopWorld } from './a-world-for-the-team-loop';
import { aMindThatReadsMeaning } from './a-mind-that-reads-meaning';
import { runTheStandingInstructions } from './standing-instructions';
import { nudgeWhereItHelps } from './a-nudge-that-helps';

/**
 * FATIMA ROUND 2, C4 AND C6. A person gets one ask for one gap (the introduction already asked what they are working on, so a standing ask a day later is not a
 * second mail). An approver is told once about one wait, however many lines the owner said about it, and nobody is nudged on two days running. The owner of
 * something that waits on an approval is never asked to chase the approver. Every text a person reads is printed.
 */
const at = (day: number, hhmm: string) => new Date(`2026-11-${String(day).padStart(2, '0')}T${hhmm}:00Z`);
const DAY = 86_400_000;
const COLLECT = { kind: 'collect_and_report' as const, reportWeekday: 5 };

describe('a person is asked once for one gap', () => {
  async function theInstructionIsOn() {
    const x = await aTeamLoopWorld({ mind: aScriptedMind({ instruction: COLLECT }), now: at(11, '10:00') });
    await x.service.hearHer({ organizationId: 'org-1', userId: 'u-fatima', message: "Get everyone's updates and email me Friday." });
    await x.service.hearHer({ organizationId: 'org-1', userId: 'u-fatima', message: 'Yes' });
    return x;
  }

  it('a person introduced in the last three days is not sent a second ask for an update, and still counts as asked', async () => {
    const x = await theInstructionIsOn();
    const sentBefore = x.w.sent.length;
    const did = await runTheStandingInstructions(x.prisma, (x.service as any).ports(), at(12, '08:30'));
    expect(did.join()).toMatch(/asked 2 for 2026-11-13/);
    console.log(`WHAT WAS SENT BY THE THURSDAY ASK\n${x.w.sent.slice(sentBefore).map((m) => m.text).join('\n') || '(nothing: the introduction already asked)'}`);
    expect(x.w.sent.slice(sentBefore)).toHaveLength(0);
    expect(x.t.informationGap.rows.filter((g: any) => /^instr:/.test(g.gapKey)).map((g: any) => g.askedOfEmail).sort()).toEqual(['amina@example.com', 'ibrahim@example.com']);
  });

  it('a person who wrote since, or was introduced longer ago, is asked, once', async () => {
    const x = await theInstructionIsOn();
    for (const r of x.t.introductionDelivery.rows) { r.createdAt = at(1, '10:00'); r.lastTriedAt = at(1, '10:00'); }
    const sentBefore = x.w.sent.length;
    await runTheStandingInstructions(x.prisma, (x.service as any).ports(), at(12, '08:30'));
    await runTheStandingInstructions(x.prisma, (x.service as any).ports(), at(12, '08:40'));
    expect(x.w.sent.slice(sentBefore).map((m) => m.to).sort()).toEqual(['+2348035550101', 'amina@example.com']);
  });
});

describe('an approver hears once, and nobody is nudged on two days running', () => {
  const make = (x: any, data: Record<string, unknown>) => x.t.commitment.create({ data: { organizationId: 'org-1', dueAt: null, state: 'OPEN', source: 'team_reply', ...data } });
  const portsOf = (x: any) => ({ whatsapp: { send: async (a: any) => { x.w.sent.push({ to: a.phone, text: a.text, channel: 'whatsapp', kind: a.kind }); return { sent: true }; } }, email: { send: async (a: any) => { x.w.sent.push({ to: a.to, subject: a.subject, text: a.text, channel: 'email', kind: 'nudge' }); } } });

  it('two lines about one wait (as Hauwa said them) are one message to the approver, then nothing on any later day', async () => {
    const x = await aTeamLoopWorld({ mind: aScriptedMind() });
    const days = (n: number) => new Date(x.now.getTime() - n * DAY);
    await make(x, { personExternalId: 'p-amina', text: 'I will pay as soon as she says yes, by Friday', dueSaid: 'by Friday', statedAt: days(6), waitingOn: 'Ibrahim Sule' });
    await make(x, { personExternalId: 'p-amina', text: 'The Sahel Print payment is stuck', statedAt: days(5), waitingOn: 'Ibrahim Sule' });
    const ports = portsOf(x);
    const one = await nudgeWhereItHelps(x.prisma, ports as any, x.now);
    console.log(`WHAT IBRAHIM READS\n${one.sent.map((s) => s.text).join('\n')}`);
    expect(one.sent).toHaveLength(1);
    for (const days of [1, 2, 4, 8, 15]) expect((await nudgeWhereItHelps(x.prisma, ports as any, new Date(x.now.getTime() + days * DAY))).sent.filter((s) => s.kind === 'approver')).toHaveLength(0);
  });

  it('a person with two quiet promises is nudged about one, and not again the next day', async () => {
    const x = await aTeamLoopWorld({ mind: aScriptedMind() });
    const days = (n: number) => new Date(x.now.getTime() - n * DAY);
    await make(x, { personExternalId: 'p-amina', text: 'I will send the budget letter', statedAt: days(6) });
    await make(x, { personExternalId: 'p-amina', text: 'I will call the clerk', statedAt: days(5) });
    const ports = portsOf(x);
    expect((await nudgeWhereItHelps(x.prisma, ports as any, x.now)).sent).toHaveLength(1);
    const next = await nudgeWhereItHelps(x.prisma, ports as any, new Date(x.now.getTime() + DAY));
    expect(next.sent).toHaveLength(0);
    expect(next.left.map((l) => l.why).join()).toMatch(/last two days|followed up in the last three days/);
  });
});

describe('the owner of something that waits on an approval is never asked to chase the approver', () => {
  const WORDS = [
    'The Sahel Print payment is stuck. It is waiting for Ibrahim to approve since last Monday. I will pay as soon as he says yes, by Friday.',
    'I cannot release the vendor payment until Ibrahim signs it off.',
    'Waiting on Ibrahim to approve the venue deposit before I can book.',
  ];
  it.each(WORDS)('%s', async (words) => {
    const seen: string[][] = [];
    const mind = aMindThatReadsMeaning({
      readTheirWords: async () => ({ kind: 'update', commitments: [], outcomes: [], blockers: [{ text: words.split('.')[0], waitingOn: 'Ibrahim' }], answers: [], vague: null }),
      replyToThem: async (b) => { seen.push(b.mustSay); return 'Amina, thank you. I have noted it.'; },
    });
    const x = await aTeamLoopWorld({ mind });
    (x.service as any).mind = mind;
    await x.theyWrite('Amina Yusuf', { words });
    const told = seen[0].join(' ');
    console.log(`WHAT THE WRITER IS TOLD\n${told}`);
    expect(told).toMatch(/Never ask them to follow it up with, chase, remind or contact/);
    expect(told).toMatch(/you will ask Ibrahim about it yourself/);
  });
});
