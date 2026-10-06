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
  return { run: () => sendHeresWhatIsNew({ prisma, email, frontendUrl: 'https://app.test/' }, NOW), sent, asked };
}

describe('what Wairimu reads', () => {
  it('where her check-in stands today, then what is new, then how to stop it', async () => {
    const w = world();
    expect(await w.run()).toEqual({ tried: 1 });
    expect(w.sent).toEqual([{
      to: 'wairimu@baridi.test',
      subject: '5 of 6 people have checked in on "Sales team, Q4", and here is what is new',
      lines: [
        'Hello Wairimu. Here is where your check-ins stand today.',
        'In "Sales team, Q4", 5 of 6 people have checked in, and Omar has not yet.',
        'What is new is that Groundwork now follows up with each person about the thing they said they would do, in their own words and only to them.',
        'You can also stop the emails we decide to send from the link at the bottom of any of them, or in Settings, and turn them back on in Settings. Emails you ask for, such as sign-in links and reports, always reach you.',
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

  it('says several check-ins in one subject, and each in its own sentence', () => {
    const w = theWhatIsNewWords('Wairimu', [{ label: 'A', ofHowMany: 4, answered: 4, notYet: [] }, { label: 'B', ofHowMany: 3, answered: 0, notYet: [] }]);
    expect(w.subject).toBe('Here is where your 2 check-ins stand, and what is new');
    expect(w.lines.slice(1, 3)).toEqual(['In "A", all 4 people have checked in.', 'In "B", nobody has checked in yet, out of 3 people.']);
  });

  it('says nothing about anybody beyond first names of those who have not yet checked in', () => {
    expect(whereOneStands({ label: 'X', ofHowMany: 9, answered: 3, notYet: ['Omar', 'Bisi', 'Femi'] })).toBe('In "X", 3 of 9 people have checked in, and Omar, Bisi, Femi and 3 others have not yet.');
  });
});

describe('the follow-up line is only said where it is true', () => {
  const a = { label: 'A', ofHowMany: 4, answered: 4, notYet: [] };
  it('said for a check-in with a session still to come', () => {
    expect(theWhatIsNewWords('W', [{ ...a, moreToCome: true }]).lines).toContain('What is new is that Groundwork now follows up with each person about the thing they said they would do, in their own words and only to them.');
  });
  it('not said at all where no check-in has one', () => {
    expect(theWhatIsNewWords('W', [{ ...a, moreToCome: false }]).lines.join(' ')).not.toMatch(/follows up/);
  });
  it('said for the one that has one, by name, when only some do', () => {
    const l = theWhatIsNewWords('W', [{ ...a, moreToCome: true }, { ...a, label: 'B', moreToCome: false }]).lines.join(' ');
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
