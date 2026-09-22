import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  readAsANetwork, theNetworkInstruction, THE_NETWORK_REPORT_SCHEMA, ENOUGH_ACCOUNTS_TO_BE_A_NETWORK,
} from './a-hundred-accounts-are-not-two';

/**
 * A hundred Friends of NABG members answered one open link about where MarketView should expand.
 * The report they would have got was `sharedPicture / agreements / divergences / one question` -
 * an alignment report, capped at five hundred words, which is the right shape for two people three
 * months into working together and says nothing about a market.
 */
describe('when a check-in is read as a network', () => {
  it('not on the check-ins this product is mostly used for', () => {
    expect(readAsANetwork(2)).toBe(false);
    expect(readAsANetwork(5)).toBe(false);
    expect(readAsANetwork(ENOUGH_ACCOUNTS_TO_BE_A_NETWORK - 1)).toBe(false);
  });

  it('and on the ones where "how do the kinds differ" is a real question', () => {
    expect(readAsANetwork(ENOUGH_ACCOUNTS_TO_BE_A_NETWORK)).toBe(true);
    expect(readAsANetwork(100)).toBe(true);
  });
});

describe('what the shape asks for', () => {
  const props = (THE_NETWORK_REPORT_SCHEMA as any).input_schema.properties;

  /*
   * THE KEY THE CONVERTER ACTUALLY READS. Written as `parameters` this schema converted to nothing,
   * the model called the tool with no arguments, and a hundred accounts came back as `{}` with a
   * log line saying the read had succeeded. Pinned because the failure is completely silent.
   */
  it('is called input_schema, which is the name convertTool reads', () => {
    expect((THE_NETWORK_REPORT_SCHEMA as any).input_schema).toBeDefined();
    expect((THE_NETWORK_REPORT_SCHEMA as any).parameters).toBeUndefined();
  });

  /* Every question Hafsah's test says the report has to answer, present as its own section rather
     than hoped for inside a paragraph. */
  it('has a section for each thing somebody actually wants to know', () => {
    for (const section of [
      'whereTheyWantToGrow', 'whatMatters', 'whoTheyNeedToReach', 'dataTheyNeed',
      'whatTheyAlreadyHave', 'howTheyChooseWhoToWorkWith', 'whatWentWrong',
      'byKindOfOrganisation', 'whereTheyWantDifferentThings', 'whereThisCouldBeUseful',
    ]) expect(props[section]).toBeDefined();
  });

  /* A finding on a hundred accounts that does not say how many said it is an assertion nobody in
     the room can check. The count is the evidence. */
  it('and every finding carries who said it and how many', () => {
    for (const section of ['whereTheyWantToGrow', 'whatMatters', 'whoTheyNeedToReach', 'dataTheyNeed', 'whatWentWrong', 'byKindOfOrganisation']) {
      const said = props[section].items.properties.said;
      expect(said.properties.who).toBeDefined();
      expect(said.properties.howMany).toBeDefined();
      expect(said.required).toEqual(['who', 'howMany']);
    }
  });

  /* The gaps are required, the findings mostly are not: a report that cannot say what these
     accounts could not answer lets a reader take silence for an answer. */
  it('and cannot be emitted without saying what nobody said', () => {
    expect((THE_NETWORK_REPORT_SCHEMA as any).input_schema.required).toContain('whatNobodySaid');
    expect((THE_NETWORK_REPORT_SCHEMA as any).input_schema.required).toContain('thePicture');
  });

  it('and never asks for a personal name', () => {
    expect(JSON.stringify(props)).toMatch(/Never a personal name/);
  });
});

describe('what the model is told before it reads a hundred accounts', () => {
  const said = theNetworkInstruction(100, 'Where MarketView can be most useful over the next 12 months.');

  it('says how many separate accounts there are, and that none of them saw another', () => {
    expect(said).toContain('100 separate organisations');
    expect(said).toMatch(/none of them saw anybody else's answer/);
  });

  it('and carries the question they were actually asked', () => {
    expect(said).toContain('Where MarketView can be most useful');
  });

  /* The four refusals. On two accounts an invented consensus is obvious to the two people who were
     there; on a hundred nobody can check it, which is why these are first and not last. */
  it('and refuses to invent a number, a fact, a resolution or a filled section', () => {
    expect(said).toMatch(/Never write a number, a state, a crop, a volume or a season that nobody said/);
    expect(said).toMatch(/Never turn an opinion into a fact/);
    expect(said).toMatch(/Never resolve a contradiction by picking a side/);
    expect(said).toMatch(/Never fill a section/);
  });
});

describe('and the synthesis runs it', () => {
  const SRC = readFileSync(join(__dirname, 'reports.service.ts'), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

  it('only where there are enough accounts', () => {
    expect(SRC).toMatch(/if \(readAsANetwork\(howManyAnswered\)\)/);
  });

  /* Counted as separate PEOPLE, not as completed check-ins: one person who answered twice is one
     account, and the merge in the open link deliberately keeps both of their sessions. */
  it('and counts people rather than check-ins', () => {
    expect(SRC).toMatch(/new Set\(rows\.map\(\(r\) => r\.participantId\)\)\.size/);
  });

  /* A report that already succeeded must never be lost to the second read. */
  it('and a failure here leaves the report that already worked alone', () => {
    const block = SRC.slice(SRC.indexOf('let networkPicture'), SRC.indexOf('const report = await this.prisma.report.upsert'));
    expect(block).toMatch(/catch \(err: any\) \{/);
    expect(block).toMatch(/the report is the alignment one alone/);
  });
});
