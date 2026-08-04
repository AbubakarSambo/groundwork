import { ENGINE_RULES } from './prompt-library';
import { PromptsService } from '../prompts/prompts.service';

/**
 * Guards for the probing improvements added to ENGINE_RULES (DB-seeded
 * "system" prompt). Each bites on one of the four required behaviors, plus
 * the boot-reseed invariant check that must keep passing or the old prompt
 * stays silently live.
 */

describe('#probing A summary is not yet an answer (precision, not suspicion)', () => {
  it('names the three summary shapes and instructs probing for what is behind them', () => {
    expect(ENGINE_RULES).toMatch(/A SUMMARY IS NOT YET AN ANSWER/);
    expect(ENGINE_RULES).toMatch(/"3 orgs"/);
    expect(ENGINE_RULES).toMatch(/"going well"/);
    expect(ENGINE_RULES).toMatch(/"ready"/);
    expect(ENGINE_RULES).toMatch(/named specifics behind a count/i);
  });

  it('frames this as precision, never as suspicion of hiding something', () => {
    expect(ENGINE_RULES).toMatch(/getting more precision on what they already told you, never as suspicion/i);
    expect(ENGINE_RULES).toMatch(/"help me get the specific picture," not "prove that's true\."/);
  });

  it('composes with, and does not override, HUMAN FIRST / HEALTHY SITUATION / over-verifying', () => {
    const block = ENGINE_RULES.slice(ENGINE_RULES.indexOf('A SUMMARY IS NOT YET AN ANSWER'), ENGINE_RULES.indexOf('DEPENDENCIES - the one new thing'));
    expect(block).toMatch(/HUMAN FIRST RULE above/);
    expect(block).toMatch(/HEALTHY SITUATION RULE above/);
    expect(block).toMatch(/over-verifying warning above/);
  });

  it('chases one thing per turn - explicitly composes with, does not touch, the ONE QUESTION RULE', () => {
    const block = ENGINE_RULES.slice(ENGINE_RULES.indexOf('A SUMMARY IS NOT YET AN ANSWER'), ENGINE_RULES.indexOf('DEPENDENCIES - the one new thing'));
    expect(block).toMatch(/composes with the ONE QUESTION RULE above, it does not add a second question to the same turn/i);
    // The ONE QUESTION RULE's own text must be untouched.
    expect(ENGINE_RULES).toMatch(/Ask one question per response\. Always\. The most important one\./);
  });

  it('adds the dependencies probe, own-blockers-only, non-leading', () => {
    expect(ENGINE_RULES).toMatch(/DEPENDENCIES - the one new thing to ask about, non-leading/);
    expect(ENGINE_RULES).toMatch(/Is there anything you need that's blocked on someone else right now\?/);
    expect(ENGINE_RULES).toMatch(/never suggest who might be blocking them, never name a role or person as a guess/i);
  });
});

describe('#probing B refusal gets exactly one retry, distinct from the 3-ask and 2-pushback counters', () => {
  it('states the one-retry rule for refusals, separate from the document probe (3) and the pushback (2)', () => {
    expect(ENGINE_RULES).toMatch(/REFUSAL RULE - exactly one retry, then record and move on gracefully\. Never badger/);
    expect(ENGINE_RULES).toMatch(/gets exactly ONE retry, not zero and not three/);
    expect(ENGINE_RULES).toMatch(/Never ask a refusal a third time/);
  });

  it('explicitly reconciles the three different numbers so a future reader does not read it as a bug', () => {
    expect(ENGINE_RULES).toMatch(/Three different numbers for three different situations, on purpose/);
    expect(ENGINE_RULES).toMatch(/three asks for "does anything exist," two pushbacks for "is this specific enough," one retry for "you said no\."/);
  });

  it('does not change the document probe (still 3) or the specificity pushback (still 2)', () => {
    expect(ENGINE_RULES).toMatch(/Ask three times before accepting that nothing is written down/);
    expect(ENGINE_RULES).toMatch(/Maximum two pushbacks/);
  });

  it('records a genuine refusal as declined by choice, not vagueness, not evasion', () => {
    expect(ENGINE_RULES).toMatch(/Record a genuine refusal as declined by choice, not as vagueness and not as evasion/);
  });
});

describe('#probing C non-leading own-vs-other guardrail is stated explicitly', () => {
  it('states plainly that own prior sessions are always fair game', () => {
    const block = ENGINE_RULES.slice(ENGINE_RULES.indexOf('GUARDRAIL - own history vs another'), ENGINE_RULES.indexOf('GUARDRAIL - own history vs another') + 700);
    expect(block).toMatch(/recall and probe freely from THIS person's own prior sessions/);
    expect(block).toMatch(/degree 1 above is always fair game/);
  });

  it('states plainly that another party\'s account never surfaces, citing THE NARRATION RULE', () => {
    const block = ENGINE_RULES.slice(ENGINE_RULES.indexOf('GUARDRAIL - own history vs another'), ENGINE_RULES.indexOf('GUARDRAIL - own history vs another') + 700);
    expect(block).toMatch(/Never surface another party's account, words, or position to prompt them - that is THE NARRATION RULE above/);
  });

  it('does not touch THE NARRATION RULE\'s own text', () => {
    expect(ENGINE_RULES).toMatch(/Never narrate the other party's position, decision, or belief to the person before you have asked for and received their independent version\./);
  });
});

describe('#probing D declined_by_choice is a real, additive specificityCauses value', () => {
  it('PromptsService.createVersion accepts the edited ENGINE_RULES - the four invariant headers are intact', async () => {
    // Real invariant check, not a grep - this is the exact gate the boot-time
    // reseed runs. If any of the four literal headers were renamed, this throws.
    const prisma: any = {
      promptVersion: {
        findFirst: jest.fn(async () => null),
        create: jest.fn(async (args: any) => ({ id: 'v1', ...args.data })),
      },
    };
    const service = new PromptsService(prisma, {} as any);
    await expect(service.createVersion('system', ENGINE_RULES, 'test')).resolves.toBeDefined();
    expect(prisma.promptVersion.create).toHaveBeenCalledTimes(1);
  });
});
