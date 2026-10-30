import * as fs from 'fs';
import * as path from 'path';

/** Samuel Otieno, polish round 2: added on People, then to the sales check-in by his address, and read as "A" on the board all week. */
describe('a person on the organisation\'s list keeps that name when added to a check-in by address', () => {
  const src = fs.readFileSync(path.join(__dirname, 'grounds.service.ts'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
  it('the name on the list is read when nobody with that address has signed in', () => {
    const member = src.indexOf('colleagueName = (await theMemberWithThisAddress(');
    const listed = src.indexOf("where: { organizationId, email: { equals: dto.email.toLowerCase(), mode: 'insensitive' }, active: true }");
    expect(member).toBeGreaterThan(-1);
    expect(listed).toBeGreaterThan(member);
  });
});
