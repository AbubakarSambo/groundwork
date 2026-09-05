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

const withoutComments = (file: string) =>
  fs
    .readFileSync(file, 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\/\/.*$/gm, '');

const source = withoutComments(path.join(__dirname, 'a-check-in-a-customer-can-run.service.ts'));

/*
 * THE RULE MOVED, SO THE GUARD MOVED WITH IT.
 *
 * Matching a participant by the address an invitation went to lived in this
 * service and now lives in the one assembly, because it existed three times and
 * this copy was the one that got it wrong. The guard follows the rule rather
 * than the file it used to be in — a guard left pointing at the old address
 * passes forever and protects nothing.
 */
const assembly = withoutComments(
  path.join(__dirname, '../assistant/what-is-true.service.ts'),
);

describe('what is waiting for somebody', () => {
  it('looks for the address the invitation went to, as well as the account', () => {
    expect(assembly).toMatch(/OR: \[/);
    expect(assembly).toMatch(/userId: null, email: person\.email/);
  });

  it('and keeps the unaccepted ones apart from the openable ones', () => {
    /* They are not openable, and showing them in the same list would produce a
       button that refuses. */
    expect(source).toMatch(/invitationNotAccepted/);
    expect(assembly).toMatch(/participant\.userId === null \? 'invitation not accepted' : 'open to you'/);
  });

  it('and never accepts the invitation on their behalf', () => {
    /**
     * ACCEPTING IS THE ACT BY WHICH A PERSON AGREES TO TAKE PART. Linking the
     * participant here would be the system doing that for them, which is not a
     * formality to route around because it is in the way — it is the consent.
     */
    expect(source).not.toMatch(/participant\.update|groundParticipant\.update/);
    expect(assembly).not.toMatch(/participant\.update|groundParticipant\.update/);
  });

  it('and says why it is empty rather than only that it is', () => {
    expect(source).toMatch(/invitation has not been accepted yet/);
  });
});
