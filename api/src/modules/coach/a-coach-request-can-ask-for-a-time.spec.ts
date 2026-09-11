import { BadRequestException } from '@nestjs/common';
import { CoachService } from './coach.service';

/**
 * SCHEDULING THE FIRST CONVERSATION BEFORE THE CHECK-IN IS SET UP.
 *
 * Her spec for the coach step was "schedule the first conversation before you decide", and the
 * request had no time on it at all - so the earliest anybody could agree one was after an email
 * thread, by which point the person has usually set the check-in up already. A coach whose first
 * conversation lands after that is help with something that has finished happening.
 *
 * IT IS A REQUEST AND NOT A BOOKING. Nothing here holds a slot in anybody's calendar. The tests
 * below hold the two halves of that: the time is carried through to the record, and every sentence
 * around it says a coach confirms.
 */
function svc(existing: any = null) {
  const created: any[] = [];
  const updated: any[] = [];
  const prisma: any = {
    coachRequest: {
      findFirst: jest.fn(async () => existing),
      create: jest.fn(async ({ data }: any) => { created.push(data); return { id: 'r1', ...data }; }),
      update: jest.fn(async ({ data }: any) => { updated.push(data); return { id: existing?.id ?? 'r1', ...data }; }),
    },
  };
  const email: any = { sendCoachRequestReceived: jest.fn(async () => undefined) };
  const service = new CoachService(prisma, email, { emit: jest.fn() } as any);
  return { service, created, updated };
}

const base = {
  name: 'Ada', orgName: 'Northwind', email: 'ada@northwind.test', teamSize: '12',
  intention: 'We are about to set up a check-in for a new engineer and I want help shaping it.',
};

describe('a coach request can ask for a time', () => {
  it('carries the time through to the record', async () => {
    const { service, created } = svc();
    const when = new Date(Date.now() + 3 * 86_400_000).toISOString();
    await service.request({ ...base, preferredAt: when });
    expect(created[0].preferredAt).toEqual(new Date(when));
  });

  it('is still a real request without one', async () => {
    /* Asking without naming a time is a perfectly good request and must not be second class. */
    const { service, created } = svc();
    await service.request({ ...base });
    expect(created[0].preferredAt).toBeUndefined();
    expect(created[0].intention).toContain('help shaping it');
  });

  it('refuses a time that has already passed', async () => {
    /*
     * The point of asking here is that the conversation happens BEFORE the check-in is set up. A
     * request for last Tuesday is a typo or a timezone, and storing it hands a coach a queue
     * sorted by a date that means nothing.
     */
    const { service } = svc();
    const past = new Date(Date.now() - 86_400_000).toISOString();
    await expect(service.request({ ...base, preferredAt: past })).rejects.toBeInstanceOf(BadRequestException);
    await expect(service.request({ ...base, preferredAt: past })).rejects.toThrow(/already passed/);
  });

  it('refuses something that is not a date at all', async () => {
    const { service } = svc();
    await expect(service.request({ ...base, preferredAt: 'next tuesday' })).rejects.toThrow(/does not look like a date/);
  });

  it('takes the newer time when somebody asks again', async () => {
    /* The same rule the intention already follows: somebody asking again has moved on. */
    const { service, updated } = svc({ id: 'old', status: 'new' });
    const when = new Date(Date.now() + 5 * 86_400_000).toISOString();
    await service.request({ ...base, preferredAt: when });
    expect(updated[0].preferredAt).toEqual(new Date(when));
  });

  it('never says booked, confirmed, or scheduled about it', async () => {
    /*
     * A person leaving that page believing they have an appointment is worse off than if it had
     * never asked. Every message on this path has to keep it a request.
     */
    const { service } = svc();
    const past = new Date(Date.now() - 86_400_000).toISOString();
    const said = await service.request({ ...base, preferredAt: past }).catch((e: Error) => e.message);
    expect(said).not.toMatch(/booked|confirmed|scheduled|your appointment/i);
    expect(said).toMatch(/agree a time/);
  });
});
