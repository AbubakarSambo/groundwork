import { theSameWordsAgain, rememberTheWords, THE_SAME_WORDS_AFTER_TWO_MISSED_DAYS } from './never-the-same-words-twice';
import { theNightRunsDatabase, N } from './the-night-run-bed';
import { WebhooksListener } from '../webhooks/webhooks.listener';
import { theCheckInIsOpen } from '../whatsapp/what-goes-to-a-phone';

/**
 * AFTER TWO MISSED DAYS, NEVER THE SAME OPENING TWICE IN A ROW, AS JOSEPH IS SENT THEM (nudges that get answers, 20 October 2026), from the
 * second night run (gw_night_run2), with Joseph's sessions of Tuesday 20 and Wednesday 21 October closed by the clock unanswered. On
 * Thursday 22 October at eight in Nairobi his next session opens.
 */
const DROP = N.drop.ground.id;
const JOSEPH = '2274e6af-8d37-4388-bd39-8a7aeb582d7b';
const THURSDAY = new Date('2026-10-22T05:00:00Z');
const dated = (c: any) => ({ ...c, completedAt: c.completedAt ? new Date(c.completedAt) : null, availableFrom: c.availableFrom ? new Date(c.availableFrom) : null, createdAt: new Date(c.createdAt) });

function theRecord(directMorning: boolean, missedTwo = true) {
  const db = theNightRunsDatabase('drop', { directMorning });
  const rows = (N.drop.checkIns as any[]).map(dated);
  if (missedTwo) {
    const seven = rows.find((c) => c.participantId === JOSEPH && c.sessionNumber === 7);
    Object.assign(seven, { status: 'COMPLETED', completedAt: new Date('2026-10-21T05:00:00Z'), closedReason: 'auto_closed' });
    rows.push({ ...seven, id: 'joseph-8', sessionNumber: 8, availableFrom: new Date('2026-10-21T05:00:00Z'), createdAt: new Date('2026-10-21T05:00:00Z'), completedAt: new Date('2026-10-22T05:00:00Z') });
    rows.push({ ...seven, id: 'joseph-9', sessionNumber: 9, status: 'NOT_STARTED', closedReason: null, availableFrom: THURSDAY, createdAt: THURSDAY, completedAt: null });
  }
  db.checkIn.findMany = jest.fn(async ({ where }: any = {}) => rows.filter((c) => !where?.participantId || c.participantId === where.participantId));
  const ledger: any[] = [];
  db.notification = { findFirst: jest.fn(async () => null), create: jest.fn(async ({ data }: any) => { ledger.push(data); return data; }) };
  return { db, ledger };
}
const GENERIC = theCheckInIsOpen({ firstName: 'Joseph', label: 'Sales team, Q4' }).text;

describe('the rule', () => {
  it('after two missed days, the same words as last time are not sent again', async () => {
    const { db } = theRecord(true);
    await rememberTheWords(db, DROP, JOSEPH, GENERIC, new Date('2026-10-21T05:00:00Z'));
    expect(await theSameWordsAgain(db, { groundId: DROP, participantId: JOSEPH, words: GENERIC, now: THURSDAY })).toEqual({ days: ['Tuesday 20 October', 'Wednesday 21 October'] });
  });
  it('different words still go: his own line about the one thing today', async () => {
    const { db } = theRecord(true);
    await rememberTheWords(db, DROP, JOSEPH, GENERIC);
    expect(await theSameWordsAgain(db, { groundId: DROP, participantId: JOSEPH, words: 'Joseph, Juja Hardware is waiting on the KES 4,500 price for 5 units. What\'s happening with it, and what\'s next?', now: THURSDAY })).toBeNull();
  });
  it('one missed day is not two: the same words go', async () => {
    const { db } = theRecord(true, false);
    await rememberTheWords(db, DROP, JOSEPH, GENERIC);
    expect(await theSameWordsAgain(db, { groundId: DROP, participantId: JOSEPH, words: GENERIC, now: new Date('2026-10-21T05:00:00Z') })).toBeNull();
  });
});

describe('the WhatsApp opening on Thursday, as the opening notice sends it', () => {
  beforeEach(() => jest.useFakeTimers({ doNotFake: ['nextTick', 'setImmediate', 'queueMicrotask'] }).setSystemTime(new Date('2026-10-22T05:15:00Z')));
  afterEach(() => jest.useRealTimers());
  async function announce(directMorning: boolean, lastWords: string | null) {
    const { db, ledger } = theRecord(directMorning);
    const p = (N.drop.participants as any[]).find((x) => x.id === JOSEPH);
    db.groundParticipant = { ...db.groundParticipant, findUnique: jest.fn(async () => ({ id: p.id, email: p.email, userId: p.userId, user: { firstName: 'Joseph', email: p.email, phoneNumber: '+254700500004' } })) };
    if (lastWords) await rememberTheWords(db, DROP, JOSEPH, lastWords);
    const sends: any[] = [];
    const listener: any = Object.create(WebhooksListener.prototype);
    Object.assign(listener, { prisma: new Proxy(db, { get: (t: any, k: string) => (k in t ? t[k] : { findFirst: async () => null, findMany: async () => [], findUnique: async () => null }) }), whatsapp: { sendFor: jest.fn(async (...a: any[]) => { sends.push(a); return { sent: true }; }) }, theApprovalEmailOpenedIt: async () => false, logger: { log() {}, warn() {}, error() {} } });
    await listener.announceOnWhatsApp({ groundId: DROP, participantId: JOSEPH, checkInId: 'joseph-9', sessionNumber: 9 }, { organizationId: N.drop.ground.organizationId, label: N.drop.ground.label, overWhatsApp: true, simplerWords: false });
    return { sends, ledger };
  }

  it('his own line goes where it differs from what he was sent last time', async () => {
    const { sends, ledger } = await announce(true, GENERIC);
    expect(sends).toHaveLength(1);
    expect(sends[0][2]).not.toBe(GENERIC);
    expect(ledger).toEqual([]);
  });

  it('the same line as last time is not sent a third time, and the ledger says why', async () => {
    const first = await announce(true, null);
    const said = first.sends[0][2];
    const { sends, ledger } = await announce(true, said);
    expect(sends).toHaveLength(0);
    expect(ledger).toEqual([expect.objectContaining({ channel: 'whatsapp', toAddress: 'joseph@dropaccess.test', sender: 'checkin-open', outcome: 'skipped', because: THE_SAME_WORDS_AFTER_TWO_MISSED_DAYS })]);
  });

});
