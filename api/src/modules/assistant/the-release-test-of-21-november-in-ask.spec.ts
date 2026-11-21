import { askGroundwork, textOf } from './request-92-harness';
import { parseContextLine } from './a-line-or-a-note-typed-in-chat';
import { readACommitment, readTheDay } from './a-change-said-back-first';
import { theMail, askBeforeSending, whatBecameOfIt } from './anything-it-can-say-it-can-send';
import { forSomeoneWithNoScreen } from './a-reply-for-someone-with-no-screen';
import { WHAT_ASK_CAN_DO } from './a-question-is-answered-from-the-documents';
import { whatMyCheckInIsFor, isTheStrategyMoving } from './about-your-check-ins-and-the-company';
import { GUIDE_BY_KEY } from './what-the-assistant-can-do';

jest.mock('../grounds/company.service', () => ({
  ...jest.requireActual('../grounds/company.service'),
  readTheCompanyPage: jest.fn(async () => ({ priorities: [{ number: 1, title: '40 new shops by December', reading: null }] })),
}));

/**
 * ASK, AS THE RELEASE TEST OF 21 NOVEMBER 2026 FOUND IT (docs/release-test-21-nov/report.md, Ask's rows), checked by what each person reads.
 *
 * The guide's own examples reach the thing that does them; a waiting step takes only its answer; an update is told where it goes; a decision
 * said is decided; a day typed short is a day; the mail says what became of it; a phone is never told to choose a file; and the purpose of a
 * check-in is what its page says, with no note about privacy.
 */

/** A model that reads each message as the test says, and each waiting step as the test says. */
function aModel(meaning: Record<string, any>, steps: Record<string, any> = {}) {
  return {
    respond: jest.fn(async () => { throw new Error('no composing here'); }),
    extract: jest.fn(async (prompt: string, h: any[]) => {
      const content = String(h[0].content);
      if (/^You read one message/.test(prompt)) return meaning[content.split('\n')[0]] ?? { kind: 'other' };
      if (/^Somebody's work assistant, Groundwork, is waiting/.test(prompt)) return steps[/Their message: (.*)$/m.exec(content)?.[1] ?? ''] ?? { for: 'the_check_in' };
      return null;
    }),
  };
}

function asWairimu(engine: any) {
  const h = askGroundwork({ userId: 'lead-1', role: 'LEAD', engine, grounds: [{ id: 'g1', label: 'Sales team, Q4', initiatorId: 'lead-1', organizationId: 'org-a' }], participants: [{ groundId: 'g1', partyType: 'INITIATOR' }] });
  const kept: any[] = [];
  h.prisma.assistantProposal.create = jest.fn(async ({ data }: any) => { const r = { id: `pr${kept.length + 1}`, state: 'PARKED', createdAt: new Date(), ...data }; kept.push(r); return r; });
  h.prisma.assistantProposal.findFirst = jest.fn(async () => [...kept].reverse().find((r) => r.state === 'PARKED') ?? null);
  h.prisma.assistantProposal.update = jest.fn(async ({ where, data }: any) => Object.assign(kept.find((r) => r.id === where.id) ?? {}, data));
  const say = async (m: string) => textOf(await h.service.respond('org-a', 'p1', m));
  return { ...h, kept, say, s: h.service as any };
}

describe('the guide’s own examples reach the thing that does them (Ask #17, #19, #37, #39)', () => {
  it.each([
    ['my list', 'my_to_dos', 'myToDos'],
    ['help me think thru the Q4 target', 'think_it_through', 'thinkItThrough'],
    ['questions for Juma', 'questions_for_people', 'questionsForPeopleByChat'],
    ['make the Q4 one fortnightly', 'change_a_check_ins_setup', 'addContext'],
  ])('"%s" is answered by its own lane, never "Tell me in your own words"', async (said, guide, lane) => {
    const w = asWairimu(aModel({ [said]: { kind: 'wants', guide } }));
    const ran = jest.spyOn(w.s, lane).mockResolvedValue({ lane: 'x', composedBy: 'rules', blocks: [{ type: 'text', body: 'done by its own lane' }] });
    const read = await w.say(said);
    expect(read).toBe('done by its own lane');
    expect(read).not.toMatch(/Tell me in your own words/);
    expect(ran).toHaveBeenCalled();
  });

  it('the share steps name the tabs that are on screen, not a Report tab', () => {
    const steps = GUIDE_BY_KEY.get('share_a_report')!.onScreen!;
    expect(steps).toBe('Open the check-in, go to My work and press Every check-in. Under What they receive, choose Named or Anonymised, and press the Send button. On one session’s report you can also press Share with the team, or Share without names.');
    expect(steps).not.toMatch(/Report tab/);
  });
});

describe('a waiting step takes only its answer (Ask #20, #68)', () => {
  const aDraftAsking = (w: any) => {
    w.prisma.objectiveDraft = {
      findFirst: jest.fn(async () => ({ id: 'd1', workingTitle: 'Onboarding', proposedMeasure: 'new shops', proposedTarget: '40', justification: null, proposedApproach: null, state: 'DRAFTING' })),
      update: jest.fn(async () => ({})),
    };
    w.s.drafts = { answer: jest.fn(async () => { throw new Error('That is a word, not a reason. Say why this number is the one that matters.'); }) };
  };

  it('"cancel" stops the draft and says so, and nothing was set', async () => {
    const w = asWairimu(aModel({}, { cancel: { for: 'the_check_in', stops: true } }));
    aDraftAsking(w);
    expect(await w.say('cancel')).toBe('I have stopped the draft of "Onboarding". Nothing was set.');
    expect(w.prisma.objectiveDraft.update).toHaveBeenCalledWith({ where: { id: 'd1' }, data: { state: 'ABANDONED' } });
  });

  it('"show me the outline" is something else: the draft does not answer it', async () => {
    const w = asWairimu(aModel({}, { 'show me the outline': { for: 'ask' } }));
    aDraftAsking(w);
    expect(await w.say('show me the outline')).not.toMatch(/That is a word, not a reason/);
    expect(w.s.drafts.answer).not.toHaveBeenCalled();
  });

  it('a set-up waiting lets a request for something else go, and answers it as itself', async () => {
    const said = 'i want to generate performance evaluation for 2 people on my team';
    const w = asWairimu(aModel({ [said]: { kind: 'wants', guide: 'start_a_review' } }, { [said]: { for: 'ask' } }));
    w.kept.push({ id: 'pr0', state: 'PARKED', kind: 'suite_setup', summary: 'How many days of annual leave does each person get a year?', payload: { suite: 'leave', asking: 'days' }, createdAt: new Date() });
    w.s.signedInAs = jest.fn(async () => 'lead-1');
    w.s.suites = {};
    w.s.maySetUpHere = jest.fn(async () => true);
    const read = await w.say(said);
    expect(read).toMatch(/^I have stopped setting up/);
    expect(read).toMatch(/review/i);
    expect(read).not.toMatch(/How many days of annual leave/);
    expect(w.kept[0].state).toBe('DROPPED');
  });
});

describe('an update is told where it goes (Ask #27)', () => {
  it('"sold 12 today", with her check-in open, is sent to that check-in by name', async () => {
    const w = asWairimu(aModel({ 'sold 12 today': { kind: 'question', guide: 'an_update' } }));
    w.prisma.checkIn.findFirst = jest.fn(async () => ({ ground: { label: 'Sales team, Q4' } }));
    expect(await w.say('sold 12 today')).toBe('Thank you. Your check-in for “Sales team, Q4” is open now, so say it there and it goes on your record.');
  });
});

describe('a decision said is decided, and the check-in is named (Ask #36; board #21, #31; Today #45; References #49)', () => {
  it('"decision: we drop the Westlands pilot" is kept with how the team works, never as still to decide', () => {
    expect(parseContextLine('decision: we drop the Westlands pilot')).toEqual({ kind: 'WAY_OF_WORKING', text: 'we drop the Westlands pilot', label: 'a decision' });
    expect(parseContextLine('to decide: do we drop the Westlands pilot')).toEqual({ kind: 'DECISION', text: 'do we drop the Westlands pilot', label: 'something still to decide' });
  });

  it('the say-back names the check-in and what it is', async () => {
    const w = asWairimu(aModel({}));
    w.s.resolveGroundFor = jest.fn(async () => ({ id: 'g1' }));
    expect(await w.say('decision: we drop the Westlands pilot')).toBe('Shall I add "we drop the Westlands pilot" to “Sales team, Q4” as a decision? Everybody in that check-in will read it.');
  });
});

describe('a day typed short is a day (Ask #14)', () => {
  it('"commit me to the client report by fri" sets Friday', () => {
    const c = readACommitment('commit me to the client report by fri')!;
    expect(c).toEqual({ text: 'the client report', dueSaid: 'by fri' });
    const day = readTheDay(c.dueSaid!, new Date('2026-11-22T09:00:00Z'));
    expect('date' in day && day.date.toISOString().slice(0, 10)).toBe('2026-11-27');
  });
});

describe('the mail says what became of it, and what it is about (Ask #18)', () => {
  it('a reply to a yes is mailed without "You asked: yes"', () => {
    const latest = { body: 'I have added "book the room" to your to-dos for Friday.', about: null, lane: 'add_a_to_do' };
    expect(askBeforeSending(latest, { displayName: 'Amani', email: 'amani@msingi.test' })).toBe('I will email you what I just said, to amani@msingi.test. Nobody else is copied. Send it?');
    const mail = theMail(latest, { displayName: 'Amani Wekesa', email: 'amani@msingi.test' });
    expect(mail.subject).toBe('Groundwork - I have added "book the room" to your to-dos for Friday');
    expect(mail.text).not.toMatch(/You asked: /);
  });

  it('says sent only when it went', () => {
    expect(whatBecameOfIt('sent', 'amani@msingi.test')).toBe('I have sent it to amani@msingi.test. Nobody else was copied.');
    expect(whatBecameOfIt('held', 'amani@msingi.test')).toBe('It is not sent yet. It is waiting to go to amani@msingi.test, and nobody else will be copied.');
    expect(whatBecameOfIt('suppressed', 'amani@msingi.test')).toBe('I have not sent it, because you have turned this kind of email off. It is still here.');
  });
});

describe('a phone is never told to choose a file (Ask #41)', () => {
  it('the model’s own reason for not finding it is rewritten for WhatsApp', async () => {
    const web = { lane: 'answer_from_documents', composedBy: 'rules', blocks: [{ type: 'text', body: `I looked through the available records, and there is no information about anyone being off next week. ${WHAT_ASK_CAN_DO}` }] } as any;
    const phone = await forSomeoneWithNoScreen(null, null, web, 'whos off next week');
    expect(textOf(phone)).not.toMatch(/Choose a file/);
  });
});

describe('what a check-in is for, and the Desk (Ask #28, #48)', () => {
  const prisma = (g: any) => ({
    ground: { findMany: jest.fn(async () => [g]) },
    groundParticipant: { findMany: jest.fn(async () => []) },
    user: { findUnique: jest.fn(async () => ({ firstName: 'Amani' })) },
  });

  it('Amani reads the purpose her check-in page shows, and no note about privacy', async () => {
    const g = { id: 'g1', label: 'Sales team, Q4', initiatorId: 'lead-1', brief: 'Close 40 shops.', toldToParticipants: 'We track new shops, payments and visits each week.', scenario: 'TEAM_UPDATES', peersVisibleToEachOther: true, organization: { name: 'Msingi Foods' }, initiator: { firstName: 'Wairimu' } };
    const said = await whatMyCheckInIsFor(prisma(g), 'org-a', 'u-amani');
    expect(said).toMatch(/^This is what "Sales team, Q4" is for\. We track new shops, payments and visits each week\./);
    expect(said).not.toMatch(/stay private/);
  });

  it('a priority nobody has written about points to the Desk in two plain sentences', async () => {
    expect(await isTheStrategyMoving({}, {}, { userId: 'u-1', organizationId: 'org-a', role: 'MEMBER' }))
      .toBe('Nothing you can read says yet how "40 new shops by December" is moving. The Desk shows each priority as soon as there is something you may read about it.');
  });
});
