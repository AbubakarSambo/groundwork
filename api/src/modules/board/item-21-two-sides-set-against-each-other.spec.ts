import { boardAs, answered, A_RELEASED_REPORT, AMINA, RUKIA, JUMA } from './the-switchboards-sections-harness';
import { peopleSaidDifferentThingsAbout } from '../reports/what-people-said-differently-about';

/**
 * ITEM 21, THE ASSET LOANS BOARD: TWO SIDES SET AGAINST EACH OTHER ARE A SENTENCE, NOT A THING PEOPLE DISAGREE ABOUT.
 *
 * "Asset loan cohort, first repayment cycle" (local test database, 65e21dbe): Amaka, who runs it, read at the
 * top of her board "People disagree about you attribute repayment issues to poor borrower selection, while
 * several participants attribute them to a slow start in generating revenue without initial support." An
 * admin read "People disagree about Amaka attributes ...". "attributes" was not counted as a verb.
 */
const TOPIC = 'Rukia Mwangi attributes repayment issues to poor borrower selection, while several participants attribute them to a slow start';
const OPENING = `Everybody has answered. People disagree on 1: ${TOPIC}.`;
const report = { ...A_RELEASED_REPORT, theOpening: OPENING, sharedPicture: OPENING };
const setup = { checkIns: [answered('p-rukia', 1), answered('p-baraka', 1)], report };
const summary = async (reader: readonly [string, string]) => String((await boardAs(setup as any, ...reader)).howItIsGoing?.latestSummary ?? '');

describe('the top of the board, as each reader reads it', () => {
  it('Amina, who runs it, reads two sentences, never "disagree about ... attributes"', async () => {
    const s = await summary(AMINA);
    expect(s).toContain('People disagree. Rukia Mwangi attributes repayment issues to poor borrower selection, while several participants attribute them to a slow start.');
  });
  it.each([['Rukia, who checks in', RUKIA], ['Juma, an admin', JUMA]])('%s reads no topic glued after "about"', async (_w, reader) => {
    expect(await summary(reader as readonly [string, string])).not.toMatch(/disagree about (?:you|Rukia)/);
  });
  it('and the Differences tile says it the same way', () => {
    expect(peopleSaidDifferentThingsAbout(TOPIC)).toBe(`People said different things. ${TOPIC}.`);
  });
});
