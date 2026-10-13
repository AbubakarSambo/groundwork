import { WhatsAppService } from './whatsapp.service';

/**
 * THE RECORD OF A WHATSAPP MESSAGE IS STAMPED BY THE APPLICATION'S CLOCK, AS THE EMAIL RECORD IS (found on the test bed, 8 October, moving the clock through a week).
 *
 * "Has this person had their one today" counts the records made since the start of the application's day. The WhatsApp record took its time from the database, so with
 * the test bed's clock moved on every record looked days old, nobody was counted, and a lead could be written to on WhatsApp and by email on the same morning without
 * the count seeing it. In production the two clocks are the same moment, so nothing showed.
 */
describe('the record of a WhatsApp message', () => {
  const NOW = new Date('2026-10-14T06:00:00Z');
  function service() {
    const created: any[] = [];
    const prisma: any = { whatsAppSend: { create: jest.fn(async (a: any) => { created.push(a.data); return a.data; }) }, notification: { create: jest.fn(async () => ({})) } };
    const svc: any = new WhatsAppService({ get: () => undefined } as any, prisma);
    return { svc, created };
  }

  it('carries the time the application thinks it is, for a message that went', async () => {
    const { svc, created } = service();
    jest.useFakeTimers({ now: NOW });
    try { await svc.writeItDown('org-1', '+254700100002', { sent: true }, { kind: 'lead-summary' }); } finally { jest.useRealTimers(); }
    expect(created[0].createdAt).toEqual(NOW);
    expect(created[0].sentAt).toEqual(NOW);
  });

  it('and for "stop" and "not now", which the day\'s count reads too', async () => {
    const { svc, created } = service();
    jest.useFakeTimers({ now: NOW });
    try {
      await svc.stopOrResume('org-1', '+254700100002', 'stopped');
      await svc.notNow('org-1', '+254700100002');
    } finally { jest.useRealTimers(); }
    expect(created.map((c) => [c.kind, c.createdAt])).toEqual([['stopped', NOW], ['not-now', NOW]]);
  });
});
