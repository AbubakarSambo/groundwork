import 'reflect-metadata';
import { TheReminderLinkController } from './the-reminder-link.controller';

/**
 * THE "STOP THESE REMINDERS" PAGE'S THREE BUTTONS (A3, #/stop, U.3), BY BEHAVIOUR.
 */
function make(party: any) {
  const updates: any[] = [];
  const many: any[] = [];
  const users: any[] = [];
  const prisma: any = {
    groundParticipant: {
      findUnique: jest.fn(async ({ where }: any) => (party && where.stopRemindersToken === 'tok' ? party : null)),
      update: jest.fn(async (a: any) => { updates.push(a); return {}; }),
      updateMany: jest.fn(async (a: any) => { many.push(a); return { count: 2 }; }),
    },
    user: { update: jest.fn(async (a: any) => { users.push(a); return {}; }) },
  };
  return { c: new TheReminderLinkController(prisma), updates, many, users };
}

const PARTY = { id: 'p1', email: 'miriam@baridi.test', userId: 'u1', remindersStoppedAt: null, ground: { label: 'Sales team, Q3' } };

describe('the reminder link', () => {
  it('stops this check-in\'s reminders and gives its name', async () => {
    const { c, updates } = make(PARTY);
    expect(await c.stop('tok')).toEqual({ known: true, checkInName: 'Sales team, Q3', reminders: 'off' });
    expect(updates[0]).toMatchObject({ where: { id: 'p1' } });
    expect(updates[0].data.remindersStoppedAt).toBeInstanceOf(Date);
  });

  it('stopping twice changes nothing the second time', async () => {
    const { c, updates } = make({ ...PARTY, remindersStoppedAt: new Date() });
    await c.stop('tok');
    expect(updates).toHaveLength(0);
  });

  it('"Turn them back on" turns this check-in\'s reminders on', async () => {
    const { c, updates } = make({ ...PARTY, remindersStoppedAt: new Date() });
    expect(await c.start('tok')).toEqual({ known: true, checkInName: 'Sales team, Q3', reminders: 'on' });
    expect(updates[0]).toEqual({ where: { id: 'p1' }, data: { remindersStoppedAt: null } });
  });

  it('"Stop all email" stops reminders on every check-in for that address, and the account\'s switch', async () => {
    const { c, many, users } = make(PARTY);
    expect(await c.stopAll('tok')).toEqual({ known: true, allEmail: 'off' });
    expect(many[0].where).toEqual({ email: { equals: 'miriam@baridi.test', mode: 'insensitive' }, remindersStoppedAt: null });
    expect(users[0]).toEqual({ where: { id: 'u1' }, data: { emailNotifications: false } });
  });

  it('an address with no account has only its reminders stopped', async () => {
    const { c, users } = make({ ...PARTY, userId: null });
    await c.stopAll('tok');
    expect(users).toHaveLength(0);
  });

  it('a token we do not know changes nothing and says nothing about anybody', async () => {
    const { c, updates, many, users } = make(PARTY);
    for (const r of [await c.stop('nope'), await c.start('nope'), await c.stopAll('nope')]) expect(r).toEqual({ known: false });
    expect(updates.length + many.length + users.length).toBe(0);
  });

  it('all three are POST, so a mail scanner following links cannot press them', () => {
    for (const m of ['stop', 'start', 'stopAll'] as const) {
      expect(Reflect.getMetadata('method', (TheReminderLinkController.prototype as any)[m])).toBe(1 /* RequestMethod.POST */);
    }
  });
});
