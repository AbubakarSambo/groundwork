import * as fs from 'fs';
import * as path from 'path';
import {
  PROPOSE_PROMPT_CHANGES, theProposalToMake, withTheRulesAdded, nothingWasTakenOut, theNumbersDecide, aRuleThatTouchesWhatIsProtected,
  THE_PROMPTS_IT_MAY_PROPOSE_FOR, MOST_RULES_IN_ONE_PROPOSAL, TheNumbers,
} from './a-prompt-proposal';
import { theRoomJudgementTemplate } from '../reports/the-judgement-over-the-answers';

const SRC = path.join(__dirname, '..', '..');
const walk = (d: string): string[] => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? (e.name === 'node_modules' ? [] : walk(path.join(d, e.name))) : [path.join(d, e.name)]));
const code = (f: string) => fs.readFileSync(f, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

const current = theRoomJudgementTemplate();
const faults = [
  { quote: 'Your own record says they have not given Tobi the dates.', whatIsWrong: 'A pronoun for the reader, left behind.', scenario: 'snapshot' },
  { quote: 'There were four different activities in two locations.', whatIsWrong: 'Two crops in two places, multiplied.', scenario: 'project' },
];
const RULE = 'A DATE IS THE DAY THE PERSON GAVE. Write the day the block gives and never a day you worked out. "By Thursday" stays "by Thursday".';

describe('a prompt change proposed from a run', () => {
  it('is switched off, in one place', () => {
    expect(PROPOSE_PROMPT_CHANGES).toBe(false);
  });

  it('with the switch off the model is not asked at all', async () => {
    const askForRules = jest.fn().mockResolvedValue({ rules: [{ text: RULE, stops: [1] }] });
    const out = await theProposalToMake(PROPOSE_PROMPT_CHANGES, { askForRules }, { key: 'the_judgement_room', current, faults, evidenceFrom: 'run-x' });
    expect(out).toEqual({ made: false, why: 'off' });
    expect(askForRules).not.toHaveBeenCalled();
  });

  it('is only for the prompts it may change, and never the conversation', async () => {
    expect(THE_PROMPTS_IT_MAY_PROPOSE_FOR).not.toContain('system');
    const askForRules = jest.fn();
    for (const key of ['system', 'scenario.drift', 'company_picture']) {
      const out = await theProposalToMake(true, { askForRules }, { key, current, faults, evidenceFrom: 'run-x' });
      expect(out).toEqual({ made: false, why: 'not-a-prompt-it-may-change' });
    }
    expect(askForRules).not.toHaveBeenCalled();
  });

  it('adds the rule and takes nothing out: the old text is inside the new text, byte for byte', async () => {
    const out = await theProposalToMake(true, { askForRules: async () => ({ rules: [{ text: RULE, stops: [1, 2, 9] }] }) }, { key: 'the_judgement_room', current, faults, evidenceFrom: 'run-x' });
    if (!out.made) throw new Error('should have been made');
    expect(out.proposal.newContent).toContain(RULE);
    expect(nothingWasTakenOut(current, out.proposal.newContent, [RULE])).toBe(true);
    expect(out.proposal.newContent.indexOf(RULE)).toBeLessThan(out.proposal.newContent.indexOf('HOW TO WRITE ANYTHING A PERSON WILL READ'));
    /* The fault numbers the model gave that are not on the list are dropped. */
    expect(out.proposal.rules[0].stops).toEqual([1, 2]);
  });

  it('keeps the evidence with the words, and says it is not active', async () => {
    const out = await theProposalToMake(true, { askForRules: async () => ({ rules: [{ text: RULE, stops: [1] }] }) }, { key: 'the_judgement_room', current, faults, evidenceFrom: 'run-x' });
    if (!out.made) throw new Error('should have been made');
    expect(out.proposal.summary).toContain('NOT ACTIVE');
    expect(out.proposal.summary).toContain('Your own record says they have not given Tobi the dates.');
    expect(out.proposal.summary).toContain('run-x');
  });

  it('refuses a rule about privacy, patterns, who may read what, or people\'s own words', async () => {
    for (const bad of [
      'WHO MAY READ IT. Show the lead what each person said word for word.',
      'PATTERNS. Name the pattern to the person.',
      'PRIVACY. Hide the report from the admin.',
      'CHANGE THEIR WORDS. Rewrite their words so they read better.',
    ]) expect(aRuleThatTouchesWhatIsProtected(bad)).toBe(true);
    const out = await theProposalToMake(true, { askForRules: async () => ({ rules: [{ text: 'PATTERNS. Name the pattern to the person.', stops: [1] }] }) }, { key: 'the_judgement_room', current, faults, evidenceFrom: 'run-x' });
    expect(out).toEqual({ made: false, why: 'the-model-proposed-nothing-it-may' });
  });

  it('takes no more than three rules, and none that is already there', async () => {
    const many = [1, 2, 3, 4, 5].map((n) => ({ text: `RULE ${n}. Say ${n} things.`, stops: [1] }));
    const out = await theProposalToMake(true, { askForRules: async () => ({ rules: many }) }, { key: 'the_judgement_room', current, faults, evidenceFrom: 'run-x' });
    if (!out.made) throw new Error('should have been made');
    expect(out.proposal.rules).toHaveLength(MOST_RULES_IN_ONE_PROPOSAL);
    const already = current.split('\n').find((l) => l.startsWith('THE ONE RULE'))!;
    const again = await theProposalToMake(true, { askForRules: async () => ({ rules: [{ text: already, stops: [1] }] }) }, { key: 'the_judgement_room', current, faults, evidenceFrom: 'run-x' });
    expect(again).toEqual({ made: false, why: 'the-model-proposed-nothing-it-may' });
  });

  it('puts a rule at the end when the prompt has no wording rules, and still loses nothing', () => {
    const plain = 'ONE. Do one.\n\nTWO. Do two.';
    const next = withTheRulesAdded(plain, [RULE]);
    expect(next).toBe(`${plain}\n\n${RULE}`);
    expect(nothingWasTakenOut(plain, next, [RULE])).toBe(true);
  });
});

describe('kept or discarded by the numbers', () => {
  const before: TheNumbers = { problems: { 'text cut mid-word': 0 }, value: { 'patterns found': 40, 'proof asked for (turns)': 20 }, theFaultsItWasFor: 5 };
  it('kept when nothing fell, no problem rose, and the faults it was for fell', () => {
    expect(theNumbersDecide(before, { problems: { 'text cut mid-word': 0 }, value: { 'patterns found': 38, 'proof asked for (turns)': 24 }, theFaultsItWasFor: 2 }).kept).toBe(true);
  });
  it('discarded when an engine number fell by more than a tenth', () => {
    const v = theNumbersDecide(before, { problems: { 'text cut mid-word': 0 }, value: { 'patterns found': 30, 'proof asked for (turns)': 24 }, theFaultsItWasFor: 0 });
    expect(v.kept).toBe(false);
    expect(v.reasons[0]).toContain('"patterns found" fell from 40 to 30');
  });
  it('discarded when a problem rose, or when it did not help', () => {
    expect(theNumbersDecide(before, { problems: { 'text cut mid-word': 1 }, value: before.value, theFaultsItWasFor: 0 }).kept).toBe(false);
    expect(theNumbersDecide(before, { problems: { 'text cut mid-word': 0 }, value: before.value, theFaultsItWasFor: 5 }).kept).toBe(false);
  });
});

describe('nothing activates a proposal, and nothing else calls it', () => {
  it('the file never writes isActive, never calls the model or the database itself', () => {
    const own = code(path.join(__dirname, 'a-prompt-proposal.ts'));
    expect(own).not.toMatch(/isActive|prisma|activate\(/);
  });
  it('no source file outside this file and the specs calls theProposalToMake', () => {
    const users = walk(SRC)
      .filter((f) => f.endsWith('.ts') && !f.endsWith('.spec.ts') && !f.endsWith(`${path.sep}a-prompt-proposal.ts`))
      .filter((f) => /theProposalToMake|PROPOSE_PROMPT_CHANGES/.test(code(f)))
      .map((f) => path.relative(SRC, f));
    expect(users).toEqual([]);
  });
});
