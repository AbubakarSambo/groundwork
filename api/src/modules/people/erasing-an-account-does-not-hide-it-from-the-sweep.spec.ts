import { readFileSync } from 'fs';
import { join } from 'path';
import { wasThisPerson } from './departure.service';
import { hashed } from '../auth/a-token-is-stored-as-its-hash';

/**
 * ERASING AN ACCOUNT DOES NOT HIDE IT FROM THE SWEEP.
 *
 * eraseAccount rewrote each participant link's address to deleted-<id>@deleted, and the retention
 * sweep matched a departed person's turns by that address - so somebody who erased themselves before
 * the window closed kept their raw turns for ever, the opposite of what erasing is for. The join the
 * plan proposed does not exist in the schema; the fix is on the erasure side (fix plan A16): the link
 * keeps the hash of the address it had, and both sites that match a person to their links match it.
 */
const strip = (t: string) => t.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

describe('a participant link that is, or was, this person', () => {
  it('matches the address or the hash of the address it had', () => {
    expect(wasThisPerson('Ada@Northfield.example')).toEqual({
      OR: [{ email: 'Ada@Northfield.example' }, { erasedFrom: hashed('ada@northfield.example') }],
    });
  });

  it('is what both sweep sites match on', () => {
    const sweep = strip(readFileSync(join(__dirname, 'departure.service.ts'), 'utf8'));
    expect(sweep).toContain('{ fromParticipant: wasThisPerson(person.email) }');
    expect(sweep).toContain('{ onParticipant: wasThisPerson(person.email) }');
    expect(sweep).toContain('participant: { ...wasThisPerson(person.email), ground: { organizationId } }');
    expect(sweep).not.toMatch(/participant: \{ email: person\.email/);
  });

  it('and erasure writes the hash as it takes the address away', () => {
    const users = strip(readFileSync(join(__dirname, '..', 'users', 'users.service.ts'), 'utf8'));
    const erase = users.slice(users.indexOf('async eraseAccount('), users.indexOf('async eraseAccount(') + 2000);
    expect(erase).toContain('erasedFrom: link.email ? hashed(link.email.toLowerCase()) : null');
    expect(erase).toMatch(/select: \{ id: true, email: true \}/);
  });
});
