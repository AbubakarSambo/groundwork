import { readFileSync } from 'fs';
import { join } from 'path';
import { buildDeliveriesBlock } from './what-they-say-they-delivered';

/**
 * WHAT SOMEBODY SAYS THEY DELIVERED IS A CLAIM TO TEST, NOT A RESULT TO BANK.
 *
 * The Context page states what is expected of a person, and until now gave them nowhere to answer
 * it - so their side of it reached the record only if they got it out in a session. That favours
 * whoever speaks first and longest, which is the bias this product was built against.
 *
 * The fix has one obvious wrong shape: let people write what they delivered and treat it as the
 * record. A form is the easiest thing in the world to write well and nothing checks it, so the
 * record would fill up with self-reports nobody ever questioned - the same failure a between-session
 * note is guarded against, arriving by a different door.
 *
 * So a delivery gets its own table, never RecordEntry, and reaches the session as a QUESTION. These
 * assert the wording at the assembled block, because the block is what the model actually reads.
 */
const SERVICE = readFileSync(join(__dirname, 'conversation.service.ts'), 'utf8');
const CODE = SERVICE.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
const SCHEMA = readFileSync(join(__dirname, '../../../prisma/schema.prisma'), 'utf8')
  .replace(/\/\/\/.*$/gm, '')
  .replace(/^\s*\/\/.*$/gm, '');

describe('where a claimed delivery is stored', () => {
  it('has a table of its own', () => {
    expect(SCHEMA).toContain('model Delivery');
  });

  it('is never written to the record', () => {
    // recordEntry.create anywhere near the delivery write would put an unquestioned claim into
    // the table the shared report reads.
    const writes = CODE.match(/prisma\.delivery\.\w+/g) ?? [];
    expect(writes.length).toBeGreaterThan(0);
    for (const w of writes) expect(w).not.toContain('recordEntry');
  });

  it('is raised once, not in every session from now on', () => {
    // Same mechanism as a note: stamped carried when it is PUT to them.
    expect(CODE).toContain('carriedIntoCheckInId: null');
    expect(CODE).toMatch(/prisma\.delivery[\s\S]{0,200}carriedIntoCheckInId: checkIn\.id/);
  });

  it('reaches the assembled prompt', () => {
    expect(CODE).toMatch(/notesBlock, deliveriesBlock\]/);
  });
});

describe('what the block actually says to the engine', () => {
  const block = buildDeliveriesBlock([
    { text: 'Closed the renewal', evidence: 'signed 4 March', against: 'Get the renewal over the line' },
    { text: 'Rewrote the onboarding email' },
  ]);

  it('says nothing at all when there is nothing', () => {
    expect(buildDeliveriesBlock([])).toBe('');
    expect(buildDeliveriesBlock([{ text: '   ' }])).toBe('');
  });

  it('names it as their own unchecked claim', () => {
    expect(block).toMatch(/their own claims/i);
    expect(block).toMatch(/nothing in them has been checked/i);
  });

  it('refuses to let it be banked as established', () => {
    expect(block).toMatch(/do not put any of it on record as established/i);
    expect(block).toMatch(/do not read it back as though it is settled/i);
  });

  it('sends it back as a question, and makes the answer the record', () => {
    expect(block).toMatch(/as a question/i);
    expect(block).toMatch(/under questioning is what goes on\s+record/i);
  });

  it('carries the expectation it is offered against, so the two are read together', () => {
    expect(block).toContain('Get the renewal over the line');
  });

  /**
   * THE ONE THAT MATTERS MOST. "I shipped it" and "I shipped it, PR 412" are different kinds of
   * sentence, and if the block flattens them the engine has no way to press on the weaker one.
   */
  it('says out loud which claims point at nothing', () => {
    expect(block).toContain('they point at: "signed 4 March"');
    expect(block).toContain('they point at nothing in particular');
    expect(block).toMatch(/press hardest\s+on anything they point at nothing for/i);
  });
});

/**
 * WHOSE DELIVERY IT IS, AND WHAT IT ANSWERS.
 *
 * Two ways this goes wrong quietly. A delivery filed against somebody else's expectation puts a
 * claim under words that belong to another person, on a page everybody reads. And a delivery taken
 * back after a session has raised it edits the run-up to a conversation that already happened -
 * the record would then hold an answer to a question whose prompt has been deleted.
 */
describe('whose delivery it is', () => {
  const GROUNDS = readFileSync(join(__dirname, '../grounds/grounds.service.ts'), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '');

  function fn(name: string): string {
    const i = GROUNDS.indexOf(`async ${name}(`);
    expect(i).toBeGreaterThan(-1);
    const rest = GROUNDS.slice(i);
    return rest.slice(0, rest.indexOf('\n  }\n'));
  }

  it('can only be filed against one of your own expectations', () => {
    const add = fn('addDelivery');
    expect(add).toMatch(/personObjective\.findFirst\([\s\S]{0,160}participantId: me\.id/);
  });

  it('cannot be taken back once a session has raised it', () => {
    expect(fn('deleteMyDelivery')).toContain('carriedIntoCheckInId: null');
  });

  it('cannot be taken back by anybody else', () => {
    expect(fn('deleteMyDelivery')).toContain('participantId: me.id');
  });
});
