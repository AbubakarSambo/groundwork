import { quotationsIn, whatTheySaidInQuotes, everyQuoteFromTheRecord } from './a-quote-is-what-they-said';
import { everyLineIsReadBeforeItIsKept } from './every-line-is-read-before-it-is-kept';

/**
 * A QUOTE THAT NOBODY SAID. Openread, check-2 (ground 65d96dfe), whatTheNumbersSay[0].says, as the
 * model wrote it:
 *
 *   The initiator says they are 'dealing with a lot of pressure' from 'incredibly tight timelines'
 *   to deliver features.
 *
 * The quote pass did not treat single marks as quotation marks, so neither passage was checked. Then
 * the pronoun rewrite came back with double marks round both, and "incredibly tight timelines" is in
 * nobody's record: the lead said "The timelines are incredibly tight". Both ends are closed here.
 */
const WRITTEN = "The initiator says they are 'dealing with a lot of pressure' from 'incredibly tight timelines' to deliver features.";
const RECORD = [
  'dealing with a lot of pressure',
  "The timelines are incredibly tight, and there's constant pressure to hit those dates, sometimes at the expense of other things.",
];

describe('a pair of single marks round somebody\'s words is a quotation', () => {
  it('finds both passages in the sentence the model wrote', () => {
    expect(quotationsIn(WRITTEN).map((q) => q.inner)).toEqual(['dealing with a lot of pressure', 'incredibly tight timelines']);
  });

  it('keeps the one that is in the record and takes the marks off the one that is not', () => {
    const out = whatTheySaidInQuotes(WRITTEN, RECORD);
    expect(out.text).toBe("The initiator says they are 'dealing with a lot of pressure' from incredibly tight timelines to deliver features.");
    expect(out.unquoted).toEqual(['incredibly tight timelines']);
  });

  it('and never mistakes an apostrophe for one', () => {
    for (const line of [
      "Kwame's file is with the credit committee, and it's late.",
      "The officers' own numbers add up to 64, and they don't agree.",
      "It's the 'final' figure.",
      "Ngozi said the branch's plan was 'fine'.",
      "The rock 'n' roll night was moved.",
    ]) expect(quotationsIn(line)).toEqual([]);
    expect(quotationsIn("She wrote ‘we don’t have the forms yet’ on Friday.").map((q) => q.inner)).toEqual(['we don’t have the forms yet']);
    expect(quotationsIn("He said 'Kwame's file is late' twice.").map((q) => q.inner)).toEqual(["Kwame's file is late"]);
  });
});

describe('and a rewrite can never introduce or promote a quote', () => {
  const report = { theJudgement: { whatTheNumbersSay: [{ says: everyQuoteFromTheRecord(WRITTEN, RECORD).value }] } };
  const readers = [{ participantId: 'p-lead', isLead: true }];
  /* The lead's render: their label becomes "You" and the verb agrees, as the serve step does. */
  const named = (r: any) => JSON.parse(JSON.stringify(r).replace(/The initiator says the initiator is/g, 'You say you are').replace(/The initiator says/g, 'You say'));

  it('a rewrite that turns the unquoted phrase into a quotation is thrown away', async () => {
    const promoted = 'The initiator says the initiator is "dealing with a lot of pressure" from "incredibly tight timelines" to deliver features.';
    const out = await everyLineIsReadBeforeItIsKept({
      report, readers, named, served: named, fields: ['theJudgement'],
      rewriteAll: async (asks) => Object.fromEntries(asks.map((a) => [a.id, promoted])),
    });
    expect(JSON.stringify(out.report)).not.toContain('"incredibly tight timelines"');
    expect(JSON.stringify(out.report)).not.toContain('\\"incredibly tight timelines\\"');
    expect(out.done[0].outcome).not.toBe('rewritten');
  });

  it('a rewrite that keeps the one real quote and adds none is kept', async () => {
    const good = "The initiator says the initiator is 'dealing with a lot of pressure' from incredibly tight timelines to deliver features.";
    const out = await everyLineIsReadBeforeItIsKept({
      report, readers, named, served: named, fields: ['theJudgement'],
      rewriteAll: async (asks) => Object.fromEntries(asks.map((a) => [a.id, good])),
    });
    expect(out.done[0].outcome).toBe('rewritten');
    expect(out.report.theJudgement.whatTheNumbersSay[0].says).toBe(good);
  });
});
