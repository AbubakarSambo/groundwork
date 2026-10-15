import { GroundScenario } from '@prisma/client';
import { boardAs, AMINA, RUKIA, BARAKA, JUMA, SETUP_ADMIN, handoff } from './the-switchboards-sections-harness';
import { aPartyOutside } from './a-thing-is-not-somebody';
import { anAimAsASentence } from './an-aim-is-a-sentence-about-somebody';
import { whatToProbe, type ProbeInput } from '../reports/what-to-probe';
import { theVerbAgreesWithYouIn } from '../reports/party-labels';
import { whereYouAreAgainstWhatYouNamed } from '../reports/where-you-are-against-what-you-named';

/**
 * REQUEST 107 (b): EVERY SENTENCE THE REVIEW OF THE BOARDS FOUND BREAKING THE RULES, AS EACH READER
 * READS IT (screens workspace, 1 October 2026).
 *
 * Each case below is served the way the person reads it, and checks the words they read. The waits are
 * the shapes the review and the runs found (api/journey/all-24/re-f): a wait whose "on" is the same thing
 * as what is waited for, a wait on a decision rather than a person, and a blocker whose person is known.
 */
const everyString = (v: any, out: string[] = []): string[] => {
  if (typeof v === 'string') out.push(v);
  else if (Array.isArray(v)) v.forEach((x) => everyString(x, out));
  else if (v && typeof v === 'object') Object.values(v).forEach((x) => everyString(x, out));
  return out;
};

const WAITS = [
  handoff('d-structure', 'p-rukia', 'the data structure decision', { onLabel: 'the data structure decision', status: 'BLOCKING' }),
  handoff('d-owners', 'p-baraka', 'owners with dates for the API format', { onLabel: 'a decision on who owns them', status: 'WAITING' }),
  handoff('d-pipeline', 'p-rukia', 'the pipeline fix', { status: 'BLOCKING' }),
];
const REPORT = {
  divergences: [{ topic: 'There is no shared understanding of who owns the release.', positions: [{ participantLabel: 'one' }, { participantLabel: 'two' }] }],
};

describe('a wait on a thing is not said as a wait on somebody', () => {
  it('tells a thing from somebody', () => {
    expect(aPartyOutside({ onLabel: 'the data structure decision', what: 'the data structure decision' })).toBe(false);
    expect(aPartyOutside({ onLabel: 'a decision on who owns them', what: 'owners with dates for the API format' })).toBe(false);
    expect(aPartyOutside({ onLabel: 'the pipeline fix', what: 'the release' })).toBe(false);
    /* Real waits from the re-f run, each on somebody. */
    expect(aPartyOutside({ onLabel: 'the loan provider', what: 'cancellation of this loan' })).toBe(true);
    expect(aPartyOutside({ onLabel: 'the Head of Credit', what: 'a reply to my escalation' })).toBe(true);
    expect(aPartyOutside({ onLabel: 'the credit committee', what: 'approval for 11 files' })).toBe(true);
    expect(aPartyOutside({ onLabel: 'the customers', what: 'bank statements' })).toBe(true);
    expect(aPartyOutside({ onLabel: 'Mr. Adebayo', what: 'a date for the credit decision' })).toBe(true);
  });

  for (const [name, reader] of Object.entries({ Amina: AMINA, Rukia: RUKIA, Baraka: BARAKA, Juma: JUMA, 'the admin who set it up': SETUP_ADMIN })) {
    it(`as ${name}, nothing is waited on from itself, and a decision is never a person`, async () => {
      const b = await boardAs({ dependencies: WAITS, report: REPORT }, reader[0], reader[1]);
      const served = everyString(b).join('\n');
      expect(served).not.toMatch(/until it comes from the data structure decision/);
      expect(served).not.toMatch(/waiting on a decision on who owns them for/);
      expect(served).not.toMatch(/said different things about There/);
      expect(served).not.toContain('Lead and team');
      expect(served).not.toMatch(/Somebody is waiting on/);
    });
  }

  it('the lead reads each wait in full sentences', async () => {
    const b = await boardAs({ dependencies: WAITS, report: REPORT }, ...AMINA);
    expect(b.risks.map((r: any) => r.says)).toEqual(expect.arrayContaining([
      'Rukia Mwangi cannot move on the data structure decision, and nobody has been named to provide it.',
      'Baraka Otieno is waiting for owners with dates for the API format, and nobody has been named to provide it. That waits on a decision on who owns them.',
    ]));
    expect(b.decisions).toEqual(expect.arrayContaining([
      /* A fix to the pipeline is something to provide, not a decision (item 21): it no longer says "so it needs deciding". */
      expect.objectContaining({ question: 'Rukia Mwangi is waiting for the pipeline fix, and nobody has been named to provide it.', owner: 'Nobody has been named to provide it.' }),
      expect.objectContaining({
        question: 'People in this check-in said different things. There is no shared understanding of who owns the release. This needs settling.',
        owner: 'You',
      }),
    ]));
  });

  /* Request 105 (the prototype's B5): what needs deciding is the lead's agenda, so a person who checks in is no
     longer served the list; their own waits are in their risks and blockers, as theirs. Before, Rukia read
     "You are waiting on the pipeline fix, so it needs deciding." among the decisions. */
  it('the person waiting reads it as theirs, and is not served the lead\'s list of decisions', async () => {
    const b = await boardAs({ dependencies: WAITS, report: REPORT }, ...RUKIA);
    expect(b.risks.map((r: any) => r.says)).toContain('You cannot move on the data structure decision, and nobody has been named to provide it.');
    expect(b.blockers.map((x: any) => x.says)).toEqual(expect.arrayContaining([expect.stringMatching(/^You are waiting for the pipeline fix\./)]));
    expect(b.decisions).toBeUndefined();
  });

  it('where people see only themselves, a colleague never reads another person\'s wait among the decisions', async () => {
    const b = await boardAs({ dependencies: WAITS, report: REPORT, peersVisibleToEachOther: false }, ...BARAKA);
    expect((b.decisions ?? []).map((d: any) => d.question).join('\n')).not.toMatch(/pipeline fix|data structure/);
  });

  it('on a performance plan, an admin without access reads no wait among the decisions', async () => {
    const b = await boardAs({ scenario: GroundScenario.PIP, dependencies: WAITS, report: REPORT, createdByUserId: 'u-amina' }, ...JUMA).catch(() => null);
    expect(((b?.decisions ?? []) as any[]).filter((d) => d.source === 'blocker')).toEqual([]);
  });
});

describe('the coaching probe names the person, and says "you" to the reader', () => {
  const base: ProbeInput = {
    who: 'Rukia Otieno', participantId: 'p-rukia', role: null, answeredThisSession: true, patterns: [], waitingOn: [],
    holdingUp: [
      { what: 'the plan for the launch', who: 'Baraka Mwangi', daysOld: 3 },
      { what: 'the shop list', who: 'Amani Wekesa', daysOld: 2 },
    ],
    concrete: [], documentsAttached: 0, sessionNumber: 3, totalSessions: 6, scenario: null,
  };

  it('to Rukia herself: they are waiting on you', () => {
    const p = whatToProbe({ ...base, whoInASentence: 'you' });
    expect(p.probe[0]).toBe('Baraka Mwangi and Amani Wekesa are waiting on you for 3 days for the plan for the launch and the shop list. Ask what that is waiting on.');
  });

  it('to the lead about Tobi (re-f, seniorhire): you are waiting on Tobi by name', () => {
    const p = whatToProbe({ ...base, who: 'Tobi Adewale', whoInASentence: 'Tobi Adewale', holdingUp: [{ what: 'commercial ownership', who: 'you', daysOld: 0 }] });
    expect(p.probe[0]).toBe('You are waiting on Tobi Adewale for commercial ownership. Ask what that is waiting on.');
  });

  it('a wait with no subject has one now', () => {
    const p = whatToProbe({ ...base, holdingUp: [], answeredThisSession: false, whoInASentence: 'Rukia Otieno', waitingOn: [{ what: 'the budget', who: 'Juma', daysOld: 4, escalated: false }] });
    expect(p.probe).toEqual([
      'Rukia Otieno has not answered this session, so nothing below is from this round.',
      'Rukia Otieno has been waiting for 4 days on Juma for the budget, and nothing on record says it was raised higher. Ask what has stopped Rukia Otieno raising it.',
    ]);
  });
});

describe('"their own" after what "you" did is "your own"', () => {
  it('reads as the reader\'s own', () => {
    expect(theVerbAgreesWithYouIn("Wanjiku's progress depends on you completing their own open actions."))
      .toBe("Wanjiku's progress depends on you completing your own open actions.");
    expect(theVerbAgreesWithYouIn('Across two sessions, you have not closed their own commitment.'))
      .toBe('Across two sessions, you have not closed your own commitment.');
  });
  it('leaves somebody else\'s own alone (run-19, sales)', () => {
    const t = 'You set a team disbursement target of N120 million but you have not given each person their own target.';
    expect(theVerbAgreesWithYouIn(t)).toBe(t);
  });
});

describe('nobody has said what success looks like, to each reader', () => {
  const nobody = { version: null, conditions: [] as string[], entries: [] as any[], stated: null };
  it('to the person running it', () => {
    const r = whereYouAreAgainstWhatYouNamed({ ...nobody, counting: 'everyone', readerIsTheLead: true, leadName: 'Amina Wanjiru' });
    expect(r.saying).toBe('Nobody has said what success looks like yet. You have not said it, and nobody answering this check-in has said it either. Until somebody does, the report can say where people said different things, but not whether things are going well.');
  });
  it('to an admin who reads everyone', () => {
    const r = whereYouAreAgainstWhatYouNamed({ ...nobody, counting: 'everyone', readerIsTheLead: false, leadName: 'Amina Wanjiru' });
    expect(r.saying).toBe('Nobody has said what success looks like yet. Amina Wanjiru has not said it, and nobody answering this check-in has said it either. Until somebody does, the report can say where people said different things, but not whether things are going well.');
  });
  it('to a participant who reads only their own', () => {
    const r = whereYouAreAgainstWhatYouNamed({ ...nobody, counting: 'only-yours', readerIsTheLead: false, leadName: 'Amina Wanjiru' });
    expect(r.saying).toBe('Nothing has been said yet about what success looks like. Amina Wanjiru has not said it, and you have not said it either. It appears here as soon as either of you does.');
  });
  it('no reader reads a dash', () => {
    for (const readerIsTheLead of [true, false]) {
      for (const counting of ['everyone', 'only-yours'] as const) {
        expect(whereYouAreAgainstWhatYouNamed({ ...nobody, counting, readerIsTheLead, leadName: 'Amina Wanjiru' }).saying).not.toMatch(/ - /);
      }
    }
  });
});

describe('a target named "They want ..." is about whoever holds it', () => {
  it('names the holder', () => {
    expect(anAimAsASentence('They want to get 12 shops onboarded.', { speaker: 'the lead', holder: 'Amani Wekesa', target: 12 }))
      .toBe('Amani Wekesa wants to get 12 shops onboarded.');
  });
  it('a past verb stays as it was', () => {
    expect(anAimAsASentence('I needed 3 shops in Kilimani.', { speaker: 'Amani Wekesa', holder: null, target: 3 }))
      .toBe('Amani Wekesa needed 3 shops in Kilimani.');
    expect(anAimAsASentence('I need 3 shops in Kilimani.', { speaker: 'Amani Wekesa', holder: null, target: 3 }))
      .toBe('Amani Wekesa needs 3 shops in Kilimani.');
  });
});
