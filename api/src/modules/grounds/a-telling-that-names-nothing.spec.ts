import { itNamesWhatThisIsAbout, howManyOfTheirWordsItNeeds } from './what-a-participant-is-told-about-this';

/**
 * "THE SUMMARY IS ALSO A BIT OFF, THIS WAS A NEW QUESTION."
 *
 * Read live on 23 September 2026. Her brief was four hundred words naming states, markets,
 * products, volumes, quality, farmers, traders, agents, distributors, fraud, theft, weather and
 * inertia. The box above the first question said:
 *
 *   "It is for understanding how to help you grow faster with less risk. Your answers will be used
 *    to create a consolidated report that everyone who took part will receive."
 *
 * It passed the old check by sharing one word - "risk" - out of forty available, and spent half its
 * sixty words on what the page already says two inches below.
 */
const HER_BRIEF = `The goal of this check-in is to understand what would actually help you expand and
with less risk over the next 12 months, the markets, states, actors, volume and information you
need. Think about where you want to expand across Nigeria, which markets and products you want to
grow, the volumes and quality you need, and the farmers, traders, agents, distributors and other
people you need around you. We want to understand how you currently find reliable sources of
supply, build and maintain your networks, vet the people you buy from, check quality and capacity,
and respond when things go wrong: inconsistent supply, people not delivering the volumes they
promise, quality problems, fraud and theft, weather and climate risks, and the time and cost
involved in building new supply and distribution networks.`;

describe('how much of the brief a telling has to name', () => {
  it('one word for a brief that named one thing', () => {
    expect(howManyOfTheirWordsItNeeds('How is the cassava drying going?')).toBe(1);
  });

  /* Measured: her brief carries thirty-nine distinctive words. One shared out of thirty-nine is a
     coincidence, which is how "how to help you grow faster with less risk" got through on "risk". */
  it('and three for one like hers', () => {
    expect(howManyOfTheirWordsItNeeds(HER_BRIEF)).toBe(3);
  });
});

describe('the telling she was actually shown', () => {
  const WHAT_IT_SAID = 'It is for understanding how to help you grow faster with less risk. Your answers will be used to create a consolidated report that everyone who took part will receive.';

  it('is refused now', () => {
    expect(itNamesWhatThisIsAbout(WHAT_IT_SAID, HER_BRIEF)).toBe(false);
  });

  it('and one that names her subjects is kept', () => {
    const better = 'This is about where you want to expand across Nigeria, and the markets and products you want to grow. It covers the traders and distributors you need around you, and what goes wrong with supply and quality today.';
    expect(itNamesWhatThisIsAbout(better, HER_BRIEF)).toBe(true);
  });
});

describe('and a short brief is not held to a long brief\'s bar', () => {
  /* The failure to avoid is a good telling refused because the lead wrote two lines. */
  it('keeps a telling that names the one thing there was', () => {
    const about = 'A weekly update on the cassava drying line in Ogun.';
    expect(itNamesWhatThisIsAbout('This is about the cassava drying line and how it is running.', about)).toBe(true);
  });

  it('and still refuses one that names nothing at all', () => {
    expect(itNamesWhatThisIsAbout('It is for understanding your current business situation.', 'A weekly update on the cassava drying line in Ogun.')).toBe(false);
  });

  /* No brief, nothing to check against: never refuse on an absence. */
  it('and holds anything where the lead wrote nothing', () => {
    expect(itNamesWhatThisIsAbout('Anything at all.', null)).toBe(true);
  });
});

describe('a telling does not promise a report nobody set up', () => {
  const { theTellingHolds } = require('./what-a-participant-is-told-about-this');
  it('leaves out "you will receive a consolidated report each time" and keeps the sentence about the quarter', () => {
    const told = theTellingHolds(
      'It is for understanding how the quarterly priorities are going and what is blocking you. You will be asked for your answers every week, and you will receive a consolidated report each time.',
      { about: 'quarterly priorities' },
    );
    expect(told).toBe('It is for understanding how the quarterly priorities are going and what is blocking you.');
  });
  it('and a report promised to everyone, in other words, is left out too', () => {
    const told = theTellingHolds('This is about the quarterly priorities. Everyone who takes part will receive the report.', { about: 'quarterly priorities' });
    expect(told).toBe('This is about the quarterly priorities.');
  });
});
