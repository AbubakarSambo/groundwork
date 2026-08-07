import { Cadence, GroundScenario, PartyType } from '@prisma/client';
import { buildScenarioPackForParty, ENGINE_RULES } from './prompt-library';
import { totalSessionsFor } from '../grounds/session-count';

/**
 * THREE THINGS A LIVE RUN FOUND THAT NO TEST WOULD HAVE.
 *
 * All three came from running a twelve-session clinic-manager onboarding - which
 * doubles as a probation - as five real people against the real model. None of
 * them is exotic; all three were sitting in the first message of session one.
 */

describe('how many check-ins people are told they have', () => {
  /**
   * The engine opens with "this is the first of N check-ins". It was never given
   * N, and the fallback was a hardcoded 4, so EVERY ground on the platform said
   * four however long it actually ran. On a twelve-session probation that told
   * four people their assessment period was a third of its real length.
   */
  it('counts the sessions a ground actually holds', () => {
    expect(totalSessionsFor(90, Cadence.WEEKLY)).toBe(12);
    expect(totalSessionsFor(90, Cadence.FORTNIGHTLY)).toBe(6);
    expect(totalSessionsFor(30, Cadence.WEEKLY)).toBe(4);
  });

  it('says one for a single-session ground rather than doing the arithmetic', () => {
    expect(totalSessionsFor(90, Cadence.ONE_TIME)).toBe(1);
  });

  it('returns null rather than inventing a number when the cadence has no interval', () => {
    // SEQUENTIAL fires when the lead checks in, so it is not a function of time.
    // A wrong number here is worse than none: the engine states it as fact.
    expect(totalSessionsFor(90, Cadence.SEQUENTIAL)).toBeNull();
    expect(totalSessionsFor(null, Cadence.WEEKLY)).toBeNull();
  });

  it('never says zero, because a ground with no check-in reads as broken', () => {
    expect(totalSessionsFor(10, Cadence.MONTHLY)).toBe(1);
  });
});

describe('who is being asked, on a cohort onboarding', () => {
  const pack = (party: PartyType, moment: any) =>
    buildScenarioPackForParty(GroundScenario.COHORT_CHECK, party, moment);

  /**
   * The person running the onboarding is not in it. The pack was handed to
   * everyone, so the clinical lead who runs the programme was asked for "one
   * concrete example of something that has gone well in your clinic". She does
   * not have a clinic; her stated remit said so and was sitting in the same
   * prompt, and the pack talked straight over it.
   */
  it('does not ask the person running the onboarding about their own clinic work', () => {
    const lead = pack(PartyType.INITIATOR, 'STARTING');
    expect(lead).toMatch(/You are running an onboarding period/i);
    expect(lead).not.toMatch(/what you have actually done since starting/i);
  });

  it('asks the lead who they have got to, and who they have not', () => {
    // The failure this exists to catch: reaching the end of a probation with no
    // view of the quietest person, which is what happened in the run.
    const lead = pack(PartyType.INITIATOR, 'STARTING');
    expect(lead).toMatch(/who they have actually got to/i);
    expect(lead).toMatch(/ASK ABOUT THE ONE THEY HAVE NOT MENTIONED/i);
  });

  it('still gives the people being onboarded their own pack', () => {
    expect(pack(PartyType.PARTICIPANT, 'STARTING')).toMatch(/Onboarding a group/i);
  });

  it('gives both of them the pulse when it is not the start', () => {
    // An ongoing cohort read is the same conversation for everyone.
    expect(pack(PartyType.INITIATOR, 'RECOGNITION')).toMatch(/Cohort check-in/i);
    expect(pack(PartyType.PARTICIPANT, undefined)).toMatch(/Cohort check-in/i);
  });

  it('forbids both packs from scoring anyone or hinting at the outcome', () => {
    for (const p of [pack(PartyType.INITIATOR, 'STARTING'), pack(PartyType.PARTICIPANT, 'STARTING')]) {
      expect(p).toMatch(/NEVER:/);
      expect(p).toMatch(/decision|judgement/i);
    }
  });
});

describe('claiming to have changed something it cannot change', () => {
  /**
   * Asked about her role, the engine replied "I've updated your role in the
   * record. My apologies." It had not. There is no write path from a
   * conversation to a participant's stored remit - it only ever reads it. The
   * person leaves believing a stored field says something it does not, and the
   * board goes on reading them against the old one.
   */
  it('tells the engine plainly that it cannot write stored fields', () => {
    expect(ENGINE_RULES).toMatch(/YOU CANNOT CHANGE ANYTHING STORED ABOUT A PERSON/);
  });

  it('names the exact sentences it must not say', () => {
    expect(ENGINE_RULES).toMatch(/I've updated your role/i);
    expect(ENGINE_RULES).toMatch(/I've corrected that in the record/i);
  });

  it('gives it a true thing to say instead, rather than only a prohibition', () => {
    // A rule with no alternative gets worked around. This one has to leave the
    // person knowing where the change actually gets made.
    expect(ENGINE_RULES).toMatch(/ground's settings so it holds everywhere/i);
  });

  it('still has the engine carry the correction through the conversation', () => {
    // The opposite failure would be ignoring what someone just told you about
    // themselves because you cannot store it.
    expect(ENGINE_RULES).toMatch(/use their correction for the rest of the conversation/i);
  });
});

// ---------------------------------------------------------------------------
// The wiring that made the pack fix inert.
// ---------------------------------------------------------------------------

import { SEED_PROMPTS } from './prompt-library';

/**
 * A STORED PACK WINS OVER THE IN-CODE ONE, AND THE KEY HAD NO ROOM FOR MOMENT.
 *
 * The lookup key is scenario + party. A pack that varies by moment therefore
 * could never take effect in production: the generic stored row answered first
 * and the variation never ran. The onboarding lead kept getting the pulse
 * written for the people she was onboarding, while every test that called the
 * pack builder directly passed - including mine.
 *
 * Two things have to hold now: the moment-qualified row must exist to be found,
 * and it must actually differ from the generic one. A seed that silently
 * duplicates the generic pack would look right here and change nothing live.
 */
describe('moment-qualified packs are reachable at all', () => {
  const keys = SEED_PROMPTS.map((s) => s.key);
  const find = (k: string) => SEED_PROMPTS.find((s) => s.key === k)?.content;

  it('seeds a row for the cohort onboarding, for each party', () => {
    expect(keys).toContain('scenario.cohort_check.starting.initiator');
    expect(keys).toContain('scenario.cohort_check.starting.participant');
  });

  it('keeps the generic rows, so nothing else changes behaviour', () => {
    expect(keys).toContain('scenario.cohort_check.initiator');
    expect(keys).toContain('scenario.cohort_check.participant');
  });

  it('the moment-qualified row actually differs from the generic one', () => {
    // The failure that would look fine and do nothing.
    expect(find('scenario.cohort_check.starting.initiator')).not.toBe(find('scenario.cohort_check.initiator'));
    expect(find('scenario.cohort_check.starting.participant')).not.toBe(find('scenario.cohort_check.participant'));
  });

  it('the two parties do not get the same pack at the same moment', () => {
    expect(find('scenario.cohort_check.starting.initiator')).not.toBe(
      find('scenario.cohort_check.starting.participant'),
    );
  });

  it('adds no moment rows for scenarios that read the same at every moment', () => {
    // Seeding a row per scenario per moment would triple the table and give
    // every future edit three places to drift apart.
    // Four segments, not three. "recognition" is a scenario name as well as a
    // moment, so scenario.recognition.initiator is a generic row and matching on
    // the word alone counts it as moment-qualified.
    const momentKeys = keys.filter((k) => k.split('.').length === 4);
    expect(momentKeys.sort()).toEqual([
      'scenario.cohort_check.starting.initiator',
      'scenario.cohort_check.starting.participant',
    ]);
  });

  it('every seeded key is unique, or the later one silently wins', () => {
    expect(new Set(keys).size).toBe(keys.length);
  });
});
