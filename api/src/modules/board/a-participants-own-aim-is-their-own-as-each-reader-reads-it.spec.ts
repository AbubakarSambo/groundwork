import { GroundScenario, PartyType } from '@prisma/client';
import { boardAs, person, AMINA, RUKIA, BARAKA, JUMA, SETUP_ADMIN } from './the-switchboards-sections-harness';
import { anAimAsASentence, theAimItself, yourOwnAimIsYours } from './an-aim-is-a-sentence-about-somebody';
import { theTargetAsASentence } from '../conversation/each-target-is-a-sentence-about-whoever-set-it';
import { aTargetThisWeek } from '../reports/the-weekly-report';
import { aCountThatMovedSaid } from '../reports/a-count-that-moved-is-one-sentence';
import { whatAParticipantIsToldAboutThis } from '../grounds/what-a-participant-is-told-about-this';

/**
 * DECISION 75, ITEM 37: A PERSON'S OWN AIM IS THEIR OWN, ON EVERY SURFACE THAT SHOWS IT.
 *
 * Rukia said in her own check-in "I am aiming for 3 shops in Kilimani." It went on the board as her
 * target, and read exactly like a number Amina, who runs the check-in, set for her: "You are aiming for
 * 3 shops in Kilimani." to Rukia, "Rukia Mwangi is aiming for 3 shops in Kilimani." to Amina. Now:
 *   Rukia:   "Your own aim is 3 shops in Kilimani."
 *   others:  "Rukia Mwangi's own aim is 3 shops in Kilimani." (no guessed pronoun)
 * A number Amina set for Baraka still reads "Baraka Otieno is aiming for 5 visits a week.".
 */
const target = (id: string, name: string, n: number, owner: string | null, setBy: string | null) => ({
  id, groundId: 'g-1', name, target: n, count: 1, prevCount: 1, ownerParticipantId: owner, setByParticipantId: setBy,
  direction: null, isADecisionAboutAPerson: false, sortOrder: owner ? 1 : 0, addedAtSession: null, assumes: [], suggestedCount: null, suggestedSaid: null,
});
const RUKIAS_OWN = target('o-rukia', 'I am aiming for 3 shops in Kilimani.', 3, 'p-rukia', 'p-rukia');
const SET_FOR_BARAKA = target('o-baraka', 'visits a week', 5, 'p-baraka', 'p-amina');
const THE_TEAMS = target('o-team', 'shops onboarded', 20, null, 'p-amina');
const ALL = [THE_TEAMS, RUKIAS_OWN, SET_FOR_BARAKA];
const names = async (setup: any, who: readonly [string, string]) => ((await boardAs(setup, who[0], who[1])).objectives ?? []).map((o: any) => o.name);

describe('on the board, as each reader reads it', () => {
  it('Rukia reads her own aim as one she set herself', async () => {
    expect(await names({ objectives: ALL }, RUKIA)).toEqual([
      'The team is aiming for 20 shops onboarded.',
      'Your own aim is 3 shops in Kilimani.',
    ]);
  });

  it('Amina, who runs it, reads Rukia\'s aim as Rukia\'s own, and Baraka\'s number as one she set', async () => {
    expect(await names({ objectives: ALL }, AMINA)).toEqual([
      'The team is aiming for 20 shops onboarded.',
      'Rukia Mwangi\'s own aim is 3 shops in Kilimani.',
      'Baraka Otieno is aiming for 5 visits a week.',
    ]);
  });

  it('the admin who set it up reads every aim, as Amina does (decision 86); Baraka reads only the team\'s aim and his own', async () => {
    /* A person's board is their own (request 105, part 3). An admin sees the figures (decision 86). */
    expect(await names({ objectives: ALL, createdByUserId: 'u-setup' }, SETUP_ADMIN)).toEqual([
      'The team is aiming for 20 shops onboarded.',
      'Rukia Mwangi\'s own aim is 3 shops in Kilimani.',
      'Baraka Otieno is aiming for 5 visits a week.',
    ]);
    expect(await names({ objectives: ALL, whoSeesTargets: 'EVERYBODY' }, BARAKA)).toEqual(['The team is aiming for 20 shops onboarded.', 'You are aiming for 5 visits a week.']);
    expect(await names({ objectives: ALL, whoSeesTargets: 'EVERYBODY', peersVisibleToEachOther: false }, BARAKA)).toEqual(['The team is aiming for 20 shops onboarded.', 'You are aiming for 5 visits a week.']);
  });

  it('Baraka, where each person sees only their own numbers, reads nothing of Rukia\'s aim', async () => {
    expect((await names({ objectives: ALL }, BARAKA)).join(' ')).not.toMatch(/Rukia|Kilimani/);
  });

  /* Decision 86 reverses decision 73 for admins: this used to pin that Juma read only the team's aim. */
  it('Juma, an admin who only reads, reads every aim, as Amina does', async () => {
    expect(await names({ objectives: ALL }, JUMA)).toEqual([
      'The team is aiming for 20 shops onboarded.',
      'Rukia Mwangi\'s own aim is 3 shops in Kilimani.',
      'Baraka Otieno is aiming for 5 visits a week.',
    ]);
  });

  it('the person reviewed on a performance plan reads their own aim as theirs', async () => {
    const got = await names({ scenario: GroundScenario.PIP, objectives: [RUKIAS_OWN] }, RUKIA);
    expect(got).toEqual(['Your own aim is 3 shops in Kilimani.']);
  });

  it('Rukia\'s own share says the same', async () => {
    const b = await boardAs({ objectives: ALL }, ...RUKIA);
    expect(b.yourShare[0].says).toBe('Your own aim is 3 shops in Kilimani. You have 1 of the 3 so far.');
  });

  it('an aim the lead set for herself is never read as a participant\'s own', async () => {
    const lead = target('o-lead', 'approved facilities', 40, 'p-amina', 'p-amina');
    expect(await names({ objectives: [lead] }, AMINA)).toEqual(['You are aiming for 40 approved facilities.']);
  });
});

describe('the sentence, wherever an aim is said', () => {
  it('finds the thing aimed for, or keeps the person\'s own sentence where it cannot', () => {
    expect(theAimItself('I am aiming for 3 shops in Kilimani.', 3)).toBe('3 shops in Kilimani');
    expect(theAimItself('I want 5 visits a week.', 5)).toBe('5 visits a week');
    expect(theAimItself('shops in Kilimani', 3)).toBe('3 shops in Kilimani');
    expect(theAimItself('I want to see my own customers more.', 4)).toBeNull();
    expect(anAimAsASentence('I want to see my own customers more.', { speaker: 'Rukia Mwangi', holder: 'Rukia Mwangi', target: 4, setByTheHolder: true }))
      .toBe('Rukia Mwangi wants to see the own customers more. Rukia Mwangi set this aim.'.replace('the own', 'Rukia Mwangi\'s own'));
    expect(yourOwnAimIsYours('You want to see your own customers more. You set this aim for their own work.'))
      .toBe('You want to see your own customers more. You set yourself this aim.');
  });

  it('in Rukia\'s own check-in, the target she is given is hers', () => {
    const who = { readerId: 'p-rukia', readerFirstName: 'Rukia', leadId: 'p-amina', firstNameOf: (id: string) => ({ 'p-amina': 'Amina', 'p-rukia': 'Rukia', 'p-baraka': 'Baraka' } as any)[id] ?? null };
    expect(theTargetAsASentence(RUKIAS_OWN, who)).toBe('Your own aim is 3 shops in Kilimani.');
    /* And in Baraka's, where he may read it. */
    expect(theTargetAsASentence(RUKIAS_OWN, { ...who, readerId: 'p-baraka', readerFirstName: 'Baraka' })).toBe('Rukia\'s own aim is 3 shops in Kilimani.');
  });
});

describe('the weekly report, Today and "since the last round"', () => {
  const week: any = { id: 'o-rukia', name: 'I am aiming for 3 shops in Kilimani.', target: 3, direction: null, ownerParticipantId: 'p-rukia', isADecisionAboutAPerson: false, count: 1, from: 0, setByTheHolder: true };
  it('Rukia reads her own aim as one she set herself; it read "I am aiming for 3 shops in Kilimani, your own number"', () => {
    expect(aTargetThisWeek(week, 'you', false)).toEqual({
      figure: '1',
      of: '3 shops in Kilimani, your own aim',
      says: 'Your own aim is 3 shops in Kilimani. Your count went from 0 to 1 this week.',
    });
  });
  it('Amina reads it as Rukia\'s own (in labels until it is served)', () => {
    expect(aTargetThisWeek(week, { label: 'Participant A' }, true)).toEqual({
      figure: '1',
      of: '3 shops in Kilimani, Participant A\'s own aim',
      says: 'Participant A\'s own aim is 3 shops in Kilimani. Participant A\'s count went from 0 to 1 this week.',
    });
  });
  it('a number the lead set reads as before', () => {
    expect(aTargetThisWeek({ ...week, name: 'visits a week', target: 5, setByTheHolder: false }, 'you', false)?.of).toBe('visits a week, your own number');
  });
  it('a count that moved says whose own aim it was against', () => {
    expect(aCountThatMovedSaid({ name: 'shops in Kilimani', target: 3, count: 1, prevCount: 0 }, { whose: 'you', againstTheAim: true, about: { speaker: 'P', holder: 'P', setByTheHolder: true } }))
      .toBe('Your shops in Kilimani went from 0 to 1, against your own aim of 3.');
    expect(aCountThatMovedSaid({ name: 'shops in Kilimani', target: 3, count: 1, prevCount: 0 }, { whose: { name: 'Rukia Mwangi' }, againstTheAim: true, about: { speaker: 'Rukia Mwangi', holder: 'Rukia Mwangi', setByTheHolder: true } }))
      .toBe('Rukia Mwangi\'s shops in Kilimani went from 0 to 1, against Rukia Mwangi\'s own aim of 3.');
    expect(aCountThatMovedSaid({ name: 'visits a week', target: 5, count: 2, prevCount: 0 }, { whose: { name: 'Baraka Otieno' }, againstTheAim: true, about: { speaker: 'Amina Wanjiru', holder: 'Baraka Otieno' } }))
      .toBe('Baraka Otieno\'s visits a week went from 0 to 2, against the aim of 5.');
  });
});

describe('"About this check-in", in each person\'s own check-in', () => {
  const RUKIAS: any = { name: 'I am aiming for 3 shops in Kilimani.', target: 3, ownerParticipantId: 'p-rukia', setByParticipantId: 'p-rukia' };
  const about = (reader: string, nameOf: (id: string) => string | null) => whatAParticipantIsToldAboutThis(null, [RUKIAS], { readerParticipantId: reader, leadParticipantId: 'p-amina', nameOf });
  it('Rukia is told her own aim as hers', () => {
    expect(about('p-rukia', () => 'Rukia')).toBe('Your own aim is 3 shops in Kilimani.');
  });
  it('Baraka, where he may read it, is told it is Rukia\'s own, never "Your lead is aiming for"', () => {
    expect(about('p-baraka', () => 'Rukia')).toBe('Rukia\'s own aim is 3 shops in Kilimani.');
    expect(about('p-baraka', () => null)).toBe('A colleague\'s own aim is 3 shops in Kilimani.');
  });
  it('a number the lead set for Baraka is still told as a goal', () => {
    expect(whatAParticipantIsToldAboutThis(null, [{ name: 'visits a week', target: 5, ownerParticipantId: 'p-baraka', setByParticipantId: 'p-amina' } as any], { readerParticipantId: 'p-baraka', leadParticipantId: 'p-amina' }))
      .toBe('Your goal is visits a week, and the number to reach is 5.');
  });
});
