import { GroundScenario, PartyType } from '@prisma/client';
import { EntryService, buildEntrySystemPrompt } from '../entry/entry.service';
import { theThingsThatCannotBeMissed } from './the-last-thing-it-reads-is-the-thing-it-must-not-miss';
import { theyPushedBackOnTheQuestions } from './asked-twice-and-told-no-twice';
import { SEED_PROMPTS } from './prompt-library';
import {
  ANCHOR_ENTRY_SCENARIO,
  ANCHOR_LEAD_PROMPT,
  ANCHOR_LEAD_PROMPT_KEY,
  THE_ECONOMIC_ENGINE_GUIDANCE,
  CHALLENGING_THE_LEAD_GUIDANCE,
} from './the-anchor-lead-conversation';

/**
 * The lead who arrives from the anchor link (docs/anchor-scenario.md, sections 4 to 10), as the
 * model is given it. What matters is what reaches the model: with the switch on and the anchor
 * conversation, the scenario's guidance; in every other case, the same bytes as before.
 */
function world(switchOn: boolean, stored?: { id: string; content: string }) {
  const prisma: any = { platformSetting: { findUnique: jest.fn(async () => (switchOn ? { value: { on: true } } : null)) } };
  const prompts: any = { getActive: jest.fn(async () => { if (!stored) throw new Error('none'); return stored; }) };
  const service = new EntryService({} as any, prisma, {} as any, {} as any, {} as any, {} as any, {} as any, prompts);
  const seen: string[] = [];
  (service as any).guardedReplyWithClose = jest.fn(async (system: string) => { seen.push(system); return { reply: 'ok', closed: false }; });
  return { service, seen };
}

const said = [{ role: 'user' as const, content: 'My team waits for leads to land in their lap.' }];
const oldWay = (scenario: GroundScenario, label: string) =>
  `${buildEntrySystemPrompt(scenario, label, PartyType.INITIATOR, undefined, undefined)}\n\n---\n\n${theThingsThatCannotBeMissed(said[0].content, theyPushedBackOnTheQuestions(said[0].content))}`;

describe('anchor piece 5: how this organisation keeps going is found out by asking', () => {
  it('with the switch on, the anchor conversation is told never to assume that revenue means sales', async () => {
    const { service, seen } = world(true);
    await service.chat(said, ANCHOR_ENTRY_SCENARIO);
    expect(seen[0]).toContain('You must never assume that revenue means sales.');
    expect(seen[0]).toContain('How does the money that pays for this work actually come in?');
    expect(seen[0]).toContain('What does the lead\'s group do that keeps that money coming?');
    expect(seen[0]).toContain('Never ask "what is your revenue target?"');
    expect(seen[0]).toContain('grants and donors, a government budget');
  });

  it('gives the model the seven kinds of organisation as things to listen for, and does not make the lead pick one', () => {
    for (const heard of ['A sales team', 'A project or service team', 'A lender', 'A subscription business', 'A firm that sells expert work', 'A marketplace', 'A grant-funded or development organisation']) {
      expect(THE_ECONOMIC_ENGINE_GUIDANCE).toContain(heard);
    }
    expect(THE_ECONOMIC_ENGINE_GUIDANCE).toContain('you must not name one for the lead');
    expect(THE_ECONOMIC_ENGINE_GUIDANCE).toContain('Never say "economic engine"');
  });

  it('is guidance and not a script: one question at a time, nothing invented', () => {
    expect(ANCHOR_LEAD_PROMPT).toContain('This is guidance, not a script.');
    expect(ANCHOR_LEAD_PROMPT).toContain('one sharp question at a time');
    expect(ANCHOR_LEAD_PROMPT).toContain('Never invent a fact, a name, a number or a reason.');
  });

  it('starts from the scenario\'s first question, never from a target', () => {
    expect(ANCHOR_LEAD_PROMPT).toContain("What's happening right now that makes you wish your team saw more of what you see?");
  });

  it('runs the words stored in the database, and says which version ran', async () => {
    const { service, seen } = world(true, { id: 'pv-7', content: 'STORED ANCHOR WORDS' });
    const out = await service.chat(said, ANCHOR_ENTRY_SCENARIO);
    expect(seen[0]).toContain('STORED ANCHOR WORDS');
    expect(seen[0]).not.toContain('You must never assume that revenue means sales.');
    expect(out.promptVersionId).toBe('pv-7');
  });

  it('is seeded under its own key, so a stored version can replace the file', () => {
    expect(ANCHOR_LEAD_PROMPT_KEY.startsWith('scenario.')).toBe(false);
    expect(SEED_PROMPTS.find((s) => s.key === ANCHOR_LEAD_PROMPT_KEY)?.content).toBe(ANCHOR_LEAD_PROMPT);
  });
});

describe('anchor piece 6: the lead is challenged kindly, once, and the gaps are said plainly', () => {
  it('with the switch on, the anchor conversation carries the six questions in the scenario\'s words', async () => {
    const { service, seen } = world(true);
    await service.chat(said, ANCHOR_ENTRY_SCENARIO);
    for (const q of [
      'Have you actually told them this?',
      'How much context do they have?',
      'Would somebody know this was expected from their current role?',
      'Do they understand why this matters now?',
      'Could someone do their formal job extremely well and still fail the expectation you\'re describing?',
      'Are you asking them to take ownership while retaining all the decision-making yourself?',
    ]) expect(seen[0]).toContain(q);
  });

  it('gives the scenario\'s own sentence about missing context', () => {
    expect(CHALLENGING_THE_LEAD_GUIDANCE).toContain("Part of what you're describing may not be an ownership problem. Your team may not have enough context to make the decisions you're hoping they'll make.");
  });

  it('asks once, kindly, after the lead has been heard, and only where it fits', () => {
    expect(CHALLENGING_THE_LEAD_GUIDANCE).toContain('Do it once.');
    expect(CHALLENGING_THE_LEAD_GUIDANCE).toContain('Never in the first turns.');
    expect(CHALLENGING_THE_LEAD_GUIDANCE).toContain('with no blame and no verdict');
    expect(CHALLENGING_THE_LEAD_GUIDANCE).toContain('If nothing the lead has said gives you a reason, do not challenge at all.');
  });

  it('says plainly when it lacks context, and does not fill the gap', () => {
    expect(CHALLENGING_THE_LEAD_GUIDANCE).toContain('I don\'t know enough about that yet to say, and I would rather ask than guess.');
    expect(CHALLENGING_THE_LEAD_GUIDANCE).toContain('Do not fill a gap with something that sounds likely.');
  });

  it('is part of the stored prompt too', () => {
    expect(SEED_PROMPTS.find((s) => s.key === ANCHOR_LEAD_PROMPT_KEY)?.content).toContain(CHALLENGING_THE_LEAD_GUIDANCE);
  });
});

describe('with the switch off, nothing changes anywhere', () => {
  const every: (GroundScenario | undefined)[] = [undefined, ...Object.values(GroundScenario)];

  it.each(every.map((s) => [s ?? 'no situation', s]))('the prompt for %s is exactly what it was, with the switch off or on', async (_n, s) => {
    for (const on of [false, true]) {
      const { service, seen } = world(on, { id: 'pv-7', content: 'STORED ANCHOR WORDS' });
      const out = await service.chat(said, s as string | undefined, 'A label');
      const expected = oldWay((s as GroundScenario | undefined) ?? GroundScenario.NEW_PROJECT, 'A label');
      expect(seen[0]).toBe(expected);
      expect(out.promptVersionId).toBeUndefined();
    }
  });

  it('the anchor conversation itself reads exactly the old prompt while the switch is off', async () => {
    const { service, seen } = world(false, { id: 'pv-7', content: 'STORED ANCHOR WORDS' });
    const out = await service.chat(said, ANCHOR_ENTRY_SCENARIO);
    expect(seen[0]).toBe(oldWay(GroundScenario.NEW_PROJECT, ANCHOR_ENTRY_SCENARIO));
    expect(out.promptVersionId).toBeUndefined();
  });
});
