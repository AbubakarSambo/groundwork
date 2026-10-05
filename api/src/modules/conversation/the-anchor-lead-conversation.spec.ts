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
  THE_HOPE_GUIDANCE,
  THE_HOPE_QUESTION,
  BEHAVIOURS_THAT_WOULD_SHOW_IT_WAS_BETTER,
  whatTheConversationHasAlreadyUsed,
  THE_ANCHOR_REMINDER,
  READ_THIS_LAST,
  splitWhatIsReadLast,
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

  it('comes before the situation\'s own questions, and every turn ends with one question', () => {
    expect(ANCHOR_LEAD_PROMPT).toContain('comes before the situation\'s own opening and questions');
    expect(ANCHOR_LEAD_PROMPT).toContain('Every turn ends with exactly one question, and only one.');
    expect(ANCHOR_LEAD_PROMPT).toContain('never ask the first question again');
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

  it('asks once, kindly, after the lead has been heard, and where it fits', () => {
    expect(CHALLENGING_THE_LEAD_GUIDANCE).toContain('Do it once, in the whole conversation.');
    expect(CHALLENGING_THE_LEAD_GUIDANCE).toContain('you have used your one challenge, and none of the others may be asked');
    expect(CHALLENGING_THE_LEAD_GUIDANCE).toContain('Never in the first turns.');
    expect(CHALLENGING_THE_LEAD_GUIDANCE).toContain('with no blame and no verdict');
    expect(CHALLENGING_THE_LEAD_GUIDANCE).toContain('Leave the challenge out only when the lead has already answered it themselves');
  });

  it('says plainly when it lacks context, and does not fill the gap', () => {
    expect(CHALLENGING_THE_LEAD_GUIDANCE).toContain('I don\'t know enough about that yet to say, and I would rather ask than guess.');
    expect(CHALLENGING_THE_LEAD_GUIDANCE).toContain('Do not fill a gap with something that sounds likely.');
  });

  it('is part of the stored prompt too', () => {
    expect(SEED_PROMPTS.find((s) => s.key === ANCHOR_LEAD_PROMPT_KEY)?.content).toContain(CHALLENGING_THE_LEAD_GUIDANCE);
  });
});

describe('anchor piece 7: the hope question, and the behaviours to watch for', () => {
  it('with the switch on, the anchor conversation is told to ask the scenario\'s hope question', async () => {
    const { service, seen } = world(true);
    await service.chat(said, ANCHOR_ENTRY_SCENARIO);
    expect(seen[0]).toContain('Imagine a month from now and this is meaningfully better. What would you notice people doing without you having to ask?');
  });

  it('asks it once, alone in its turn, after the lead has been heard', () => {
    expect(THE_HOPE_GUIDANCE).toContain('Ask it once, and as the only question in that turn.');
    expect(THE_HOPE_GUIDANCE).toContain('Your turn right after the lead answers the one challenge is the hope question');
    expect(CHALLENGING_THE_LEAD_GUIDANCE).toContain('The turn after the lead answers your challenge is the hope question below.');
    expect(THE_HOPE_GUIDANCE).toContain('Do not ask it before the lead has been heard');
  });

  it('carries the scenario\'s behaviours as examples to offer when the lead is stuck, never as a list to read out', () => {
    expect(BEHAVIOURS_THAT_WOULD_SHOW_IT_WAS_BETTER).toHaveLength(11);
    for (const b of ['bringing ideas', 'raising problems earlier', 'carrying things without escalation']) expect(THE_HOPE_GUIDANCE).toContain(b);
    expect(THE_HOPE_GUIDANCE).toContain('never more than three');
    expect(THE_HOPE_GUIDANCE).toContain('Never read the list out');
  });

  it('keeps what the lead would notice in their own words and puts no label on anybody', () => {
    expect(THE_HOPE_GUIDANCE).toContain('Keep the lead\'s own words');
    expect(THE_HOPE_GUIDANCE).toContain('Do not turn them into a score or a label about anybody.');
    expect(THE_HOPE_QUESTION.endsWith('?')).toBe(true);
  });

  it('is part of the stored prompt too', () => {
    expect(SEED_PROMPTS.find((s) => s.key === ANCHOR_LEAD_PROMPT_KEY)?.content).toContain(THE_HOPE_GUIDANCE);
  });
});

describe('the conversation is told what it has already used, read from its own earlier turns', () => {
  const ask = (t: string) => [{ role: 'assistant', content: 'What is happening?' }, { role: 'user', content: 'x' }, { role: 'assistant', content: t }, { role: 'user', content: 'y' }];

  it('says the one challenge is spent once any of the six has been asked', () => {
    for (const t of ['Have you actually told them this?', 'How much context do they have about it?', 'Would somebody know this was expected from their current role?', 'Could someone do their formal job extremely well and still fail it?']) {
      expect(whatTheConversationHasAlreadyUsed(ask(t))).toContain('You have already used your one challenge');
    }
  });

  it('says the hope question is spent once it has been asked', () => {
    expect(whatTheConversationHasAlreadyUsed(ask('Imagine a month from now and this is meaningfully better. What would you notice?'))).toContain('You have already asked the hope question');
  });

  it('says nothing before either has been used, and never counts what the lead typed', () => {
    expect(whatTheConversationHasAlreadyUsed(ask('What do you wish people worried about a little more?'))).toBe('');
    expect(whatTheConversationHasAlreadyUsed([{ role: 'user', content: 'Have you actually told them? Imagine a month from now' }])).toBe('');
  });

  it('reaches the model, in the conversation where it has happened', async () => {
    const { service, seen } = world(true);
    await service.chat([...ask('Have you actually told them this?'), { role: 'user' as const, content: 'No.' }] as any, ANCHOR_ENTRY_SCENARIO);
    expect(seen[0]).toContain('You have already used your one challenge');
    expect(seen[0].endsWith(whatTheConversationHasAlreadyUsed([...ask('Have you actually told them this?')]))).toBe(true);
    expect(seen[0]).toContain(THE_ANCHOR_REMINDER);
    const fresh = world(true);
    await fresh.service.chat(said, ANCHOR_ENTRY_SCENARIO);
    expect(fresh.seen[0]).not.toContain('You have already used your one challenge');
  });
});

describe('the short reminder read last is in the stored prompt, not only in the code', () => {
  it('is part of the seeded prompt, after the line that marks what is read last', () => {
    const seeded = SEED_PROMPTS.find((s) => s.key === ANCHOR_LEAD_PROMPT_KEY)!.content;
    expect(seeded).toContain(`${READ_THIS_LAST}\n\n${THE_ANCHOR_REMINDER}`);
    expect(splitWhatIsReadLast(seeded).last).toBe(THE_ANCHOR_REMINDER);
    expect(splitWhatIsReadLast(seeded).main).not.toContain('For this lead, these come first');
  });

  it('is read last from the stored version, so a stored version without it has none', async () => {
    const withIt = world(true, { id: 'pv-8', content: `STORED MAIN\n\n${READ_THIS_LAST}\n\nSTORED REMINDER` });
    const out = await withIt.service.chat(said, ANCHOR_ENTRY_SCENARIO);
    expect(withIt.seen[0].endsWith('STORED REMINDER')).toBe(true);
    expect(withIt.seen[0]).not.toContain(READ_THIS_LAST);
    expect(withIt.seen[0]).not.toContain(THE_ANCHOR_REMINDER);
    expect(out.promptVersionId).toBe('pv-8');
    const without = world(true, { id: 'pv-9', content: 'STORED MAIN ONLY' });
    await without.service.chat(said, ANCHOR_ENTRY_SCENARIO);
    expect(without.seen[0]).toContain('STORED MAIN ONLY');
    expect(without.seen[0]).not.toContain(THE_ANCHOR_REMINDER);
  });

  it('falls back to the reminder in the code only when nothing is stored', async () => {
    const none = world(true);
    await none.service.chat(said, ANCHOR_ENTRY_SCENARIO);
    expect(none.seen[0].endsWith(THE_ANCHOR_REMINDER)).toBe(true);
  });
});

describe('the hope question is counted as asked however the model puts it', () => {
  const ask = (t: string) => [{ role: 'assistant', content: 'What is happening?' }, { role: 'user', content: 'x' }, { role: 'assistant', content: t }, { role: 'user', content: 'y' }];
  it.each([
    'In a month, if this were meaningfully better, what would you see them doing?',
    'Picture a month from now with this going well. What would you notice your team doing?',
    'If this were better in a month, what would you notice people doing without you having to ask?',
    'What would you want to see them doing without you pushing?',
  ])('%s', (t) => {
    expect(whatTheConversationHasAlreadyUsed(ask(t))).toContain('You have already asked the hope question');
  });
  it('does not count the ordinary opening questions', () => {
    expect(whatTheConversationHasAlreadyUsed(ask('What are you finding yourself constantly pushing?'))).toBe('');
  });
});

describe('the anchor conversation does not also run the questions of the situation it would fall back to', () => {
  it('replaces the situation\'s pack and the general interview with its own words', async () => {
    const { service, seen } = world(true);
    await service.chat(said, ANCHOR_ENTRY_SCENARIO);
    expect(seen[0]).toContain('You must never assume that revenue means sales.');
    expect(seen[0]).not.toContain('What would you want them to be able to point at');
    expect(seen[0]).toContain('This situation has its own opening and its own follow-ups, below. Run those.');
  });
});

describe('with the switch off, nothing changes anywhere', () => {
  const every: (GroundScenario | undefined)[] = [undefined, ...Object.values(GroundScenario)];

  it.each(every.map((s) => [s ?? 'no situation', s]))('the prompt for %s is exactly what it was, with the switch off or on', async (_n, s) => {
    /* The anchor's own situation is the one that is allowed to read differently, and only while the switch is on: it has its own tests above. With it off it is a project, as it was before it was a situation. */
    for (const on of s === GroundScenario.HELP_TEAM_UNDERSTAND ? [false] : [false, true]) {
      const { service, seen } = world(on, { id: 'pv-7', content: 'STORED ANCHOR WORDS' });
      const out = await service.chat(said, s as string | undefined, 'A label');
      const expected = oldWay(s === GroundScenario.HELP_TEAM_UNDERSTAND || !s ? GroundScenario.NEW_PROJECT : (s as GroundScenario), 'A label');
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

describe('anchor piece 8 and the guarded lead: what the model is given', () => {
  it('lists the six kinds of lead as things to listen for, with what better looks like, and never to be named to the lead', () => {
    for (const heard of ['A chief executive or founder', 'A sales lead', 'A project lead', 'A delivery lead', 'A product lead', 'A finance lead']) {
      expect(ANCHOR_LEAD_PROMPT).toContain(heard);
    }
    expect(ANCHOR_LEAD_PROMPT).toContain('everyone treats collecting what is owed as finance\'s problem');
    expect(ANCHOR_LEAD_PROMPT).toContain('You must never name one of them to the lead, never read them out, and never choose one for the lead.');
  });

  it('tells the model what to do with a guarded lead, including one who says revenue is somebody else\'s job', () => {
    expect(ANCHOR_LEAD_PROMPT).toContain('Never argue, never defend Groundwork, and never treat the lead as difficult.');
    expect(ANCHOR_LEAD_PROMPT).toContain('"revenue is sales\' job"');
    expect(ANCHOR_LEAD_PROMPT).toContain('do not correct them and do not agree');
  });

  it('asks one thing at a time, and no filler', () => {
    expect(ANCHOR_LEAD_PROMPT).toContain('One question means one thing asked');
    expect(ANCHOR_LEAD_PROMPT).toContain('do not add filler such as "to be clear"');
  });

  it('is what is stored when the app starts, so the version that runs is this one', () => {
    const seeded = SEED_PROMPTS.find((p) => p.key === ANCHOR_LEAD_PROMPT_KEY);
    expect(seeded?.content).toBe(ANCHOR_LEAD_PROMPT);
  });
});
