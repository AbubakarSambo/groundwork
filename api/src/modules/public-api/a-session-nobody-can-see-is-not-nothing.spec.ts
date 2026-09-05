/**
 * AN EMPTY LIST AND A LIST NOBODY CAN SEE ARE DIFFERENT FACTS.
 *
 * A participant is linked to an account only when somebody ACCEPTS their
 * invitation. Until then the row carries the address the invitation went to and
 * no account — so a query on the account alone tells a person with a session
 * sitting in front of them that there is nothing waiting.
 *
 * Found on our own organisation, which is the point of running the product
 * inside it: a check-in available now, and the panel would have drawn an empty
 * list.
 */
import * as fs from 'fs';
import * as path from 'path';

const source = fs
  .readFileSync(path.join(__dirname, 'a-check-in-a-customer-can-run.service.ts'), 'utf8')
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/\/\/.*$/gm, '');

describe('what is waiting for somebody', () => {
  it('looks for the address the invitation went to, as well as the account', () => {
    expect(source).toMatch(/OR: \[/);
    expect(source).toMatch(/userId: null, email: person\.email/);
  });

  it('and keeps the unaccepted ones apart from the openable ones', () => {
    /* They are not openable, and showing them in the same list would produce a
       button that refuses. */
    expect(source).toMatch(/invitationNotAccepted/);
    expect(source).toMatch(/c\.participant\.userId === null/);
    expect(source).toMatch(/c\.participant\.userId !== null/);
  });

  it('and never accepts the invitation on their behalf', () => {
    /**
     * ACCEPTING IS THE ACT BY WHICH A PERSON AGREES TO TAKE PART. Linking the
     * participant here would be the system doing that for them, which is not a
     * formality to route around because it is in the way — it is the consent.
     */
    expect(source).not.toMatch(/participant\.update|groundParticipant\.update/);
  });

  it('and says why it is empty rather than only that it is', () => {
    expect(source).toMatch(/invitation has not been accepted yet/);
  });
});
