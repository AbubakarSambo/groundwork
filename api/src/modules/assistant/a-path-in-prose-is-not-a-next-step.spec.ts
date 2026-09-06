/**
 * WHERE A YES GOES, AND WHY IT STOPPED BEING A SENTENCE.
 *
 * Accepting a suggested conversation answered with the words "Open
 * /grounds/new?scenario=... to set it up". In the product that path works. In
 * the embedded panel the same sentence is read on a page served by the
 * CUSTOMER, where a relative path resolves against their origin and 404s — and
 * made absolute it walks somebody out of their own system into ours, which is
 * the opposite of what the panel is for.
 *
 * It read fine in every place it was tested, which is why it needed following
 * rather than reviewing.
 */
import * as fs from 'fs';
import * as path from 'path';
import { acceptedLine, acceptedNextStep } from './a-suggestion-you-can-answer';

const suggestion = {
  id: 'c1',
  scenario: 'DRIFT',
  says: 'x',
  subjectExternalId: null,
  personExternalId: null,
  daysLeft: 3,
} as never;

describe('what a yes says', () => {
  it('contains no path at all', () => {
    expect(acceptedLine(suggestion)).not.toMatch(/\/grounds|https?:|\?scenario=/);
  });

  it('and still says what happens next in words', () => {
    expect(acceptedLine(suggestion)).toContain('Setting it up is the next step');
  });
});

describe('where it goes', () => {
  it('is a block, so a panel can route it into the customer\'s own application', () => {
    const step = acceptedNextStep(suggestion);
    expect(step.kind).toBe('set_up_a_check_in');
    expect(step.href).toBe('/grounds/new?scenario=DRIFT');
  });

  it('and carries what we already know, so a setup screen need not ask again', () => {
    expect(acceptedNextStep(suggestion).context.scenario).toBe('DRIFT');
  });
});

describe('the panel that reads it', () => {
  /**
   * A BLOCK NOTHING RENDERS IS THE DISEASE THIS CODEBASE KEEPS TURNING UP.
   *
   * The panel maps blocks to `body ?? text`. A `next_step` carries neither, so
   * before this it was filtered out — silently dropping the only actionable
   * part of the reply while the rest rendered perfectly.
   */
  /* Comments stripped before matching. The note in the panel explaining why the
     block is not a link contains the words the check looks for, so without this
     the explanation would satisfy the rule it explains. */
  const panel = fs
    .readFileSync(
      path.join(__dirname, '../../../../client/src/pages/ops/TheAssistantAsACustomerSeesIt.tsx'),
      'utf8',
    )
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\/\/.*$/gm, '');

  it('knows the shape', () => {
    expect(panel).toMatch(/b\.type === 'next_step'/);
  });

  it('and does not render it as a link out of the customer\'s own page', () => {
    const branch = panel.slice(panel.indexOf("b.type === 'next_step'"), panel.indexOf("b.type === 'next_step'") + 400);
    expect(branch).not.toMatch(/<a |href=\{/);
  });
});
