import { EmailService } from '../email/email.service';
import { ParticipantsService } from './participants.service';
import { WebhooksListener } from '../webhooks/webhooks.listener';

/**
 * NO INVITATION CARRIES WHAT THE LEAD WROTE ABOUT THE PERSON (U.6 review, privacy).
 *
 * Read live on Daniel's invitation: "Your part in this: Daniel - Your sales manager, who you said is
 * not meeting his agreed targets...". An invitation says what the check-in is and when it runs, and
 * nothing of the lead's private description: not the text, not a reworded version of it.
 *
 * One participant is seeded with a distinctive private sentence in `roleAsDescribed` and in the
 * lead's own report (the "people mentioned" context, `sessionReport.mentionedPeople`). Every
 * invitation output is then rendered for real: the page's preview response; the invitation email's
 * subject and body, as sent on a first invitation, a reminder, the fresh-link request and the
 * on-the-day send (every caller hands the same builder the check-in, the lead's first name and the
 * token, and nothing else); and the WhatsApp opening message. No fragment of the sentence may
 * appear in any of them.
 */
const PRIVATE = 'PRIVATE-DESCRIPTION-7f3 is not meeting his targets';
const FRAGMENTS = ['PRIVATE-DESCRIPTION-7f3', 'not meeting his targets', 'meeting his targets', '7f3'];
const DAY = 24 * 60 * 60 * 1000;

const participant = {
  id: 'p-daniel', groundId: 'g1', inviteToken: 'tok', email: 'daniel@x.test', userId: null, awaitingSeat: false,
  roleAsDescribed: `Daniel - ${PRIVATE}`, inviteTokenExpiresAt: new Date(Date.now() + 5 * DAY), stopRemindersToken: 'stop',
};
const ground = {
  id: 'g1', label: 'Help someone get back on track', scenario: 'PIP', brief: `The lead wrote: ${PRIVATE}`,
  cadence: 'WEEKLY', cadenceAnchorDay: null, workingDays: [], endsAt: new Date('2026-11-06T00:00:00Z'),
  organizationId: 'o1', overWhatsApp: null,
  initiator: { firstName: 'Hafsah', lastName: 'Jumare' }, organization: { name: 'Coamana' },
};
/* The lead's own first check-in report, where "+ Add them" took the context from. */
const leadsReport = { mentionedPeople: [{ name: 'Daniel', context: PRIVATE }] };

function prismaStub() {
  return {
    groundParticipant: {
      findUnique: jest.fn(async () => participant),
      findFirst: jest.fn(async () => participant),
      update: jest.fn(async () => participant),
    },
    ground: { findUnique: jest.fn(async () => ground) },
    checkIn: { count: jest.fn(async () => 0), findFirst: jest.fn(async () => ({ sessionReport: leadsReport })) },
    /* Joined on WhatsApp, so the opening goes there (one channel for an opening, 14 October). */
    person: { findFirst: jest.fn(async () => ({ phone: '+254700000000', whatsappLastInboundAt: new Date('2026-10-10T09:00:00Z') })) },
    whatsAppConnection: { findUnique: jest.fn(async () => ({ enabled: true })) },
    organization: { findUnique: jest.fn(async () => ({ whatsappAddOnOn: true, whatsappFreeUntil: null })) },
  } as any;
}

function anEmailService(prisma: any) {
  const sent: { subject: string; html: string }[] = [];
  const email = new EmailService({ get: () => undefined } as any, {} as any, prisma);
  jest.spyOn(email as any, 'sendEmail').mockImplementation(async (msg: any) => { sent.push({ subject: msg.subject, html: msg.html }); return undefined; });
  return { email, sent };
}

function expectNothingPrivateIn(what: string, text: string) {
  for (const f of FRAGMENTS) expect({ what, leaks: text.includes(f) }).toEqual({ what, leaks: false });
}

describe('no invitation carries the lead\'s words about the person', () => {
  it('the invitation page\'s preview', async () => {
    const prisma = prismaStub();
    const preview = await new ParticipantsService(prisma, {} as any, {} as any, {} as any).preview('tok');
    expectNothingPrivateIn('preview', JSON.stringify(preview));
  });

  it('the invitation email, as every caller sends it: first invitation, reminder, on the day, fresh link', async () => {
    const prisma = prismaStub();
    const { email, sent } = anEmailService(prisma);
    /* A first invitation, the on-the-day send, the lead's "send it again" and the reminder all call this with these arguments. */
    await email.sendTheInviteThisGroundSends(ground, participant.email, 'Hafsah', 'tok', undefined, { kind: 'PARTICIPANT_INVITE', participantId: participant.id, groundId: ground.id });
    await email.sendTheInviteThisGroundSends(ground, participant.email, 'Hafsah', 'tok', undefined, { kind: 'REMINDER', participantId: participant.id, groundId: ground.id });
    await email.sendParticipantInvite(participant.email, 'Hafsah', ground.label, 'tok', undefined, { kind: 'PARTICIPANT_INVITE', participantId: participant.id, groundId: ground.id });
    /* "Send me a fresh link", through the real service. */
    await new ParticipantsService(prisma, {} as any, email, {} as any).sendAFreshLink('tok', 'daniel@x.test');
    await email.sendInviteAboutToLapse(participant.email, ground.label, 'http://x/invite?token=tok', participant.id);
    expect(sent.length).toBeGreaterThanOrEqual(5);
    for (const m of sent) {
      expectNothingPrivateIn('subject', m.subject);
      expectNothingPrivateIn('body', m.html);
    }
    /* It does say what the check-in is. */
    expect(sent[0].subject).toBe('Hafsah would like your take on Help someone get back on track');
  });

  it('the WhatsApp message that opens the check-in', async () => {
    const prisma = prismaStub();
    const said: string[] = [];
    const whatsapp = { sendFor: jest.fn(async (_o: string, _p: string, text: string) => { said.push(text); return { sent: true }; }) };
    const webhooks = { emit: jest.fn(async () => undefined) };
    const listener = new WebhooksListener(prisma, webhooks as any, { get: () => 'http://x' } as any, {} as any, whatsapp as any);
    await listener.onCheckInOpened({ groundId: 'g1', checkInId: 'ci1', sessionNumber: 1, personExternalId: 'daniel' } as any);
    expect(said).toHaveLength(1);
    expectNothingPrivateIn('whatsapp', said[0]);
    expect(said[0]).toContain('Help someone get back on track');
  });
});

describe('and not through the check-in\'s name (U.6 review)', () => {
  /* A lead who typed the private sentence as her first words and gave no name. The name used to fall
     back to her first words, and the name is the invitation's subject. It falls back to the topic
     now (fallbackGroundName in the client's EntryChatPage.tsx), so the check-in reaching the server is
     named after the situation. Both are rendered here: the name, and the invitation made from it. */
  it('the invitation subject and body carry none of her first words', async () => {
    const { readFileSync } = await import('fs');
    const { join } = await import('path');
    const src = readFileSync(join(__dirname, '../../../../client/src/pages/enter/EntryChatPage.tsx'), 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
    /* The fallback takes no words of hers at all. */
    expect(src).not.toMatch(/fallbackGroundName\([^)]*onboardingSelections\.initial/);
    const nameFromHerSetup = 'Get a project back on track'; /* what fallbackGroundName('DRIFT') gives */
    const prisma = prismaStub();
    const { email, sent } = anEmailService(prisma);
    await email.sendTheInviteThisGroundSends({ ...ground, label: nameFromHerSetup, brief: null }, participant.email, 'Hafsah', 'tok', undefined, { kind: 'PARTICIPANT_INVITE', participantId: participant.id, groundId: ground.id });
    expect(sent).toHaveLength(1);
    expectNothingPrivateIn('subject', sent[0].subject);
    expectNothingPrivateIn('body', sent[0].html);
    expect(sent[0].subject).toBe('Hafsah would like your take on Get a project back on track');
  });
});

describe('and not through the open link (U.6 review)', () => {
  /* Read live on /answer: "This check-in is about Grace, the new operations lead, starting her role
     with..." - the lead's setup description, reworded, shown to anyone with the link. */
  it('GET /entry/open serves the name and when it runs, and none of her description', async () => {
    const { TheOpenLinkService } = await import('../entry/the-open-link.service');
    const prisma: any = {
      ground: {
        findUnique: jest.fn(async () => ({
          id: 'g1', label: 'Help a new hire get started', scenario: 'NEW_HIRE', status: 'OPEN',
          brief: `Grace starts Monday. ${PRIVATE}`, toldToParticipants: `This check-in is about Grace. ${PRIVATE}`,
          cadence: 'WEEKLY', cadenceAnchorDay: null, workingDays: [], endsAt: null, initiator: { firstName: 'Hafsah' },
        })),
      },
    };
    const said: any = await new TheOpenLinkService(prisma, {} as any).whatThisIs('j');
    expectNothingPrivateIn('open link', JSON.stringify(said));
    expect(JSON.stringify(said)).not.toContain('Grace');
    expect(said.groundLabel).toBe('Help a new hire get started');
    expect(said.theQuestion).toBeNull();
    expect(typeof said.schedule).toBe('string');
  });
});
