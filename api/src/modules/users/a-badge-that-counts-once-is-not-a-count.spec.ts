import * as fs from 'fs';
import * as path from 'path';

/**
 * "CHECKED IN" WAS TRUE OF SOMEBODY WHO HAD ANSWERED ONE SESSION OUT OF TWELVE.
 *
 * The People page's badge asked one question - has this person ever completed a check-in anywhere -
 * and printed a green "Checked in" for a yes. On a rollout where people sit on four or five
 * check-ins that reads as up to date, and it is the number an admin chases by.
 *
 * Reported as "checked in next to people's name being a bit off if they are on multiple check-ins".
 */
const withoutComments = (file: string) =>
  fs
    .readFileSync(path.join(__dirname, file), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\/\/.*$/gm, '');

describe('the People page badge', () => {
  const service = withoutComments('users.service.ts');

  it('counts how many check-ins each person is on, and how many they have answered', () => {
    expect(service).toContain('checkInsOn:');
    expect(service).toContain('checkInsAnswered:');
  });

  it('and still asks the database once for the whole page', () => {
    /* A per-row lookup is 160 round trips on a screen somebody opens every morning, so the count
       has to come from one query over every id on the page. */
    const at = service.indexOf('const memberships =');
    expect(at).toBeGreaterThan(-1);
    const block = service.slice(at, service.indexOf('const onCount', at));
    expect(block).toContain('groundParticipant.findMany');
    expect(block).toContain('userId: { in: ids }');
  });
});
