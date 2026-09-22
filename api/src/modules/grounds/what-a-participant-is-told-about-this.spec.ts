import { theSituationIn, whatAParticipantIsToldAboutThis } from './what-a-participant-is-told-about-this';

/** Hafsah, 20 Sep 2026: "the about-the-check-in is way too long and pulling direct words." */
describe('what a participant is told about this', () => {
  const brief =
    'A new Engagement Director has joined a behavioural science firm working across Africa. They are responsible for bringing in research projects and interventions, building relationships and contributing to revenue growth. ' +
    'Help the person develop clarity about what they are actually trying to achieve in the role. Do not begin by asking them to define their goals and then treat what they say as the answer; the goal should emerge from understanding what they are actually doing. ' +
    'Ask about the work they are doing, who they are speaking to, which opportunities they are pursuing and not pursuing. Follow up on their answers; probe what is unclear. Pay attention to the difference between what they say they want and what their behaviour suggests they are working toward. ' +
    'By the end they should have greater clarity about the goal they are actually working toward.';

  it('keeps the situation and drops every instruction to the product', () => {
    const s = theSituationIn(brief)!;
    expect(s).toBe('A new Engagement Director has joined a behavioural science firm working across Africa. They are responsible for bringing in research projects and interventions, building relationships and contributing to revenue growth.');
    expect(s).not.toMatch(/Help the person|Do not|Ask about|Follow up|Pay attention|By the end/);
  });

  it('a brief that is all instruction leaves nothing, and a short brief comes through whole', () => {
    expect(theSituationIn('Help the person develop clarity. Do not lead them.')).toBeNull();
    /* The lead's aims for the check-in, in the first person, are the lead's: a participant reads the situation only. */
    expect(theSituationIn("Tunde has just joined us as Engagement Director. The role is there to bring in research projects. I want to know whether he's clear on what the role has to produce.")).toBe('Tunde has just joined us as Engagement Director. The role is there to bring in research projects.');
    expect(theSituationIn("One session with 24 organisations we work with, to work out where MarketView should expand next. Last year's workshop gave us a word cloud; this time we need something the board can act on.")).toBe('One session with 24 organisations we work with, to work out where MarketView should expand next.');
  });

  it('and the goals they may see are said in one line after it', () => {
    const t = whatAParticipantIsToldAboutThis(brief, [{ name: 'New business in the first year', target: 400000 }, { name: 'Two large corporate or foundation projects.', target: 2 }])!;
    expect(t).toContain('The goals on this check-in: New business in the first year (400,000); Two large corporate or foundation projects (2).');
    expect(whatAParticipantIsToldAboutThis('Do not lead them.', [])).toBeNull();
  });
});

/** Run 7, 21 Sep 2026: the box scored 1.2 to 2.0 because the situation was still the lead's sentence to the product. */
describe('the product writes what a participant is told, once, and checks it', () => {
  const { theTellingHolds } = require('./what-a-participant-is-told-about-this');
  it('keeps plain sentences addressed to the participant', () => {
    const t = theTellingHolds('You took an asset loan this year to get somewhere with your business. This check-in is for seeing how that asset is working for you, not only whether you are paying. A few short check-ins, in your own words, build a record you can read.', { otherNames: ['Grace', 'Aisha'] });
    expect(t).toMatch(/^You took an asset loan/);
    expect(t?.split(/(?<=[.!?])\s+/).length).toBe(3);
  });
  it('drops the lead\'s voice, instructions, figures and other people\'s names', () => {
    expect(theTellingHolds('We want to know how the asset is working. Ask them about repayments. Grace has a tractor. Your loan is for N2m. This check-in is about how your business is going.', { otherNames: ['Grace'] }))
      .toBe('This check-in is about how your business is going.');
    expect(theTellingHolds('The lead wants to see where each rep stands. Do not lead them.', {})).toBeNull();
    expect(theTellingHolds('', {})).toBeNull();
    expect(theTellingHolds('About this check-in: This check-in is for understanding how sales are progressing.', {})).toBe('This check-in is for understanding how sales are progressing.');
  });
  it('and the block says their own goal before the check-in\'s', () => {
    const t = whatAParticipantIsToldAboutThis('Help the person.', [
      { name: 'Hit N180m', target: 180_000_000, ownerParticipantId: null },
      { name: 'N30m this quarter', target: 30_000_000, ownerParticipantId: 'bola' },
    ], { told: 'Your team is working to a sales target this quarter.', readerParticipantId: 'bola' })!;
    expect(t).toBe('Your team is working to a sales target this quarter. Your goal: N30m this quarter (30,000,000). The goal for the whole check-in: Hit N180m (180,000,000).');
  });
});

/** Run 8, 21 Sep 2026: written for every ground, read by nobody. The About block's select must carry it. */
describe('what the product wrote is what the About block reads', () => {
  it('the brief select carries the telling and the block prefers it', () => {
    const strip = (t: string) => t.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
    const src = strip(require('fs').readFileSync(require('path').join(__dirname, '../conversation/conversation.service.ts'), 'utf8'));
    expect(src).toMatch(/const WHAT_THE_BRIEF_IS_READ_FROM = \{[\s\S]{0,400}toldToParticipants: true/);
    expect(src).toMatch(/told: \(ground as any\)\.toldToParticipants/);
    const grounds = strip(require('fs').readFileSync(require('path').join(__dirname, 'grounds.service.ts'), 'utf8'));
    expect(grounds).toMatch(/toldToParticipants\?\.trim\(\) \|\| theSituationIn\(brief\)/);
  });
});

/**
 * A TELLING THAT NAMES NOTHING IS NOT KEPT.
 *
 * Read live on an open link, 22 September 2026. The brief named the states, the farmers, traders and
 * distributors, the products, the volumes and the seasons. The box above the first question said:
 * "This check-in is for understanding your current business situation. Your responses will help
 * build a picture of your needs over time." No instruction, no first person, no name, no number - it
 * passed every filter there was, and told the person nothing about why they had been asked.
 */
describe('the telling has to be about this check-in', () => {
  const { itNamesWhatThisIsAbout, theTellingHolds: holds } = require('./what-a-participant-is-told-about-this');
  const brief =
    'We want to learn where MarketView can be most useful over the next 12 months: the states and markets you are growing in, the farmers, traders and distributors you want to reach, and the products, volumes and seasons that matter to you.';

  it('rejects the sentence that would fit any check-in ever set up', () => {
    const filler = 'This check-in is for understanding your current business situation. Your responses will help build a picture of your needs over time.';
    expect(itNamesWhatThisIsAbout(filler, brief)).toBe(false);
    expect(holds(filler, { about: brief })).toBeNull();
  });

  it('keeps one that names the subject in the lead\'s own words', () => {
    const real = 'This check-in is about where your business is growing and which markets and products matter to you. It is for building a shared picture of what you are trying to reach over the next year.';
    expect(itNamesWhatThisIsAbout(real, brief)).toBe(true);
    expect(holds(real, { about: brief })).toContain('markets');
  });

  it('matching only on the words this product says about every check-in is not naming it', () => {
    /* "business", "picture", "needs", "update", "report": the vocabulary of the product, not of the work. */
    expect(itNamesWhatThisIsAbout('This check-in is a business update, and the report builds a picture of the team.', brief)).toBe(false);
  });

  it('and with nothing to check against, the rewrite still holds', () => {
    expect(itNamesWhatThisIsAbout('This check-in is for whatever.', '')).toBe(true);
    expect(holds('This check-in is about how the loan is working.', {})).toBe('This check-in is about how the loan is working.');
  });

  it('does not promise a second conversation to somebody who will be asked once', () => {
    const told = holds(
      'This check-in is about where your markets are growing. It involves short, regular questions in your own words that build a record you can read.',
      { rounds: 1 },
    );
    expect(told).toBe('This check-in is about where your markets are growing.');
    /* The same sentence stands where there really are more rounds coming. */
    expect(holds('This check-in is about where your markets are growing. It involves short, regular questions in your own words.', { rounds: 6 }))
      .toContain('regular questions');
  });
});
