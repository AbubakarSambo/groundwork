import { EmailService } from '../email/email.service';
import { WhatNeedsYouService } from '../grounds/what-needs-you.service';
import { TEMPLATES } from './a-message-outside-the-window';
import { theCheckInIsOpen, theCheckInIsStillOpen, yourViewMatters } from './what-goes-to-a-phone';
import { theReminderBody } from '../grounds/what-is-sent-in-simpler-words';

/**
 * HAFSAH'S FIX LIST, ITEM 5 (14 October 2026): "People can't easily tell they can check in on WhatsApp. Make it clearly
 * visible wherever someone is about to check in or is reminded to: the invitation email, the check-in page, the end of a
 * session, Today, and reminders. One short line and a clear way to connect ... Only show it where WhatsApp is switched on
 * for that organisation." Read as Amani, whose organisation has WhatsApp on, and as the same Amani where it is off.
 *
 * And her standing rule the same day: the approved templates never change. Inside the 24 hours a normal message says
 * about ten minutes; outside them the template goes exactly as approved.
 */
const DISPLAY = '+44 7700 900123';
const LINE = 'You can also check in on WhatsApp. Send Hi to +44 7700 900123.';

function aWorld(o: { on?: boolean; keptInTheApp?: boolean; wrote?: boolean } = {}) {
  const prisma: any = {
    platformSetting: { findUnique: jest.fn(async ({ where }: any) => (where.key === 'whatsapp_enabled' ? { value: true } : null)) },
    organization: { findUnique: jest.fn(async () => ({ whatsappAddOnOn: o.on ?? true, whatsappFreeUntil: null })) },
    whatsAppConnection: { findUnique: jest.fn(async () => null) },
    /* "She already writes from her number": her number on the roster, and a message that came from it (Drop Access, 21 October: a stamp alone, with no number, is not writing from one). */
    person: { findFirst: jest.fn(async () => ({ phone: o.wrote ? '+254700000009' : null, whatsappLastInboundAt: o.wrote ? new Date() : null })), findMany: jest.fn(async () => (o.wrote ? [{ phone: '+254700000009' }] : [])) },
    user: { findUnique: jest.fn(async () => ({ phoneNumber: null })) },
    whatsAppInboundMessage: { findFirst: jest.fn(async () => (o.wrote ? { messageId: 'ours:+254700000009:wamid.1' } : null)) },
    ground: {
      findUnique: jest.fn(async () => ({ organizationId: 'org-1', overWhatsApp: o.keptInTheApp ? false : null })),
      findMany: jest.fn(async () => [{ overWhatsApp: o.keptInTheApp ? false : null }]),
    },
    groundParticipant: { findUnique: jest.fn(async () => ({ groundId: 'g-1' })) },
    emailSuppression: { findFirst: jest.fn(async () => null) },
  };
  const config: any = { get: (k: string) => ({ 'whatsapp.enabled': true, 'whatsapp.accessToken': 't', 'whatsapp.phoneNumberId': '1', 'whatsapp.displayNumber': DISPLAY } as any)[k] };
  return { prisma, config };
}

/** The html of a mail, by catching what is handed to the one door every mail goes through. */
function mailer(o: Parameters<typeof aWorld>[0] = {}) {
  const { prisma, config } = aWorld(o);
  const svc = new EmailService({ get: (k: string) => config.get(k) } as any, {} as any, prisma) as any;
  const sent: any[] = [];
  svc.sendEmail = jest.fn(async (mail: any) => { sent.push(mail); return 'sent'; });
  svc.theWayToStopBeingChased = jest.fn(async () => '');
  return { svc, sent };
}

describe('the reminders by email', () => {
  it('the reminder says it, with Connect WhatsApp', async () => {
    const { svc, sent } = mailer();
    await svc.sendNudge('amani@kito.test', 'Sales team, Q4', 'https://app/checkin/c1', undefined, false, null, 'p-amani');
    expect(sent[0].html).toContain(`<p>${LINE}</p>`);
    expect(sent[0].html).toContain('>Connect WhatsApp</a>');
  });
  it('the email that a new session is open says it', async () => {
    const { svc, sent } = mailer();
    await svc.sendSessionReady('amani@kito.test', 'Sales team, Q4', 'https://app/checkin/c1', false, null, 'g-1');
    expect(sent[0].html).toContain(`<p>${LINE}</p>`);
  });
  it('the missed-check-ins email says it', async () => {
    const { svc, sent } = mailer();
    await svc.sendMissedCheckIns('amani@kito.test', 'You have missed', ['You have missed your last two check-ins.'], 'Check in now', 'https://app/checkin/c1', 'g-1');
    expect(sent[0].html).toContain(`<p>${LINE}</p>`);
  });
  it.each([
    ['WhatsApp is off for her organisation', { on: false }],
    ['the check-in is kept in the app', { keptInTheApp: true }],
    ['she already writes from her number, so she is reminded there', { wrote: true }],
  ])('none of them says it when %s', async (_why, o) => {
    const { svc, sent } = mailer(o);
    await svc.sendNudge('amani@kito.test', 'Sales team, Q4', 'https://app/checkin/c1', undefined, false, null, 'p-amani');
    await svc.sendSessionReady('amani@kito.test', 'Sales team, Q4', 'https://app/checkin/c1', false, null, 'g-1');
    expect(sent.map((m) => m.html).join('')).not.toContain('check in on WhatsApp');
  });
});

describe('Today', () => {
  const todays = (o: Parameters<typeof aWorld>[0] = {}) => {
    const { prisma, config } = aWorld(o);
    return new WhatNeedsYouService(prisma, {} as any, undefined, undefined, undefined, undefined, undefined, undefined, config);
  };
  const DUE = [{ key: 'k', kind: 'do', title: 'Your next check-in for Sales team, Q4', detail: 'About ten minutes.', action: { label: 'Start it', to: '/checkin/c1' }, groundId: 'g-1' }] as any;
  it('says it under a check-in she has to answer, with Connect WhatsApp', async () => {
    expect(await todays().checkInOnWhatsAppFor('u-amani', 'amani@kito.test', 'org-1', DUE)).toEqual({
      says: 'You can also check in on WhatsApp.', link: 'https://wa.me/447700900123?text=Hi', label: 'Connect WhatsApp',
    });
  });
  it('says nothing with no check-in to answer, where WhatsApp is off, or on a check-in kept in the app', async () => {
    const READ_IT = [{ ...DUE[0], action: { label: 'Read it', to: '/checkin/c1/report' } }];
    expect(await todays().checkInOnWhatsAppFor('u-amani', 'amani@kito.test', 'org-1', READ_IT)).toBeNull();
    expect(await todays({ on: false }).checkInOnWhatsAppFor('u-amani', 'amani@kito.test', 'org-1', DUE)).toBeNull();
    expect(await todays({ keptInTheApp: true }).checkInOnWhatsAppFor('u-amani', 'amani@kito.test', 'org-1', DUE)).toBeNull();
  });
});

describe('the approved templates stay as they are; a normal message inside the 24 hours says about ten minutes', () => {
  it('the three templates are word for word as Meta approved them', () => {
    expect(TEMPLATES['checkin-open'].body).toBe('Hi {{1}}, your check-in for {{2}} is open. It takes about five minutes, and you can answer right here. Reply START to begin.');
    expect(TEMPLATES['closes-soon'].body).toBe('Hi {{1}}, your check-in for {{2}} closes in an hour, at {{3}}. Five minutes now means your view is part of this round.');
    expect(TEMPLATES['your-view-matters'].body).toBe("Hi {{1}}, your check-in for {{2}} is still waiting. Your answers help {{3}} understand what's in your way, and where they can help. It takes about five minutes, and you can answer here.");
  });
  it('the normal message Amani reads inside the 24 hours says about ten minutes, with the same blanks for the template outside them', () => {
    const open = theCheckInIsOpen({ firstName: 'Amani', label: 'Sales team, Q4' });
    expect(open.text).toBe('Hi Amani, your check-in for Sales team, Q4 is open. It takes about ten minutes, and you can answer right here. Reply START to begin.');
    expect(open.params).toEqual(['Amani', 'Sales team, Q4']);
    expect(theCheckInIsStillOpen({ firstName: 'Amani', label: 'Sales team, Q4' }).text).toContain('It takes about ten minutes');
    expect(yourViewMatters({ firstName: 'Amani', label: 'Sales team, Q4' }, 'Wairimu').text).toBe(
      "Hi Amani, your check-in for Sales team, Q4 is still waiting. Your answers help Wairimu understand what's in your way, and where they can help. It takes about ten minutes, and you can answer here.",
    );
    expect(theReminderBody('closes-soon', TEMPLATES['closes-soon'].body)).toContain('About ten minutes now');
  });
});
