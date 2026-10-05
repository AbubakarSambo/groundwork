import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * A CHECK-IN NEEDS TWO PEOPLE, SO NOBODY CAN EVALUATE THIS ALONE.
 *
 * One session with nobody to compare against is the worst possible first impression of a product
 * whose entire point is comparing two accounts of the same thing. Somebody who signs up, looks
 * around, and is not ready to ask real colleagues to write about real work has nothing to do.
 *
 * Three facts unlock the whole trial and none of them was anywhere in the product:
 *
 *   they can be both people from one inbox, using a plus address
 *   one rhythm has no clock on it, so the second round can happen today
 *   shortening the run is how you reach the ending, which is otherwise months away
 *
 * The second and third also matter to real customers - a lead who wants a round sooner, or who has
 * never been told the check-in has an ending - and those two are said in place, on Setup and
 * between sessions. This is the trial version of the same three, in one place, for somebody who has
 * not started yet.
 *
 * WHAT IS DELIBERATELY NOT HERE. Everything else a person needs is the product: the picker, the
 * roster, the report. Explaining the picker next to the picker is how a help panel becomes a manual
 * nobody reads, so the tab is those three and nothing else.
 *
 * AND NOT ON THE ADD-PEOPLE FORM. The plus-address trick is a one-time thing for somebody
 * evaluating, and a tip under the email box would sit there for every customer forever, on the
 * screen where they are doing the ordinary thing this product is for.
 */
const strip = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
const CLIENT = join(__dirname, '..', '..', '..', '..', 'client', 'src');
const HELP = strip(readFileSync(join(CLIENT, 'components', 'gw', 'HelpModal.tsx'), 'utf8'));
const LIST = strip(readFileSync(join(CLIENT, 'pages', 'grounds', 'GroundsListPage.tsx'), 'utf8'));
const STORE = readFileSync(join(CLIENT, 'stores', 'help.ts'), 'utf8');

describe('trying it on your own', () => {
  it('is a tab of its own in the help panel', () => {
    expect(HELP).toContain("'Try it'");
    expect(HELP).toContain('function Tab4(');
    expect(HELP).toContain('{tab === 4 &&');
  });

  it('and the store can hold a fifth tab, which is what makes it addressable', () => {
    /* `show(4)` from anywhere. Without this the tab exists and nothing can open it. */
    expect(STORE).toContain('0 | 1 | 2 | 3 | 4');
  });

  it('carries the three facts and no fourth thing', () => {
    expect(HELP).toContain('Be both people from one inbox');
    expect(HELP).toContain('Do the second round today');
    expect(HELP).toContain('See how it ends');
    /* Three steps in the list. A fourth would be the product explaining itself to itself. */
    const at = HELP.indexOf('const TRY_IT = [');
    const end = HELP.indexOf(']', HELP.indexOf('See how it ends'));
    expect((HELP.slice(at, end).match(/title:/g) ?? []).length).toBe(3);
  });

  it('and warns about the one thing that makes the hour worthless', () => {
    /* Answering as yourself twice produces two identical accounts and a report with nothing in it,
       from which the honest conclusion is that the product does nothing. */
    expect(HELP).toContain('Answer as the other person would, not as yourself');
  });
});

describe('and an empty workspace says so', () => {
  it('offers it beside the one instruction that screen used to have', () => {
    /* "Your first check-in is one tap away" means asking real colleagues to write about real work
       before seeing anything the product produces. */
    /*
     * UPDATED, F4 SMALL STATES (e8d5de11): the screens workspace rewrote this empty state to the prototype's own, so the
     * line "Or try it on your own first" is now a link reading "Try one on your own", beside "Set up a check-in". It still
     * opens the same help page (step 4) and is shown only to somebody who may open a check-in. The capability is unchanged.
     */
    expect(LIST).toContain('Try one on your own');
    expect(LIST).toContain('useHelpStore.getState().show(4)');
  });

  it('as a line rather than a second button', () => {
    /* That screen was deliberately cleared of a third button for one action, and this is not the
       action - see the note above it. */
    /*
     * UPDATED, GROUP 2 REBUILD: the page no longer has a class of its own for this - it uses the
     * SHARED `gwui-plain-link` (components/gw/ui/gw-ui.css), the same quiet text link every other
     * rebuilt page uses (SettingsPage's "Remove your name and email", and others). So the check now
     * reads gw-ui.css, not index.css, and `border: 0` (that file's own way of writing no border,
     * used throughout it) alongside `border: none`. The promise itself is unchanged: no fill, no
     * border, underlined.
     */
    const at = LIST.indexOf('Try one on your own');
    const open = LIST.lastIndexOf('<button', at);
    const tag = LIST.slice(open, at);
    const cls = (tag.match(/className="([^"]+)"/) ?? [])[1];
    expect(cls).toBeTruthy();
    const CSS = readFileSync(join(__dirname, '..', '..', '..', '..', 'client', 'src', 'components', 'gw', 'ui', 'gw-ui.css'), 'utf8');
    const rule = (CSS.match(new RegExp(`\\.${cls}\\s*\\{([^}]*)\\}`)) ?? [])[1] ?? '';
    expect(rule).toMatch(/background:\s*none/);
    expect(rule).toMatch(/border:\s*(none|0)\b/);
    expect(rule).toMatch(/text-decoration:\s*underline/);
  });
});
