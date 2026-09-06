/**
 * Where the roster and a signed-in account meet — and the merge that must never happen.
 */
import { whoThePanelIsSignedInAs } from './who-the-panel-is-signed-in-as';

const sam = { id: 'p1', externalId: 'sam', email: 'Sam@Northwind.test', linkedUserId: null };

describe('who a panel person signs in as', () => {
  it('takes the link when there already is one, without matching anything', () => {
    const who = whoThePanelIsSignedInAs({ ...sam, linkedUserId: 'u9' }, []);
    expect(who).toEqual({ linked: true, userId: 'u9', newlyLinked: false });
  });

  it('matches on the address, whatever case it was written in', () => {
    const who = whoThePanelIsSignedInAs(sam, [{ id: 'u1', email: 'sam@northwind.test' }]);
    expect(who).toEqual({ linked: true, userId: 'u1', newlyLinked: true });
  });

  it('and NEVER on the name, because merging two people hands one their colleague\'s check-in', () => {
    /* There is no recoverable version of this mistake. The rule reads one field
       and the type gives it nothing else to read. */
    const source = require('fs')
      .readFileSync(require('path').join(__dirname, 'who-the-panel-is-signed-in-as.ts'), 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/\/\/.*$/gm, '');
    expect(source).not.toMatch(/displayName|\bname\b/);
  });

  it('refuses when nobody has signed in with that address, and says what fixes it', () => {
    const who = whoThePanelIsSignedInAs(sam, [{ id: 'u1', email: 'someone@else.test' }]);
    expect(who.linked).toBe(false);
    expect((who as { because: string }).because).toContain('sign in once');
  });

  it('refuses when the roster has no address for them', () => {
    const who = whoThePanelIsSignedInAs({ ...sam, email: null }, []);
    expect(who.linked).toBe(false);
    expect((who as { because: string }).because).toContain('no email address');
  });

  it('and refuses rather than choosing when two accounts share the address', () => {
    /* It should be impossible. If it ever happens, picking one is picking whose
       check-in a stranger reads. */
    const who = whoThePanelIsSignedInAs(sam, [
      { id: 'u1', email: 'sam@northwind.test' },
      { id: 'u2', email: 'sam@northwind.test' },
    ]);
    expect(who.linked).toBe(false);
    expect((who as { because: string }).because).toContain('More than one account');
  });
});

describe('a person with no account', () => {
  it('is told why, rather than shown an empty panel', () => {
    /* "There is nothing for you" and "we cannot tell who you are" look identical
       on a screen and need opposite things done about them. */
    const who = whoThePanelIsSignedInAs(sam, []);
    expect(who.linked).toBe(false);
    expect((who as { because: string }).because.length).toBeGreaterThan(40);
  });
});
