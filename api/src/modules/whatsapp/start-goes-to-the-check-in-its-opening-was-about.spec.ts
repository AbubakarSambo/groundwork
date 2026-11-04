import { anInboundHarness } from './a-whatsapp-inbound-harness';

/**
 * START GOES TO THE CHECK-IN ITS OPENING WAS ABOUT (polish round 15, Muchemi & Co).
 *
 * Wanjiru runs "Litigation team daily" and "Fee notes", and Brian is in both. On Monday 12 October he was sent the litigation
 * opening, then the Fee notes one, and replied START. Only his first invitation was accepted from his phone, so only the litigation
 * check-in was open for him, and his Fee notes answers went into it ("I believe there's a slight mix-up; I'm actually in the weekly
 * fee notes check-in today"). On Monday 19 October both openings came again and START went to the newest with nothing said about
 * the other. Read as Brian reads it on his phone.
 */
const LIT = { id: 'ci-lit', label: 'Litigation team daily', status: 'NOT_STARTED' as const, cadence: 'DAILY' };
const FEES = { id: 'ci-fees', label: 'Fee notes', status: 'NOT_STARTED' as const, cadence: 'WEEKLY' };
const asOpenRows = (rows: typeof LIT[]) => rows.map((r) => ({
  id: r.id, status: r.status, sessionNumber: 1, availableFrom: null, createdAt: new Date('2026-10-12T05:12:00Z'),
  ground: { label: r.label, scenario: 'PULSE_CHECK', overWhatsApp: null, cadence: r.cadence },
}));

describe('Brian, invited to two check-ins, replies START after the Fee notes opening (Monday 12 October)', () => {
  it('both invitations are accepted from his phone, and START opens Fee notes, the last opening sent to him', async () => {
    const h = anInboundHarness({
      open: [],
      who: { personId: 'person-brian', userId: null, externalId: 'participant:p-brian' },
      sends: [
        { checkInId: 'ci-lit', kind: 'checkin-open:template', createdAt: new Date('2026-10-12T05:11:45Z') },
        { checkInId: 'ci-fees', kind: 'checkin-open:template', createdAt: new Date('2026-10-12T05:15:00Z') },
      ],
    });
    const accepted: string[] = [];
    (h.service as any).participants = { accept: jest.fn(async (token: string) => { accepted.push(token); return {}; }) };
    (h.service as any).checkIns = { actingAs: jest.fn(async () => { throw new Error('not linked'); }) };
    h.prisma.person.findFirst = jest.fn(async () => ({ id: 'person-brian', email: 'brian@muchemi.test', givenName: 'Brian', familyName: 'Otieno' }));
    h.prisma.person.updateMany = jest.fn(async () => ({ count: 1 }));
    /* Litigation team daily was the first invitation, Fee notes the second. */
    h.prisma.groundParticipant.findMany = jest.fn(async (q: any) => (q?.where?.inviteToken && !accepted.length ? [{ inviteToken: 'tok-lit' }, { inviteToken: 'tok-fees' }] : []));
    h.prisma.user = { findFirst: jest.fn(async () => (accepted.length ? { id: 'u-brian' } : null)), findUnique: jest.fn(async () => null), updateMany: jest.fn(async () => ({ count: 0 })) };
    /* A check-in is open for him once its invitation is accepted. */
    h.prisma.checkIn.findMany = jest.fn(async () => asOpenRows([LIT, FEES].filter((c) => accepted.includes(c.id === 'ci-lit' ? 'tok-lit' : 'tok-fees'))));

    await h.service.handle('org-mu', h.message('START', '254722000002'), 'ours');

    expect(accepted).toEqual(['tok-lit', 'tok-fees']);
    expect(h.conversation.open).toHaveBeenCalledWith('ci-fees', 'u-brian');
    expect(h.conversation.open).not.toHaveBeenCalledWith('ci-lit', expect.anything());
    /* Updated 29 October (a reply belongs to what it answers): START answers the last opening sent to him, with no sentence about the other. */
    expect(h.said[0].startsWith('Fee notes, session 1.')).toBe(true);
    expect(h.sent[h.sent.length - 1].context).toMatchObject({ checkInId: 'ci-fees' });
  });
});

describe('Brian, with both open, replies START after the litigation opening (Monday 19 October)', () => {
  it('START opens the litigation check-in, the last opening sent to him', async () => {
    const h = anInboundHarness({
      open: [{ ...FEES }, { ...LIT }],
      who: { personId: 'person-brian', userId: 'u-brian', externalId: 'u-brian' },
      sends: [
        { checkInId: 'ci-fees', kind: 'checkin-open', createdAt: new Date('2026-10-19T04:00:00Z') },
        { checkInId: 'ci-lit', kind: 'checkin-open', createdAt: new Date('2026-10-19T05:00:00Z') },
      ],
    });
    await h.service.handle('org-mu', h.message('START', '254722000002'), 'ours');
    expect(h.conversation.open).toHaveBeenCalledWith('ci-lit', 'u-brian');
    expect(h.said[0].startsWith('Litigation team daily, session 1.')).toBe(true);
  });

  it('a reply to the Fee notes opening itself goes to Fee notes, with nothing more to say', async () => {
    const h = anInboundHarness({
      open: [{ ...FEES }, { ...LIT }],
      who: { personId: 'person-brian', userId: 'u-brian', externalId: 'u-brian' },
      sends: [
        { providerMessageId: 'wamid.fees-open', checkInId: 'ci-fees', kind: 'checkin-open', createdAt: new Date('2026-10-19T04:00:00Z') },
        { checkInId: 'ci-lit', kind: 'checkin-open', createdAt: new Date('2026-10-19T05:00:00Z') },
      ],
    });
    await h.service.handle('org-mu', h.message('START', '254722000002', undefined, 'wamid.fees-open'), 'ours');
    expect(h.conversation.open).toHaveBeenCalledWith('ci-fees', 'u-brian');
    expect(h.said[0].startsWith('Fee notes, session 1.')).toBe(true);
  });
});
