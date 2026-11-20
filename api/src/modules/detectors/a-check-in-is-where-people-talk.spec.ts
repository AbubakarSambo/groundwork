import { turnsFromCheckIns } from './a-check-in-is-where-people-talk';
import * as fs from 'fs';
import * as path from 'path';

const said = (email: string | null, content: string, userEmail?: string | null) => ({
  email, userEmail, content, createdAt: new Date('2026-09-25T09:00:00Z'),
});
const directory = [
  { externalId: 'ana-1', email: 'Zainab@meridian.test' },
  { externalId: 'dat-1', email: 'samuel@meridian.test' },
];

/*
 * Eleven people, twenty-eight conversations about three named projects, and the organisation-level
 * read saw none of it: it read `assistantTurn` only. Six people were told they had "not been
 * mentioned in any" of the work they had spent the quarter on.
 */
describe('a check-in is where people talk', () => {
  it('resolves a participant to the directory by their address', () => {
    const { turns } = turnsFromCheckIns([said('zainab@meridian.test', 'Atlas is behind.')], directory);
    expect(turns).toHaveLength(1);
    expect(turns[0].personExternalId).toBe('ana-1');
    expect(turns[0].content).toBe('Atlas is behind.');
  });

  it('matches whatever the casing and spacing are', () => {
    const { turns } = turnsFromCheckIns([said('  ZAINAB@Meridian.test ', 'x y z')], directory);
    expect(turns[0].personExternalId).toBe('ana-1');
  });

  it('falls back to the address on their sign-in', () => {
    const { turns } = turnsFromCheckIns([said('open-abc@unclaimed.invalid', 'a real answer', 'samuel@meridian.test')], directory);
    expect(turns[0].personExternalId).toBe('dat-1');
  });

  /* Being right about WHICH person is the whole point of this layer, so a stranger is dropped. */
  it('drops somebody who is in nobody directory row, and counts them', () => {
    const { turns, unmatched } = turnsFromCheckIns([said('someone@elsewhere.test', 'hello')], directory);
    expect(turns).toEqual([]);
    expect(unmatched).toBe(1);
  });

  it('drops an empty turn without counting it as a stranger', () => {
    const { turns, unmatched } = turnsFromCheckIns([said('zainab@meridian.test', '   ')], directory);
    expect(turns).toEqual([]);
    expect(unmatched).toBe(0);
  });

  it('and the detector reads them, and only them', () => {
    const src = fs.readFileSync(path.join(__dirname, 'detectors.service.ts'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
    expect(src).toMatch(/const turns = fromCheckIns\.turns;/);
    expect(src).not.toMatch(/assistantTurn/);
    expect(src).toMatch(/this\.prisma\.conversationTurn\.findMany/);
  });
});
