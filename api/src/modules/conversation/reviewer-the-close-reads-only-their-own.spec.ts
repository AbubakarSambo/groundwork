import { withoutTheLeadsBrief, theLeadsSetupWords } from './the-leads-brief-is-never-quoted-to-them';
import { withoutTheAnchorBack } from './no-anchor-back-when-they-leave';
import { theLanguageOfTheirOwnWords } from '../public-api/plainly-english';
import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * REVIEWER, 14 OCTOBER (THIRD PASS): THE CLOSE READS ONLY WHAT IS THE PERSON'S OWN.
 *
 * David's close read "Understood. One thing before you go - the Kamau v Apex Ltd documents. Njeri mentioned that
 * deadlines keep slipping because you wait on each other." Njeri said "Deadlines keep slipping because we wait on each
 * other." while setting the check-in up. Kevin's read his own "Kilele Hotel, 40 units, paid today." back as a request,
 * and his thank-you came in Swahili although he writes English.
 */
const withoutComments = (src: string) => src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

const NJERIS_SETUP = theLeadsSetupWords({
  brief: 'Litigation team daily check-in for David Mutua and me. When asked why this matters now, the answer was taken to mean this. Deadlines keep slipping because we wait on each other.',
})!;
const DAVID_SAID = ['The Kamau v. Apex Ltd documents go to Njeri on Thursday.', 'I own all the Kamau v. Apex Ltd documents. The witness statement is ready.', 'I have to go'];

describe("the lead's setup words never reach a participant, in other pronouns or attributed", () => {
  it("David's close loses the sentence about what Njeri said", () => {
    const reply = 'Understood. One thing before you go - the Kamau v Apex Ltd documents. Njeri mentioned that deadlines keep slipping because you wait on each other.';
    const out = withoutTheLeadsBrief(reply, NJERIS_SETUP, DAVID_SAID, [], 'Njeri');
    expect(out.text).not.toMatch(/Njeri mentioned|slipping/);
    expect(out.cut).toEqual(['Njeri mentioned that deadlines keep slipping because you wait on each other.']);
  });

  it('the same words with "you" for "we", and no name, are still a quote of the setup', () => {
    expect(withoutTheLeadsBrief('Deadlines keep slipping because you wait on each other, so when is it due?', NJERIS_SETUP, DAVID_SAID, [], 'Njeri').cut).toHaveLength(1);
  });

  it('with her surname too, when the setup words are in it', () => {
    const out = withoutTheLeadsBrief('Last time Njeri Kamau said that deadlines keep slipping. What is due next?', NJERIS_SETUP, DAVID_SAID, [], 'Njeri');
    expect(out.cut).toEqual(['Last time Njeri Kamau said that deadlines keep slipping.']);
  });

  it('the lead named about something that is not the setup is left to its own rules', () => {
    expect(withoutTheLeadsBrief('Bisi says your target is 12 approved facilities.', NJERIS_SETUP, [], [], 'Bisi').cut).toEqual([]);
  });

  it('the opening never re-attributes what is on the person\'s own record', () => {
    const src = withoutComments(readFileSync(join(__dirname, 'conversation.service.ts'), 'utf8'));
    expect(src).toMatch(/const saidSoFar = [\s\S]{0,250}\+ await \(this\.prisma\.recordEntry\?\.count\?\.\(\{ where: \{ participantId: checkIn\.participantId \} \}\)/);
  });

  it('and what is left never points back at the sentence that went', () => {
    const out = withoutTheLeadsBrief('Njeri mentioned that deadlines keep slipping because you wait on each other. Has that moved since then? What has happened with that?', NJERIS_SETUP, [], [], 'Njeri');
    expect(out.text).not.toMatch(/Has that moved|happened with that/);
    expect(out.text.trim().endsWith('?')).toBe(true);
  });

  it('what David said himself about Njeri stays', () => {
    const said = [...DAVID_SAID, 'Njeri said the filing moved to Tuesday.'];
    expect(withoutTheLeadsBrief('You said Njeri said the filing moved to Tuesday. What do you need for it?', NJERIS_SETUP, said, [], 'Njeri').cut).toEqual([]);
  });
});

describe('no "One thing before you go" when they are leaving', () => {
  it("Kevin's own words are not handed back as a request", () => {
    expect(withoutTheAnchorBack('Understood. One thing before you go - Kilele Hotel, 40 units, paid today. Even a one-liner on where that stands keeps the record current.'))
      .toBe('Understood.');
  });
  it('a reply without it is unchanged', () => {
    expect(withoutTheAnchorBack('Understood. Thank you for your answers.')).toBe('Understood. Thank you for your answers.');
  });
  it('the conversation takes it off whenever they say they are leaving', () => {
    const src = withoutComments(readFileSync(join(__dirname, 'conversation.service.ts'), 'utf8'));
    expect(src).toMatch(/if \(!answeringAnOffer && askedToFinish\(\[message\]\)\) \{\s*const without = withoutTheAnchorBack\(/);
  });
});

describe('the reply language follows their own messages', () => {
  const KEVIN = ['Kilele Hotel, 40 units. The owner paid today.', 'No other deals right now. I will visit two shops in Westlands tomorrow.', 'I have to go'];
  it('Kevin writes English, so a stored Swahili read does not decide', () => {
    expect(theLanguageOfTheirOwnWords(KEVIN, 'sw')).toBe('en');
  });
  it('somebody who writes Swahili keeps Swahili', () => {
    expect(theLanguageOfTheirOwnWords(['Leo nimeuza mifuko kumi', 'Kesho nitaenda Westlands kuona wateja'], 'sw')).toBe('sw');
  });
});
