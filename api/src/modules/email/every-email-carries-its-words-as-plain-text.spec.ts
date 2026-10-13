const caught: any[] = [];
jest.mock('nodemailer', () => ({ createTransport: () => ({ sendMail: async (m: any) => { caught.push(m); } }) }));

import { EmailService, plainTextOf } from './email.service';

/**
 * EVERY EMAIL CARRIES ITS WORDS IN THE PLAIN-TEXT PART TOO (11 October). Only the HTML carried them,
 * so a mail program that shows text only showed nothing. The text is made in one place, from the HTML
 * each sender already writes, for the mail that goes out for real and for the local copy a person
 * testing reads. Four senders, each read the way a text-only mail program shows it.
 */
const anything: any = new Proxy({}, { get: () => new Proxy({}, { get: () => async () => null }) });

function aMailer(forReal: boolean) {
  const config: any = { get: (k: string) => ({ 'resend.sendsForReal': forReal, 'resend.apiKey': forReal ? 're_live_looking_but_fake' : '', 'resend.frontendUrl': 'https://app.test' } as any)[k] };
  const email = new EmailService(config, { recordSend: async () => undefined } as any, anything);
  const sent: any[] = [];
  Object.assign(email as any, {
    wouldTheyRatherNot: async () => null,
    theyHadTheirOneToday: async () => null,
    holdForTheMorning: async () => false,
    writeItDown: async () => undefined,
    theWayToStopHearingFromUs: async () => 'https://app.test/unsubscribe/u1',
    theWayToStopBeingChased: async () => null,
    theWhatsAppLine: async () => '',
    whoSeesWhatYouSay: async () => 'Whoever runs this check-in can see what you say in it.',
    theResendClient: () => ({ emails: { send: async (m: any) => { sent.push(m); return { data: { id: 'x' }, error: null }; } } }),
  });
  return { email, sent: () => (forReal ? sent : caught) };
}

async function sendFour(email: EmailService) {
  await email.sendParticipantInvite('sade@x.test', 'Baraka', 'Sales team, Q3', 'tok123', undefined, { kind: 'INVITE', participantId: 'p1' } as any);
  await email.sendMissedCheckIns('lead@x.test', 'Two people have not checked in', ['Sade and Tunde have not checked in to Sales team, Q3 yet.'], 'See who is left', 'https://app.test/grounds/g1');
  await email.sendNudge('sade@x.test', 'Sales team, Q3', 'https://app.test/checkin/s1', undefined, false, null, 'p1');
  await email.sendReportReady('sade@x.test', 'Sales team, Q3', 'https://app.test/grounds/g1/report');
}

/** What a text-only mail program shows, from the HTML: the sentences, without tags. */
const sentencesOf = (html: string) => plainTextOf(html).split('\n').filter((l) => l.trim() && !/\(https?:/.test(l));

for (const forReal of [true, false]) {
  describe(forReal ? 'mail that goes out for real' : 'the local copy a person testing reads', () => {
    beforeEach(() => { caught.length = 0; });

    it('has a text part for the invitation, missed check-ins, the reminder and report ready, with the same sentences and every link', async () => {
      const { email, sent } = aMailer(forReal);
      await sendFour(email);
      const mails = sent();
      expect(mails).toHaveLength(4);
      for (const m of mails) {
        expect(typeof m.text).toBe('string');
        expect(m.text.length).toBeGreaterThan(40);
        expect(m.text).not.toMatch(/<[a-z/][^>]*>/i);
        for (const line of sentencesOf(m.html)) expect(m.text).toContain(line);
        for (const [, href] of m.html.matchAll(/href="([^"]+)"/g)) expect(m.text).toContain(`(${href})`);
      }
      expect(mails[0].text).toContain('Start my check-in → (https://app.test/invite?token=tok123)');
      expect(mails[1].text).toContain('Sade and Tunde have not checked in to Sales team, Q3 yet.\n\nSee who is left (https://app.test/grounds/g1)');
      expect(mails[2].text).toContain('Check in (https://app.test/checkin/s1)');
      expect(mails[3].text).toContain('(https://app.test/grounds/g1/report)');
    });
  });
}

describe('the text part, read on its own', () => {
  it('keeps the words, puts a blank line between paragraphs, and writes a link as its words and its address', () => {
    expect(plainTextOf('<style>p{color:red}</style><p>Hi &amp; hello,\n      you&rsquo;re in.</p><p><a href="https://x.test/go" style="x">Read it</a></p>'))
      .toBe('Hi & hello,\nyou’re in.\n\nRead it (https://x.test/go)');
  });
});
