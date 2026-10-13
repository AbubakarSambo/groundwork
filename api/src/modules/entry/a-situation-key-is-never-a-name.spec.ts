import { GroundScenario, PartyType } from '@prisma/client';
import { buildEntrySystemPrompt } from './entry.service';
import { alreadyEstablished } from '../conversation/setup-already-asked-this';
import { isAnInternalName, aNameAPersonGave } from '../../common/no-internal-name-reaches-a-person';

/*
 * Night quality run 2, Naomi Wekesa's walk. She wrote "I run Ridge Bakery in Eldoret with seven staff..." and
 * the first reply read: "I'm here to help you get this new project, NEW_PROJECT, off to a good start". The
 * entry chat had no name yet, sent the key in its place, and the prompt said It is called "NEW_PROJECT".
 */
describe('a situation key is never given to the model as a name', () => {
  it('the entry prompt never calls the check-in NEW_PROJECT, and says the situation in words', () => {
    const prompt = buildEntrySystemPrompt(GroundScenario.NEW_PROJECT, 'NEW_PROJECT', PartyType.INITIATOR);
    expect(prompt).not.toMatch(/called "NEW_PROJECT"/);
    expect(prompt).toContain('This check-in was opened about a new project starting.');
  });

  it('a made-up name ("Entry session") is not a name either', () => {
    const block = alreadyEstablished({ scenario: GroundScenario.NEW_PROJECT, groundLabel: 'Entry session' });
    expect(block).not.toContain('Entry session');
  });

  it('a name the lead gave is still said', () => {
    const block = alreadyEstablished({ scenario: GroundScenario.NEW_PROJECT, groundLabel: 'Ridge Bakery orders' });
    expect(block).toContain('It is called "Ridge Bakery orders".');
  });

  it('what a key looks like, and what it does not', () => {
    for (const k of ['NEW_PROJECT', 'OKR_ALIGNMENT', 'IN_PROGRESS', 'PIP']) expect(isAnInternalName(k)).toBe(true);
    for (const n of ['OKR', 'Ridge Bakery', 'Weekly operations check-in']) expect(isAnInternalName(n)).toBe(false);
    expect(aNameAPersonGave('NEW_PROJECT')).toBeNull();
  });

});

describe('the GROUND line names no key either', () => {
  it('reads "not named yet" rather than the key or "Entry session"', () => {
    const prompt = buildEntrySystemPrompt(GroundScenario.NEW_PROJECT, 'NEW_PROJECT', PartyType.INITIATOR);
    expect(prompt).toContain('GROUND: not named yet');
    expect(prompt).not.toContain('GROUND: NEW_PROJECT');
    expect(prompt).not.toContain('GROUND: Entry session');
  });
});
