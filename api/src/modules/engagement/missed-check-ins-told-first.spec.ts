import { sendTheMissedCheckInsToThePeople, theMissedNoticeToFold, rememberTheMissedNoticeTold, theMissedNoticeOnWhatsApp } from './missed-check-ins-told-first';
import { readFileSync } from 'fs';
import { join } from 'path';
import { whatThePersonIsToldAboutMissing, keepTheirReason } from '../grounds/missed-check-ins';
import { WhatNeedsYouService } from '../grounds/what-needs-you.service';

/**
 * MISSED CHECK-INS, TOLD TO THE PERSON FIRST (decision 136). Brian missed sessions 2 and 3 of "Sales weekly", which Amani runs; Neema answered
 * everything; Amani herself skipped every session after her first. Read as Brian, Neema, Amani and Grace (an admin who runs nothing).
 */
const W = (n: number) => new Date(Date.UTC(2026, 8, 1 + n * 7));
const NOW = W(4);
const missed = (pid: string, n: number, extra: any = {}) => ({ id: `${pid}-c${n}`, participantId: pid, sessionNumber: n, status: 'COMPLETED', isSetup: false, optional: false, closedReason: 'auto_closed', turns: [], availableFrom: W(n), createdAt: W(n), completedAt: W(n + 1), missedReason: null, ...extra });
const answered = (pid: string, n: number) => ({ ...missed(pid, n), closedReason: null, turns: [{ id: 't' }] });
const open = (pid: string, n: number) => ({ ...missed(pid, n), status: 'NOT_STARTED', closedReason: null, completedAt: null });

function world(opts: { waitOnBrian?: boolean; leave?: boolean } = {}) {
  const checkIns: any[] = [
    answered('p-brian', 1), missed('p-brian', 2), missed('p-brian', 3), open('p-brian', 4),
    answered('p-neema', 1), answered('p-neema', 2), answered('p-neema', 3), open('p-neema', 4),
    answered('p-amani', 1), missed('p-amani', 2, { optional: true }), missed('p-amani', 3, { optional: true }), open('p-amani', 4),
  ];
  const people: any[] = [
    { id: 'p-amani', groundId: 'g1', userId: 'u-amani', partyType: 'INITIATOR', managingOnly: false, leftAt: null, nameGiven: null, user: { firstName: 'Amani', lastName: 'Wekesa' } },
    { id: 'p-brian', groundId: 'g1', userId: 'u-brian', partyType: 'PARTICIPANT', managingOnly: false, leftAt: null, nameGiven: null, user: { firstName: 'Brian', lastName: 'Otieno' } },
    { id: 'p-neema', groundId: 'g1', userId: 'u-neema', partyType: 'PARTICIPANT', managingOnly: false, leftAt: null, nameGiven: null, user: { firstName: 'Neema', lastName: 'Ali' } },
  ];
  const settings = new Map<string, any>();
  const prisma: any = {
    ground: {
      findMany: jest.fn().mockImplementation(({ skip }: any = {}) => Promise.resolve(skip ? [] : [{ id: 'g1' }])),
      findUnique: jest.fn().mockResolvedValue({ label: 'Sales weekly', organizationId: 'org1' }),
    },
    groundParticipant: {
      findMany: jest.fn().mockImplementation(({ where }: any) => {
        let rows = people.filter((p) => !where.groundId?.in || where.groundId.in.includes(p.groundId));
        if (typeof where.userId === 'string') rows = rows.filter((p) => p.userId === where.userId);
        if (where.partyType?.not) rows = rows.filter((p) => p.partyType !== where.partyType.not);
        return Promise.resolve(rows.map((p) => ({ ...p, checkIns: checkIns.filter((c) => c.participantId === p.id) })));
      }),
      findFirst: jest.fn().mockImplementation(({ where }: any) => Promise.resolve(people.find((p) => p.partyType === where.partyType) ?? null)),
    },
    checkIn: {
      findFirst: jest.fn().mockImplementation(({ where }: any) => Promise.resolve(checkIns.filter((c) => c.participantId === where.participantId && where.status.in.includes(c.status)).pop() ?? null)),
      findUnique: jest.fn().mockImplementation(({ where }: any) => {
        const c = checkIns.find((x) => x.id === where.id);
        return Promise.resolve(c ? { id: c.id, participant: { userId: people.find((p) => p.id === c.participantId)?.userId, groundId: 'g1' } } : null);
      }),
      update: jest.fn().mockImplementation(({ where, data }: any) => { Object.assign(checkIns.find((c) => c.id === where.id), data); return Promise.resolve({}); }),
    },
    leaveRequest: { findMany: jest.fn().mockResolvedValue(opts.leave ? [{ userId: 'u-brian', organizationId: 'org1', startsOn: W(2), endsOn: W(3) }] : []) },
    groundDependency: { findMany: jest.fn().mockResolvedValue(opts.waitOnBrian ? [{ id: 'w1', groundId: 'g1', onParticipantId: 'p-brian', what: 'the price list', status: 'WAITING' }] : []) },
    groundCommitment: { findMany: jest.fn().mockResolvedValue(opts.waitOnBrian ? [{ groundId: 'g1', participantId: 'p-brian', text: 'Send the price list to Neema' }] : []) },
    user: { findUnique: jest.fn().mockImplementation(({ where }: any) => Promise.resolve({ email: `${where.id.slice(2)}@x.test`, deletedAt: null, isActive: true })) },
    platformSetting: {
      findUnique: jest.fn().mockImplementation(({ where }: any) => Promise.resolve(settings.has(where.key) ? { value: settings.get(where.key) } : null)),
      create: jest.fn().mockImplementation(({ data }: any) => { settings.set(data.key, data.value); return Promise.resolve({}); }),
    },
    scheduledEmail: { findFirst: jest.fn().mockResolvedValue(null) },
  };
  return { prisma, checkIns };
}

const todayOf = (prisma: any) => new WhatNeedsYouService(prisma, {} as any);

describe('missed check-ins, told to the person first (decision 136)', () => {
  it('Brian reads it on Today, with Amani named and a way to check in now', async () => {
    const { prisma } = world();
    const needs = await todayOf(prisma).missedCheckInsOf('u-brian', 'org1', NOW);
    console.log(`BRIAN READS ON TODAY:\n${needs[0].title}\n${needs[0].detail}\n[${needs[0].action.label}]`);
    expect(needs).toHaveLength(1);
    expect(needs[0].title).toBe("You've missed your last two check-ins.");
    /* Changed 18 October (Drop Access run 1, item 25): at two missed in a row the lead is not told yet (she is from three of the last four), so the person reads that she will be if they miss the next one, never that she will see this. */
    expect(needs[0].detail).toBe('If you miss the next one as well, Amani will be told. It takes about ten minutes.');
    expect(needs[0].action).toEqual({ label: 'Check in now', to: '/checkin/p-brian-c4' });
    expect(needs[0].missedReason).toEqual({ checkInId: 'p-brian-c3', given: null });
  });

  it('people waiting on Brian are mentioned only when a wait on him is confirmed', async () => {
    const { prisma } = world({ waitOnBrian: true });
    const [t] = await whatThePersonIsToldAboutMissing(prisma, 'u-brian', 'org1', NOW);
    expect(t.text).toContain('Somebody on the team is waiting on you.');
  });

  it('Neema, Amani (whose own skipped sessions are never missed) and Grace read nothing about it', async () => {
    const { prisma } = world();
    for (const u of ['u-neema', 'u-amani', 'u-grace']) expect(await todayOf(prisma).missedCheckInsOf(u, 'org1', NOW)).toEqual([]);
  });

  it('approved leave over those weeks means nothing is said', async () => {
    const { prisma } = world({ leave: true });
    expect(await todayOf(prisma).missedCheckInsOf('u-brian', 'org1', NOW)).toEqual([]);
  });

  it('the email goes to Brian once per run of misses, not daily, and to nobody else', async () => {
    const { prisma } = world();
    const email = { sendMissedCheckIns: jest.fn().mockResolvedValue('sent') };
    await sendTheMissedCheckInsToThePeople({ prisma, email, frontendUrl: 'https://app.test' }, NOW);
    await sendTheMissedCheckInsToThePeople({ prisma, email, frontendUrl: 'https://app.test' }, NOW);
    expect(email.sendMissedCheckIns).toHaveBeenCalledTimes(1);
    const [to, subject, lines, label, link] = email.sendMissedCheckIns.mock.calls[0];
    console.log(`BRIAN'S EMAIL:\nSubject: ${subject}\n${lines.join('\n')}\n[${label}] ${link}`);
    expect(to).toBe('brian@x.test');
    expect(subject).toBe("You've missed your last two check-ins on \"Sales weekly\"");
    expect(lines[2]).toBe('If something is in the way, you can tell Amani why on your Today page.');
  });

  /*
   * REVIEWER, 14 OCTOBER: MERCY'S 17 OCTOBER. The WhatsApp opening, the "Your next check-in is open" email and a separate
   * "You've missed your last two check-ins" email on one day. The notice now rides inside the opening email, and on a day an
   * opening already went any other way it is not sent separately.
   */
  it('on a day the WhatsApp opening went to Brian, no separate missed email goes', async () => {
    const { prisma } = world();
    prisma.person = { findMany: jest.fn().mockResolvedValue([{ email: 'brian@x.test', phone: '+254700000002' }]) };
    prisma.whatsAppSend = { findFirst: jest.fn().mockImplementation(({ where }: any) => Promise.resolve(where.phone.in.includes('+254700000002') && where.kind.startsWith === 'checkin-open' ? { id: 's1' } : null)) };
    const email = { sendMissedCheckIns: jest.fn().mockResolvedValue('sent') };
    await sendTheMissedCheckInsToThePeople({ prisma, email, frontendUrl: 'https://app.test' }, NOW);
    expect(email.sendMissedCheckIns).not.toHaveBeenCalled();
  });

  it('the opening email carries the notice, once, and the separate email is then never sent', async () => {
    const { prisma } = world();
    const folded = await theMissedNoticeToFold(prisma, 'u-brian', 'p-brian', NOW);
    console.log(`BRIAN'S OPENING EMAIL CARRIES:\n${folded?.lines.join('\n')}`);
    expect(folded?.lines[0]).toBe("You've missed your last two check-ins.");
    expect(folded?.lines[2]).toBe('If something is in the way, you can tell Amani why on your Today page.');
    expect(await theMissedNoticeToFold(prisma, 'u-neema', 'p-neema', NOW)).toBeNull();
    await rememberTheMissedNoticeTold(prisma, folded!.key, 'sent');
    const email = { sendMissedCheckIns: jest.fn().mockResolvedValue('sent') };
    await sendTheMissedCheckInsToThePeople({ prisma, email, frontendUrl: 'https://app.test' }, NOW);
    expect(email.sendMissedCheckIns).not.toHaveBeenCalled();
    expect(await theMissedNoticeToFold(prisma, 'u-brian', 'p-brian', NOW)).toBeNull();
  });

  it('only Brian can give a reason, and only on his own missed check-in', async () => {
    const { prisma, checkIns } = world();
    expect(await keepTheirReason(prisma, 'u-neema', 'p-brian-c3', 'Not mine to give', NOW)).toBe(false);
    expect(await keepTheirReason(prisma, 'u-brian', 'p-brian-c1', 'An answered one', NOW)).toBe(false);
    expect(await keepTheirReason(prisma, 'u-brian', 'p-brian-c3', 'I was on the road to Kisumu with no signal.', NOW)).toBe(true);
    expect(checkIns.find((c) => c.id === 'p-brian-c3').missedReason).toBe('I was on the road to Kisumu with no signal.');
  });
});


/*
 * HAFSAH, 14 OCTOBER (LATER): "keep one channel. For someone on WhatsApp, put the notice in their WhatsApp opening instead of
 * sending an email." Brian has joined on WhatsApp: no email ever carries the notice; it is said in his WhatsApp check-in.
 */
describe('the missed notice for somebody on WhatsApp', () => {
  const onWhatsApp = (prisma: any) => {
    prisma.organization = { findUnique: jest.fn(async () => ({ whatsappAddOnOn: true, whatsappFreeUntil: null })) };
    prisma.person = { findFirst: jest.fn(async () => ({ phone: '+254700000002', whatsappLastInboundAt: new Date('2026-09-20T09:00:00Z') })), findMany: jest.fn(async (q: any) => (q?.where?.OR ? [{ phone: '+254700000002' }] : [])) };
    /* He writes from the number he has now (Drop Access, 21 October: "connected" is about the current number, from what came from it). */
    prisma.whatsAppInboundMessage = { findFirst: jest.fn(async () => ({ messageId: 'ours:+254700000002:wamid.1' })) };
    return prisma;
  };
  it('is never sent by email', async () => {
    const { prisma } = world();
    onWhatsApp(prisma);
    const email = { sendMissedCheckIns: jest.fn().mockResolvedValue('sent') };
    await sendTheMissedCheckInsToThePeople({ prisma, email, frontendUrl: 'https://app.test' }, NOW);
    expect(email.sendMissedCheckIns).not.toHaveBeenCalled();
  });
  it('is said in full sentences for his WhatsApp check-in, with the way to give a reason, and only once', async () => {
    const { prisma } = world();
    const said = await theMissedNoticeOnWhatsApp(prisma, 'u-brian', 'p-brian', NOW);
    expect(said?.text.startsWith("You've missed your last two check-ins.")).toBe(true);
    expect(said?.text).toContain('If something is in the way, you can tell Amani why on your Today page.');
    await rememberTheMissedNoticeTold(prisma, said!.key, 'sent');
    expect(await theMissedNoticeOnWhatsApp(prisma, 'u-brian', 'p-brian', NOW)).toBeNull();
  });
  it('comes first in the first WhatsApp message after they reply, before the first question, and the email opening is left out', () => {
    const strip = (x: string) => x.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
    const wa = strip(readFileSync(join(__dirname, '..', 'public-api', 'whatsapp-for-an-organisation.service.ts'), 'utf8'));
    /* Changed 20 Oct 2026: the words that switch are said through theWordsOnce, which with the direct morning on says them the first time only. */
    expect(wa).toMatch(/reply = `\$\{sessionHeader\(current\)\}\$\{(?:await this\.theWordsOnce\(ask, organizationId, from\)|theWords)\}\\n\\n\$\{missed \? `\$\{missed\.text\}\\n\\n` : ''\}\$\{first\.reply\}`;/);
    const cron = strip(readFileSync(join(__dirname, '..', 'grounds', 'grounds.cron.ts'), 'utf8'));
    expect(cron).toMatch(/if \(await theyAreConnectedOnWhatsApp\(this\.prisma, \{ organizationId: \(p\.ground as any\)\.organizationId, userId: p\.userId, email: p\.email \}\)\) \{/);
  });
});
