import { assemble } from './the-outstanding-register';
import { whatIsOutstandingSaid, whatIsOutstandingTold } from './the-register-in-plain-words';
import { GeminiTeamMind } from '../team-loop/the-team-mind';

/**
 * "WHAT IS OUTSTANDING?" IS TOLD, NOT QUOTED (Fatima round 2, C3). Round 2 answered with eleven matters of first-person quotes ("I changed the lunch to 1:30.",
 * "I will go next week."). Now the model writes a short, grouped, third-person account from the register's facts, with their names, dates and sources; code writes
 * the count and the "N more"; a sentence that invents a number, or hides that something is only what somebody said, is dropped; and with no model the plain list
 * is what is said. Every text she reads is printed.
 */
const NOW = new Date('2026-11-13T09:00:00Z');
const day = (d: number) => new Date(NOW.getTime() - d * 86_400_000);
const raw = (o: Partial<any> & { sourceId: string; text: string }) => ({
  sourceKind: 'commitment', from: 'what they told Groundwork', action: o.text, owner: 'Tunde Alabi', workstream: null, whenSaid: null, dueGiven: null,
  state: 'UNKNOWN', settledBy: null, settledAt: null, at: day(1), updatedAt: day(1), external: false, dependency: null, decision: null, ...o,
}) as any;

const QUOTES = [
  raw({ sourceId: 'a', text: 'I changed the lunch to 1:30.' }),
  raw({ sourceId: 'b', text: 'I will go next week.', owner: 'Musa Ibrahim' }),
  raw({ sourceId: 'c', text: 'I will send the Kilele letter by Friday', whenSaid: 'by Friday', owner: 'Aminu Sule' }),
  raw({ sourceId: 'd', text: 'The Sahel Print payment is stuck', owner: 'Hauwa Lawal', dependency: 'Waiting on Grace Ogunleye', external: true }),
  raw({ sourceId: 'e', text: '11 meetings held with 5 institutions', owner: 'Kemi Adebayo', state: 'DONE', settledBy: 'SAID' }),
];
const register = () => assemble(QUOTES, new Map(), { now: NOW });
const view = { forName: null, now: NOW };

/** The model's side, stood in for by an engine that writes the account a good assistant would: the code around it is what is tested. */
/** The id the model was given for the matter that says this. */
const idOf = (facts: string[], re: RegExp) => facts.find((f) => re.test(f))!.split(':')[0];
const engineThatWrites = (sentences: (facts: string[]) => { says: string; from: string[] }[]) => ({
  extract: async (_system: string, history: { content: string }[]) => ({ sentences: sentences(history[0].content.split('\n').slice(1)) }),
});

describe('the outstanding list is told in sentences, with the sourced facts kept by code', () => {
  it('gives the model each matter as a fact with its owner, date, what it waits on and where it came from, and tells it to write about people, not to quote them', async () => {
    let seenSystem = ''; let seenFacts: string[] = [];
    const engine = { extract: async (system: string, history: { content: string }[]) => { seenSystem = system; seenFacts = history[0].content.split('\n').slice(1); return { sentences: [{ says: 'Tunde Alabi changed the lunch to 1:30.', from: ['m1'] }] }; } };
    await whatIsOutstandingTold(register(), view, (x) => new GeminiTeamMind(engine as any).narrate(x));
    console.log(`WHAT THE MODEL IS GIVEN\n${seenFacts.join('\n')}`);
    expect(seenSystem).toMatch(/third person/);
    expect(seenSystem).toMatch(/Never copy somebody's first-person words/);
    expect(seenSystem).toMatch(/Never read the matters out one by one/);
    expect(seenFacts.join(' ')).toMatch(/Source: what they told Groundwork on 12 November 2026/);
    expect(seenFacts.join(' ')).toMatch(/Kemi Adebayo said it was done|only what somebody said/);
    expect(seenFacts.find((f) => /Sahel Print/.test(f))).toMatch(/It waits on Grace Ogunleye/);
  });

  it('says the count in code, the account the model wrote, and how many more it did not mention', async () => {
    const engine = engineThatWrites((f) => [
      { says: 'Tunde Alabi changed the lunch to 1:30, and Musa Ibrahim said they will go next week.', from: [idOf(f, /lunch/), idOf(f, /go next week/)] },
      { says: 'Hauwa Lawal cannot pay the Sahel Print invoice until Grace Ogunleye approves it.', from: [idOf(f, /Sahel/)] },
    ]);
    const said = await whatIsOutstandingTold(register(), view, (x) => new GeminiTeamMind(engine as any).narrate(x));
    console.log(`WHAT SHE READS\n${said}`);
    expect(said.split('\n')[0]).toBe('You have 5 matters outstanding.');
    expect(said).toMatch(/Tunde Alabi changed the lunch to 1:30, and Musa Ibrahim said they will go next week\./);
    expect(said).not.toMatch(/\bI changed the lunch|I will go next week\./);
    expect(said).toMatch(/2 more are on the list, and I can read them out if you ask\./);
  });

  it('drops a sentence that adds a number the facts do not hold, and one that hides that a claim is only what somebody said', async () => {
    const engine = engineThatWrites((f) => [
      { says: 'Tunde Alabi changed the lunch to 1:30 for 45 guests.', from: [idOf(f, /lunch/)] },
      { says: 'Kemi Adebayo held 11 meetings with 5 institutions.', from: [idOf(f, /11 meetings/)] },
      { says: 'Aminu Sule has promised the Kilele letter by Friday.', from: [idOf(f, /Kilele/)] },
    ]);
    const said = await whatIsOutstandingTold(register(), view, (x) => new GeminiTeamMind(engine as any).narrate(x));
    console.log(`WHAT SHE READS\n${said}`);
    expect(said).not.toMatch(/45 guests/);
    expect(said).not.toMatch(/Kemi Adebayo held 11 meetings/);
    expect(said).toMatch(/Aminu Sule has promised the Kilele letter by Friday\./);
  });

  it('says the plain list when there is no model, or when it gives nothing safe', async () => {
    const plain = whatIsOutstandingSaid(register(), view);
    expect(await whatIsOutstandingTold(register(), view, null)).toBe(plain);
    expect(await whatIsOutstandingTold(register(), view, async () => null)).toBe(plain);
    expect(await whatIsOutstandingTold(register(), view, async () => { throw new Error('down'); })).toBe(plain);
  });

  it('says what it says for somebody who acts for her, by her name', async () => {
    const engine = engineThatWrites((f) => [{ says: 'Tunde Alabi changed the lunch to 1:30.', from: [idOf(f, /lunch/)] }]);
    const said = await whatIsOutstandingTold(register(), { forName: 'Rakiya', now: NOW }, (x) => new GeminiTeamMind(engine as any).narrate(x));
    expect(said.split('\n')[0]).toBe('5 matters are outstanding for Rakiya.');
  });

  it('says nothing is outstanding when nothing is', async () => {
    expect(await whatIsOutstandingTold({ rows: [], toAsk: [] }, view, async () => [{ says: 'Something', from: ['m1'] }])).toBe(whatIsOutstandingSaid({ rows: [], toAsk: [] }, view));
  });
});
