import { WhatsAppForAnOrganisationService } from './whatsapp-for-an-organisation.service';

/**
 * A LEAD WHO RUNS MORE THAN ONE CHECK-IN, ON WHATSAPP (26 October 2026). Grace runs Sales team, Q4 and County water kiosks pilot; her
 * START and her update were answered "I cannot answer that one yet". The one she names is opened, else the one she last checked in on.
 */
const RUNS = [{ id: 'g-kiosks', label: 'County water kiosks pilot' }, { id: 'g-sales', label: 'Sales team, Q4' }];
function svc(lastGround: string | null) {
  const s = Object.create(WhatsAppForAnOrganisationService.prototype) as any;
  s.prisma = { checkIn: { findFirst: jest.fn(async () => (lastGround ? { groundId: lastGround } : null)) } };
  return s;
}

describe('which check-in a lead means', () => {
  it('the one she names', async () => {
    expect((await svc('g-sales').theOneTheLeadMeans(RUNS, 'u-grace', 'START county water kiosks pilot')).id).toBe('g-kiosks');
  });
  it('else the one she last checked in on', async () => {
    expect((await svc('g-sales').theOneTheLeadMeans(RUNS, 'u-grace', 'START')).id).toBe('g-sales');
  });
  it('else the first she runs', async () => {
    expect((await svc(null).theOneTheLeadMeans(RUNS, 'u-grace', 'Hi')).id).toBe('g-kiosks');
  });
});

describe('a check-in Groundwork has just closed is not open (Mercy, 26 October 2026)', () => {
  it('while it is being finished, a message goes to the next one', async () => {
    const s = Object.create(WhatsAppForAnOrganisationService.prototype) as any;
    const ground = { label: 'Sales team, Q4', createdAt: new Date('2026-10-01'), initiator: { firstName: 'Grace' }, overWhatsApp: true, cadence: 'DAILY', simplerWords: false };
    s.prisma = { checkIn: { findMany: jest.fn(async () => [
      { id: 'ci-9', status: 'IN_PROGRESS', sessionNumber: 9, availableFrom: new Date('2026-10-22'), createdAt: new Date('2026-10-22'), ground },
      { id: 'ci-10', status: 'NOT_STARTED', sessionNumber: 10, availableFrom: new Date('2026-10-22'), createdAt: new Date('2026-10-22'), ground },
    ]) } };
    s.conversation = { isBeingFinished: (id: string) => id === 'ci-9' };
    expect((await s.openCheckInsFor('org', 'u-mercy')).map((c: any) => c.id)).toEqual(['ci-10']);
  });
});
