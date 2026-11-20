import { sendHeresWhatIsNew, theWhatIsNewWords, whereOneStands, thereIsASessionToCome } from './heres-what-is-new';
import { ROUTINE_EMAILS } from './one-routine-message-a-day';
import { whatThisMailIs, whetherToSend } from '../email/nothing-goes-out-that-was-turned-off';
import { ENGAGEMENT_MOMENT_KEY as RELEASE_MOMENT_KEY } from './the-engagement-release-moment';

/**
 * "HERE IS WHAT IS NEW", AS AN EXISTING CLIENT READS IT (decision 109 item 2).
 *
 * Wairimu has led "Sales team, Q4" since before the release: Miriam, Bisi, Femi, Kofi and Amina have checked in, Omar has not. She also led "Old
 * pilot", which stalled before the release. She is sent one email from her own check-in, once; the stalled one is not mentioned, and a lead whose
 * only check-in stalled, or who joined after the release, is sent nothing.
 */
const RELEASE = new Date('2026-10-01T00:00:00Z');
const NOW = new Date('2026-10-02T08:00:00Z');
const row = (first: string, status: string, userId = `u-${first}`) => ({ status, sessionNumber: 3, participant: { userId, managingOnly: false, nameGiven: null, user: { firstName: first, awaitingOrgApproval: false } } });

function world(opts: { grounds?: any[]; had?: boolean; inactive?: boolean } = {}) {
  const asked: any[] = [];
  const sent: any[] = [];
  const prisma: any = {
    platformSetting: { findUnique: async () => ({ value: { at: RELEASE.toISOString() } }) },
    ground: { findMany: async ({ where }: any) => { asked.push(where); return opts.grounds ?? [{ id: 'g1', label: 'Sales team, Q4', initiatorId: 'u-w', runsUntilEnded: true }]; } },
    checkIn: { findMany: async () => [...['Miriam', 'Bisi', 'Femi', 'Kofi', 'Amina'].map((n) => row(n, 'COMPLETED')), row('Omar', 'NOT_STARTED')] },
    user: { findUnique: async () => ({ email: 'wairimu@baridi.test', firstName: 'Wairimu', deletedAt: null, isActive: opts.inactive === false ? false : true }) },
    notification: { findFirst: async () => (opts.had ? { id: 'n' } : null) },
  };
  const email = { sendHeresWhatIsNew: jest.fn(async (to: string, subject: string, lines: string[], linkLabel: string, linkUrl: string) => { sent.push({ to, subject, lines, linkLabel, linkUrl }); }) };
  return { prisma, run: () => sendHeresWhatIsNew({ prisma, email, frontendUrl: 'https://app.test/' }, NOW), sent, asked };
}

describe('what Wairimu reads', () => {
  it('where her check-in stands today, then what is new, then how to stop it', async () => {
    const w = world();
    expect(await w.run()).toEqual({ tried: 1 });
    expect(w.sent).toEqual([{
      to: 'wairimu@baridi.test',
      /* Changed 19 October (messages test, finding 17): the subject says which check-in its count is about, as the body does. */
      /* Changed 3 November (F5 part 3): the one count's own sentence (grounds/this-sessions-count.ts). */
      subject: '5 of 6 have checked in on "Sales team, Q4", and here is what is new',
      lines: [
        'Hello Wairimu. Here is where your check-ins stand today.',
        'In "Sales team, Q4", 5 of 6 have checked in; Omar hasn’t started yet.',
        'What is new is that Groundwork now follows up with each person about the thing they said they would do, in their own words and only to them.',
        'On Fridays, when your team has done something that week, Groundwork also sends you a short letter about it. The email that tells you a shared picture is ready now says what the picture found.',
        'The link at the bottom of any of these emails stops the ones I decide to send. So does Settings, where you can also turn them back on.',
      ],
      linkLabel: 'See your check-ins',
      linkUrl: 'https://app.test/grounds',
    }]);
  });

  it('only asks for check-ins made before the release that are still going, so a stalled one is never mentioned', async () => {
    const w = world();
    await w.run();
    expect(w.asked[0].createdAt).toEqual({ lt: RELEASE });
    expect(w.asked[0].status.notIn).toEqual(expect.arrayContaining(['STALLED', 'PAUSED']));
  });

  /* Changed 3 November (F5 part 3): Ask and What's new say the one count's own sentence (grounds/this-sessions-count.ts), as Today, the board and the list do; their own count wording is gone. */
  it('says several check-ins in one subject, and each in its own sentence', () => {
    const w = theWhatIsNewWords('Wairimu', [{ label: 'A', ofHowMany: 4, answered: 4, notYet: [], says: 'All 4 have checked in.' }, { label: 'B', ofHowMany: 3, answered: 0, notYet: [], says: 'Nobody has checked in yet; Omar, Bisi and Femi haven’t started yet.' }]);
    expect(w!.subject).toBe('Here is where your two check-ins stand, and what is new');
    expect(w!.lines.slice(1, 3)).toEqual(['In "A", all 4 have checked in.', 'In "B", nobody has checked in yet; Omar, Bisi and Femi haven’t started yet.']);
  });

  it('says the one count\'s sentence, with who is missing named once', () => {
    expect(whereOneStands({ label: 'X', ofHowMany: 4, answered: 2, notYet: [], says: '2 of 4 have checked in; Peter and Mary haven’t joined yet.' })).toBe('In "X", 2 of 4 have checked in; Peter and Mary haven’t joined yet.');
  });
});

describe('the follow-up line is only said where it is true', () => {
  const a = { label: 'A', ofHowMany: 4, answered: 4, notYet: [], says: 'All 4 have checked in.' };
  it('said for a check-in with a session still to come', () => {
    expect(theWhatIsNewWords('W', [{ ...a, moreToCome: true }])!.lines).toContain('What is new is that Groundwork now follows up with each person about the thing they said they would do, in their own words and only to them.');
  });
  it('and where no check-in has one there is nothing new to say, so nothing is sent', () => {
    expect(theWhatIsNewWords('W', [{ ...a, moreToCome: false }])).toBeNull();
  });
  it('said for the one that has one, by name, when only some do', () => {
    const l = theWhatIsNewWords('W', [{ ...a, moreToCome: true }, { ...a, label: 'B', moreToCome: false }])!.lines.join(' ');
    expect(l).toContain('follows up in "A" with each person');
    expect(l).not.toContain('"B" with');
  });
  it('a session is still to come when it runs until ended or its planned end is ahead, and not when that has passed', () => {
    expect(thereIsASessionToCome({ runsUntilEnded: true }, NOW)).toBe(true);
    expect(thereIsASessionToCome({ createdAt: new Date('2026-09-01T00:00:00Z'), timelineDays: 90 }, NOW)).toBe(true);
    expect(thereIsASessionToCome({ createdAt: new Date('2026-06-01T00:00:00Z'), timelineDays: 30 }, NOW)).toBe(false);
    expect(thereIsASessionToCome({ endsAt: new Date('2026-09-30T00:00:00Z') }, NOW)).toBe(false);
  });
});

describe('a check-in left open that has nothing more to come', () => {
  it('is never mentioned, and a lead with only that gets nothing', async () => {
    const dead = [{ id: 'g1', label: 'Old pilot', initiatorId: 'u-w', runsUntilEnded: false, endsAt: new Date('2026-09-15T00:00:00Z'), createdAt: new Date('2026-06-01T00:00:00Z'), timelineDays: 30 }];
    expect(await world({ grounds: dead }).run()).toEqual({ tried: 0 });
  });
});

describe('who is not written to', () => {
  it('a lead who has had it', async () => { expect(await world({ had: true }).run()).toEqual({ tried: 0 }); });
  it('a lead with no check-in made before the release and still going', async () => { expect(await world({ grounds: [] }).run()).toEqual({ tried: 0 }); });
  it('a lead who has left', async () => { expect(await world({ inactive: false }).run()).toEqual({ tried: 0 }); });
  it('and it is a routine mail we decided to send, so the opt-out and the one a day hold', () => {
    expect(whatThisMailIs('sendHeresWhatIsNew')).toBe('we decided to send it');
    expect(ROUTINE_EMAILS.has('sendHeresWhatIsNew')).toBe(true);
    expect(whetherToSend('we decided to send it', { unsubscribedAt: new Date() }, 'sendHeresWhatIsNew')).toMatchObject({ send: false });
  });
});

describe('the subject and the lead\'s own line', () => {
  it('nobody has checked in', () => {
    expect(theWhatIsNewWords('W', [{ label: 'Sales team, Q4', ofHowMany: 5, answered: 0, notYet: [], moreToCome: true, says: 'Nobody has checked in yet.' }])!.subject).toBe('Nobody has checked in yet on "Sales team, Q4", and here is what is new');
  });
  it('one of five has', () => {
    expect(theWhatIsNewWords('W', [{ label: 'Sales team, Q4', ofHowMany: 5, answered: 1, notYet: ['Omar'], moreToCome: true, says: '1 of 5 has checked in; Omar hasn’t started yet.' }])!.subject).toBe('1 of 5 has checked in on "Sales team, Q4", and here is what is new');
  });
  it('the lead who has not checked in is "you", with the right verb', () => {
    expect(whereOneStands({ label: 'X', ofHowMany: 3, answered: 2, notYet: ['you'], says: '2 of 3 have checked in; you haven’t started yet.' })).toBe('In "X", 2 of 3 have checked in; you haven’t started yet.');
  });
  it('a check-in where only the lead is in it is left out, and a lead with only that gets nothing', async () => {
    const w = world();
    (w.prisma as any).checkIn.findMany = async () => [row('Wairimu', 'COMPLETED', 'u-w')];
    expect(await w.run()).toEqual({ tried: 0 });
  });
});
