import { EntryService } from './entry.service';
import { THE_PEOPLE_STEP_RULES } from './the-anchor-people-step';

/**
 * DECISION 114: THE PEOPLE STEP'S WORDS AND LIMIT OF 20, AND THE LINK'S SOURCE MARK, COME OUT OF THE ORDINARY OPENER ROUTE.
 * `POST /entry/opener` carries `thePeopleStep` for a scenario that has its own (the anchor's, with the switch on) and `source`
 * when the link had one. Every other scenario, and the anchor with the switch off, is exactly what it was.
 */
const entry = (on: boolean) => new EntryService({} as any, { platformSetting: { findUnique: jest.fn(async () => ({ value: { on } })) } } as any, {} as any, {} as any, {} as any, {} as any, { emit: jest.fn() } as any);

describe('what the opener carries beside its words', () => {
  it('for the anchor, with the switch on: the people step, in Hafsah\'s words, and the cleaned source mark', async () => {
    const r = await entry(true).openerWithItsRules('Help my team understand', ' Founders-WhatsApp ');
    expect(r.source).toBe('founders-whatsapp');
    expect(r.thePeopleStep).toEqual(THE_PEOPLE_STEP_RULES);
    expect(r.thePeopleStep).toMatchObject({
      limit: 20, mayAdd: 20, heading: 'Who needs to be part of this?',
      limitSentence: 'This one-month Groundwork holds up to 20 people besides you.',
    });
    expect(r.reply).toMatch(/one to one/);
  });

  it('a source that is not a short word is dropped, never kept', async () => {
    for (const bad of ['<script>', 'a b', 'x'.repeat(60), '']) expect('source' in (await entry(true).openerWithItsRules('HELP_TEAM_UNDERSTAND', bad))).toBe(false);
  });

  it('with the switch off, or for another scenario, there is no people step; the words are the ordinary opener\'s', async () => {
    const off = await entry(false).openerWithItsRules('Help my team understand', 'linkedin');
    expect(Object.keys(off)).toEqual(['reply']);
    expect(Object.keys(await entry(false).openerWithItsRules('New hire', 'linkedin'))).toEqual(['reply']);
    expect(off.reply).toBe(await entry(false).opener(undefined));
    const other = await entry(true).openerWithItsRules('New hire');
    expect('thePeopleStep' in other).toBe(false);
    expect(other.reply).toMatch(/^Welcome to Groundwork\./); /* The label openers were never reached and were removed (Hafsah, 14 October): any other situation opens on the ordinary opener. */
  });
});
