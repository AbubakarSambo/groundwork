import { GroundScenario, PartyType } from '@prisma/client';
import { readFileSync } from 'fs';
import { join } from 'path';
import { THE_SCENARIO_TABLE, whatThisCheckInIsFor, whichStage } from './the-scenario-table';

/**
 * THE CARD AND THE PACK WERE TWO DIFFERENT PRODUCTS.
 *
 * The card for OKR_ALIGNMENT promises "set goals, targets or OKRs for your team... you can see what
 * is on track". The pack behind it said "MOMENT: OKR alignment across teams. PURPOSE: Each person
 * submits their own OKRs and shows how they connect to the company OKRs... before the planning cycle
 * locks in."
 *
 * So a lead who came to set targets was asked three times how her objective connected to the company
 * direction and could not get away from it. The conversation was not malfunctioning: it was
 * faithfully running a scenario nobody picked. Her words: "this scenario sets goals to track and you
 * accidently turn it into aligning on the goals."
 *
 * The table at docs/THE-SCENARIO-TABLE.md is the source of truth. Where a pack disagrees with it,
 * the table wins. This file is what stops them separating again.
 */
describe('the card and the pack are one product', () => {
  const scenarios = Object.keys(GroundScenario) as GroundScenario[];

  it('every scenario the product can run has a row, so none inherits a neighbour’s', () => {
    const missing = scenarios.filter((s) => !THE_SCENARIO_TABLE[s]);
    expect(missing).toEqual([]);
    expect(Object.keys(THE_SCENARIO_TABLE)).toHaveLength(scenarios.length);
  });

  it('and the name in the table is the name on the card the person clicked', () => {
    /* The client's catalogue is what a person reads before they choose. If these two ever differ,
       somebody is being sold one thing and given another, which is the whole fault. */
    /* Comments out first: a name quoted in an explanation is not a name on a card. */
    const catalogue = readFileSync(
      join(__dirname, '..', '..', '..', '..', 'client', 'src', 'lib', 'scenario-catalog.ts'),
      'utf8',
    )
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/^\s*\/\/.*$/gm, '');
    /* The anchor's situation has no card to click: its door is the shared link, so there is no card for its name to differ from. */
    for (const s of scenarios.filter((x) => x !== GroundScenario.HELP_TEAM_UNDERSTAND)) {
      const row = THE_SCENARIO_TABLE[s]!;
      expect(catalogue).toContain(`${s}: '${row.name.replace(/'/g, "\\'")}'`);
    }
  });

  it('and no row is allowed to differ from its card, because one exception becomes twenty', () => {
    /*
     * There WAS one. SNAPSHOT's card said "Take One Read, Today" rather than the table's "Take the
     * Pulse of the Team", to keep the word "pulse" off the scenario that is not called PULSE_CHECK.
     * The enum names lie - PULSE_CHECK is the recurring read - so the reasoning was protecting a
     * confusion rather than the person. The two are told apart by what they say they do.
     */
    expect(scenarios.filter((s) => (THE_SCENARIO_TABLE[s] as any).cardName)).toEqual([]);
  });

  it.each(scenarios)('%s says what each of the six check-ins is for', (s) => {
    const row = THE_SCENARIO_TABLE[s]!;
    for (const side of [row.lead, row.participant]) {
      for (const stage of ['first', 'second', 'last'] as const) {
        expect(side[stage].trim().length).toBeGreaterThan(10);
      }
    }
    /* Six genuinely different cells. A pack with one voice runs session four as session one. */
    const six = [row.lead.first, row.lead.second, row.lead.last, row.participant.first, row.participant.second, row.participant.last];
    expect(new Set(six).size).toBe(6);
  });

  it('puts the right cell in front of the model', () => {
    const lead = whatThisCheckInIsFor(GroundScenario.OKR_ALIGNMENT, PartyType.INITIATOR, 'first');
    expect(lead).toContain('Set goals and keep the team on track');
    expect(lead).toContain('Set goals and understand what each person is working towards.');

    const later = whatThisCheckInIsFor(GroundScenario.OKR_ALIGNMENT, PartyType.PARTICIPANT, 'second');
    expect(later).toContain('Share progress, blockers, and what they need.');
    expect(later).toMatch(/what has happened since/i);

    const end = whatThisCheckInIsFor(GroundScenario.OKR_ALIGNMENT, PartyType.INITIATOR, 'last');
    expect(end).toContain('See what was achieved and what still needs attention.');
    expect(end).toMatch(/where did this get to/i);
  });

  it('names the three stages as understand, what changed, where it landed', () => {
    expect(whatThisCheckInIsFor(GroundScenario.PIP, PartyType.INITIATOR, 'first'))
      .toMatch(/Establish their picture of it\. Do not interrogate them/);
    expect(whatThisCheckInIsFor(GroundScenario.PIP, PartyType.INITIATOR, 'second'))
      .toMatch(/Pick up the thread/);
    expect(whatThisCheckInIsFor(GroundScenario.PIP, PartyType.INITIATOR, 'last'))
      .toMatch(/Close the loop/);
  });

  describe('which of the three a session is', () => {
    it('is the first one first', () => {
      expect(whichStage(1, 6)).toBe('first');
    });

    it('and the last one last, however many there are', () => {
      expect(whichStage(6, 6)).toBe('last');
      expect(whichStage(2, 2)).toBe('last');
      /* A run that overran its plan is still at its end. */
      expect(whichStage(9, 6)).toBe('last');
    });

    it('and everything between is a second, because "what changed" is right for session three too', () => {
      expect(whichStage(2, 6)).toBe('second');
      expect(whichStage(3, 6)).toBe('second');
      expect(whichStage(5, 6)).toBe('second');
    });

    it('never calls a session the last one when nobody has said how many there are', () => {
      expect(whichStage(4, null)).toBe('second');
      expect(whichStage(1, null)).toBe('first');
    });
  });
});

/*
 * A second version of a pack, wrong, reaching nobody. The per-party builder was corrected in
 * Wave 0 and the legacy record was not, so the file held both and only one was right - which is
 * how it sat there being wrong for as long as nothing read it.
 */
describe('there is one recognition pack, not two', () => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const lib = require('./prompt-library');

  it('nothing anywhere still asks the person deciding what they are asking for', () => {
    const source = readFileSync(join(__dirname, 'prompt-library.ts'), 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/^\s*\/\/.*$/gm, '');
    expect(source).not.toMatch(/OPENING QUESTIONS - raise or equity/);
    expect(source).not.toMatch(/What are you asking for\? Name the specific ask/);
  });

  it('the legacy record composes from the same builder as everything else', () => {
    const { SCENARIO_PACKS, buildScenarioPackForParty } = lib;
    expect(SCENARIO_PACKS[GroundScenario.RECOGNITION])
      .toContain(buildScenarioPackForParty(GroundScenario.RECOGNITION, PartyType.INITIATOR));
  });

  it('and it reads as the decision it is', () => {
    expect(lib.SCENARIO_PACKS[GroundScenario.RECOGNITION]).toMatch(/WHAT IS BEING WEIGHED/);
  });
});
