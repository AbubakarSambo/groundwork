import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * DECISION 66, 30 SEPTEMBER 2026: A NOTE TYPED ON THE CONTEXT AND RESOURCES TAB LIFTS THE
 * "NOBODY CAN BE INVITED YET" BLOCK, THE SAME AS A PRIVATE NOTE, AN EXPECTATION, A DOCUMENT OR A
 * LONG ENOUGH BRIEF.
 *
 * The tab's lines live in groundContextItem now, not leadContextNote, so the gate never saw them:
 * a lead who typed a note there and nothing else was told "nothing has been said about what this
 * check-in is for," which was no longer true.
 *
 * ONLY kind NOTE COUNTS. The tab sorts what is typed into five buckets, and only one of them is
 * called a note on the tab itself - "Notes." The other four are titled by what they are: "The
 * strategy," "How we work," "Still to decide," "Not settled." Stretching "a shared note" to cover
 * all five would count things the person typing them never called a note, so only NOTE clears the
 * gate here; the other four keep clearing it, or not, by the routes they already had (the brief,
 * a document, an expectation, the lead's own finished check-in).
 *
 * A RETIRED NOTE DOES NOT COUNT. closedAt is set when a line stops being live, and a line that is
 * no longer live says nothing current about what the check-in is for.
 *
 * The refusal's own sentence is untouched by this decision and is pinned again here so a future
 * change to the gate cannot drift it without failing a test that says so in as many words.
 *
 * Comments stripped: this file's own explanation quotes the code it protects.
 */
const SRC = readFileSync(join(__dirname, 'grounds.service.ts'), 'utf8')
  .replace(/\/\*[\s\S]*?\*\//g, ' ')
  .replace(/^\s*\/\/.*$/gm, '');

const GATE = SRC.slice(
  SRC.indexOf('private async assertSomethingToBeInvitedInto'),
  SRC.indexOf('async addParticipant('),
);

describe('decision 66: a shared note lifts the block', () => {
  it('finds the gate, so an empty slice cannot pass', () => {
    expect(GATE.length).toBeGreaterThan(300);
  });

  it('a line on the Context and resources tab now counts, read from groundContextItem', () => {
    expect(GATE).toContain('groundContextItem.count');
    expect(GATE).toContain('kind: ContextItemKind.NOTE');
    expect(GATE).toContain('contextNotes > 0');
  });

  it('only kind NOTE, because that is the only bucket the tab itself calls a note', () => {
    const contextItemQuery = GATE.slice(
      GATE.indexOf('groundContextItem.count'),
      GATE.indexOf('}),', GATE.indexOf('groundContextItem.count')),
    );
    expect(contextItemQuery).toContain('ContextItemKind.NOTE');
    expect(contextItemQuery).not.toContain('STRATEGY');
    expect(contextItemQuery).not.toContain('WAY_OF_WORKING');
    expect(contextItemQuery).not.toContain('DECISION');
    expect(contextItemQuery).not.toContain('UNSETTLED');
  });

  it('a retired note does not count', () => {
    const contextItemQuery = GATE.slice(
      GATE.indexOf('groundContextItem.count'),
      GATE.indexOf('}),', GATE.indexOf('groundContextItem.count')),
    );
    expect(contextItemQuery).toContain('closedAt: null');
  });

  it('still clears through each of the four existing ways: the finished check-in, a document, the old note, the brief, or an expectation', () => {
    expect(GATE).toContain('status: CheckInStatus.COMPLETED');
    expect(GATE).toContain('partyType: PartyType.INITIATOR');
    expect(GATE).toContain('groundDocument.count');
    expect(GATE).toContain('leadContextNote.count');
    expect(GATE).toContain("(ground?.brief ?? '').trim().length >= GroundsService.MEANS_SOMETHING");
    expect(GATE).toContain('personObjective.count');
  });

  it('does not swallow its own query', () => {
    const contextItemQuery = GATE.slice(
      GATE.indexOf('groundContextItem.count'),
      GATE.indexOf('}),', GATE.indexOf('groundContextItem.count')),
    );
    expect(contextItemQuery).not.toContain('.catch(');
  });

  it('the refusal sentence itself is unchanged by this decision', () => {
    /* Comments are stripped above, but the concatenated string literals still carry the line
     * breaks and indentation between each `+`, so the exact sentence is checked piece by piece,
     * in order, the way the other specs on this gate already do. */
    const theirMessage = SRC.slice(
      SRC.indexOf('running this check-in rather than taking part'),
      SRC.indexOf('Nobody can be invited yet: nothing has been said about what this check-in is for. Write the'),
    );
    expect(theirMessage).toContain('running this check-in rather than taking part in it, so it has to come from you in');
    expect(theirMessage).toContain('writing - write the brief, say what you expect of somebody, or add a document or a note');
    expect(theirMessage).toContain('on the Context and resources tab.');

    const everyoneElsesMessage = SRC.slice(
      SRC.indexOf('Nobody can be invited yet: nothing has been said about what this check-in is for. Write the'),
    );
    expect(everyoneElsesMessage).toContain('Nobody can be invited yet: nothing has been said about what this check-in is for. Write the');
    expect(everyoneElsesMessage).toContain('brief, say what you expect of somebody, add a document or a note on the Context and resources tab, or do');
    expect(everyoneElsesMessage).toContain('your own check-in first.');
  });
});
