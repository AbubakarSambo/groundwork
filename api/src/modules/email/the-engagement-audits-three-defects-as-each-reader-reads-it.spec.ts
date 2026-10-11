import { EmailService } from './email.service';
import { RemindService } from '../conversation/remind.service';
import { everyoneElseHasAnswered } from '../conversation/the-last-one-we-are-waiting-for';
import { haveNotCheckedInSaid, whoIsLeftToCheckIn } from './who-has-not-checked-in-yet';
import { withWhatGroundworkIs } from './what-groundwork-is';
import { whoSeesWhatYouSayIn } from './who-sees-what-you-say';

/**
 * THE ENGAGEMENT AUDIT'S THREE DEFECTS, AS THE RENDERED EMAIL READS TO EACH READER (7 October 2026).
 *
 * 1. "Yours is the last one we are waiting for" was sent while two people were still waiting.
 * 2. "2 parties have not yet checked in" was stale on three mails a minute apart, and "parties" is not a word anybody says.
 * 3. The footer said "What you write is not shown to anybody ... and the record does not quote you", which is not true: what people say in a
 *    check-in can be read by the people in it (decision 4), and the invitation says so.
 */
const text = (html: string) => html.replace(/<!--[\s\S]*?-->/g, '').replace(/<\/strong>\./g, '.').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').replace(/ \./g, '.').replace(/&amp;/g, '&').replace(/&quot;/g, '"').trim();

function theMails(ground: any = { scenario: 'OKR_ALIGNMENT', peersVisibleToEachOther: null, organization: { name: 'Baridi Appliances' }, organizationId: 'org-1', overWhatsApp: null }) {
  const prisma: any = {
    ground: { findUnique: jest.fn(async () => ground) },
    groundParticipant: { findUnique: jest.fn(async () => null) },
    platformSetting: { findUnique: jest.fn(async () => null) },
  };
  const email = new EmailService({ get: () => undefined } as any, {} as any, prisma);
  const sent: any[] = [];
  /* The real senders and the real footer; only the post is a fake. */
  (email as any).sendEmail = jest.fn(async (o: any, _c: any, sender: string) => { sent.push({ ...o, html: withWhatGroundworkIs(o.html, sender) }); return undefined; });
  return { email, sent, prisma };
}

describe('1. "Yours is the last one we are waiting for"', () => {
  const p = (id: string, status: string | null, over: any = {}) => ({ id, checkIns: status ? [{ status }] : [], ...over });

  it('is true only when somebody else has finished and nobody else who is still expected is left', () => {
    /* Abigail, James and Lucy have checked in; Vera and Wairimu have not. */
    const round = [p('abigail', 'COMPLETED'), p('james', 'COMPLETED'), p('lucy', 'COMPLETED'), p('vera', 'NOT_STARTED'), p('wairimu', 'NOT_STARTED')];
    expect(everyoneElseHasAnswered('vera', round)).toBe(false);
    expect(everyoneElseHasAnswered('wairimu', round)).toBe(false);
    /* Once Wairimu has finished too, Vera is the last. */
    round[4].checkIns = [{ status: 'COMPLETED' }];
    expect(everyoneElseHasAnswered('vera', round)).toBe(true);
  });

  it('leaves out the reader, somebody who only manages, somebody not let in yet, somebody whose account has gone, and somebody who declined', () => {
    const round = [
      p('done', 'COMPLETED'), p('vera', 'NOT_STARTED'),
      p('manager', 'NOT_STARTED', { managingOnly: true }), p('held', 'NOT_STARTED', { user: { awaitingOrgApproval: true } }),
      p('left', 'NOT_STARTED', { user: { isActive: false } }), p('no', 'DECLINED'),
    ];
    expect(everyoneElseHasAnswered('vera', round)).toBe(true);
    /* ... and nobody else has finished: there is nobody to say it of. */
    expect(everyoneElseHasAnswered('vera', [p('vera', 'NOT_STARTED'), p('x', 'NOT_STARTED')])).toBe(false);
  });

  it('the reminder Vera reads says it only when it is true, through the real service', async () => {
    const { email, sent } = theMails();
    const participants: Record<string, any> = {};
    const row = (id: string, status: string, emailAddress: string, extra: any = {}) => (participants[id] = {
      id, email: emailAddress, userId: `u-${id}`, lastNudgedAt: null, managingOnly: false, remindersStoppedAt: null, inviteToken: null, invitedAt: null,
      user: { firstName: id, emailNotifications: true, isActive: true, deletedAt: null, awaitingOrgApproval: false }, checkIns: [{ id: `ci-${id}`, status }], ...extra,
    });
    row('abigail', 'COMPLETED', 'a@x.test'); row('james', 'COMPLETED', 'j@x.test'); row('lucy', 'COMPLETED', 'l@x.test'); row('vera', 'NOT_STARTED', 'v@x.test'); row('wairimu', 'NOT_STARTED', 'w@x.test');
    const prisma: any = {
      user: { findUnique: jest.fn(async () => ({ firstName: 'Wairimu' })) },
      checkIn: { findUnique: jest.fn(async () => ({ groundId: 'g1', sessionNumber: 1 })) },
      ground: { findUnique: jest.fn(async () => ({ id: 'g1', label: 'Kenya launch', startedFrom: null })) },
      groundParticipant: {
        findFirst: jest.fn(async () => participants.wairimu),
        findMany: jest.fn(async () => Object.values(participants).filter((x: any) => x.id !== 'wairimu')),
        update: jest.fn(async () => ({})),
      },
      leaveRequest: { findMany: jest.fn(async () => []) },
      platformSetting: { findUnique: jest.fn(async () => null) },
    };
    const svc = new RemindService(prisma, email as any, { tell: async () => [] } as any);
    await svc.sendReminder('ci1', 'u-wairimu');
    const toVera = sent.find((m) => m.to === 'v@x.test');
    expect(toVera).toBeDefined();
    expect(text(toVera.html)).toContain('Your check-in for session 1 on "Kenya launch" is still open.');
    expect(text(toVera.html)).not.toMatch(/last one we are waiting for|shared their side/);
    /* Wairimu finishes: now Vera really is the last one. */
    participants.wairimu.checkIns = [{ id: 'ci-wairimu', status: 'COMPLETED' }];
    sent.length = 0;
    await svc.sendReminder('ci1', 'u-wairimu');
    expect(text(sent.find((m) => m.to === 'v@x.test').html)).toContain('They have already shared their side. Yours is the last one we are waiting for.');
  });
});

describe('2. who has not checked in yet', () => {
  const who = (id: string, first: string, done: boolean, extra: any = {}) => ({ id, managingOnly: false, user: { email: `${first.toLowerCase()}@x.test`, firstName: first, isActive: true, deletedAt: null, awaitingOrgApproval: false }, checkIns: done ? [{}] : [], ...extra });

  it('counts when the mail is sent, without the person who just checked in or the lead reading it', () => {
    /* After Lucy, the third, checked in, the lead (Wairimu) and Amina and Kwame had not. The lead is the reader. */
    const round = [who('abigail', 'Abigail', true), who('james', 'James', true), who('lucy', 'Lucy', false), who('wairimu', 'Wairimu', false), who('amina', 'Amina', false), who('kwame', 'Kwame', false)];
    const left = whoIsLeftToCheckIn(round as any, { justCheckedIn: 'lucy', readerEmail: 'wairimu@x.test' });
    expect(left).toEqual({ names: ['Amina', 'Kwame'], count: 2 });
    expect(haveNotCheckedInSaid(left)).toBe('Amina and Kwame have not checked in yet.');
  });

  it('says one, a count in words past three, and a count where a name is not known', () => {
    expect(haveNotCheckedInSaid({ names: ['Kwame'], count: 1 })).toBe('Kwame has not checked in yet.');
    expect(haveNotCheckedInSaid({ names: ['A', 'B', 'C', 'D'], count: 4 })).toBe('Four people have not checked in yet.');
    expect(haveNotCheckedInSaid({ names: ['Amina'], count: 2 })).toBe('Two people have not checked in yet.');
    expect(haveNotCheckedInSaid({ names: [], count: 1 })).toBe('One person has not checked in yet.');
  });

  it('leaves out anybody who only manages, was not let in yet, or is gone', () => {
    const round = [who('amina', 'Amina', false), who('m', 'Mo', false, { managingOnly: true }), who('h', 'Hana', false, { user: { email: 'h@x.test', firstName: 'Hana', awaitingOrgApproval: true } }), who('g', 'Gone', false, { user: { email: 'g@x.test', firstName: 'Gone', isActive: false } })];
    expect(whoIsLeftToCheckIn(round as any, { justCheckedIn: 'x', readerEmail: 'lead@x.test' })).toEqual({ names: ['Amina'], count: 1 });
  });

  it('the lead reads it in the mail, by name, with no "parties"', async () => {
    const { email, sent } = theMails();
    await email.sendParticipantCheckedIn('wairimu@x.test', 'Lucy Test', 'Kenya launch', 'https://app.test/grounds/g1', { names: ['Amina', 'Kwame'], count: 2 });
    const read = text(sent[0].html);
    expect(read).toContain('Lucy Test has checked in on Kenya launch. Amina and Kwame have not checked in yet. The report is made once everyone is in.');
    expect(read).not.toMatch(/part(y|ies)/i);
    await email.sendParticipantCheckedIn('wairimu@x.test', 'Kwame Test', 'Kenya launch', 'https://app.test/grounds/g1', { names: [], count: 0 });
    expect(text(sent[1].html)).toContain('Everyone has now checked in. The shared report is ready to go out.');
  });
});

describe('3. what Groundwork is, and who sees what people say', () => {
  it('a team check-in: the people in it, your manager included, can see what you say; and nothing says it is private or never quoted', async () => {
    const { email, sent } = theMails();
    /* Changed on 8 October: this used the lead's "Lucy has checked in" notice, which is not written to the person who said anything, so it no longer carries
       the paragraph (the-footer-says-only-what-is-true.spec). The reminder to a participant is the mail the paragraph is for. */
    await email.sendNudge('lucy@x.test', 'Kenya launch', 'https://app.test/g', undefined, undefined, null, 'p1');
    const read = text(sent[0].html);
    expect(read).toContain('Groundwork is where the people involved in a piece of work each give their own account of it, and get one shared record back. The people in this check-in, including your manager, can see what you say in it. Your questions to Ask Groundwork stay private.');
    expect(read).not.toMatch(/not shown to anybody|does not quote you|privately/i);
  });

  it('a cohort, where people do not see each other: whoever runs it can, the others cannot', async () => {
    const { email, sent } = theMails({ scenario: 'COHORT_CHECK', peersVisibleToEachOther: null, organization: { name: 'Baridi Appliances' }, organizationId: 'org-1', overWhatsApp: null });
    await email.sendParticipantInvite('amani@baridi.test', 'Wairimu', 'Founders cohort', 'tok', undefined, { kind: 'PARTICIPANT_INVITE', groundId: 'g-2' });
    expect(text(sent[0].html)).toContain('Whoever runs this check-in can see what you say in it. The other people taking part do not see what you say.');
  });

  it('a cohort mail ends with the cohort wording, because the footer is given the check-in’s own sentence', () => {
    const cohort = whoSeesWhatYouSayIn({ scenario: 'COHORT_CHECK', peersVisibleToEachOther: null, organization: { name: 'Baridi Appliances' } });
    expect(text(withWhatGroundworkIs('<p>hello</p>', 'sendReportReady', cohort))).toBe('hello Groundwork is where the people involved in a piece of work each give their own account of it, and get one shared record back. Whoever runs this check-in can see what you say in it. The other people taking part do not see what you say. Your questions to Ask Baridi Appliances stay private.');
  });

  it('the report notice says it too, instead of "it does not quote anybody"', async () => {
    const { email, sent } = theMails();
    await email.sendReportReady('amani@baridi.test', 'Sales team, Q4', 'https://app.test/r', undefined, 'g-1');
    const read = text(sent[0].html);
    expect(read).toContain('The people in this check-in, including your manager, can see what you say in it. Your questions to Ask Baridi Appliances stay private.');
    expect(read).not.toMatch(/does not quote anybody|stay yours|privately/i);
  });
});
