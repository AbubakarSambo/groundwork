import { readFileSync } from 'fs';
import { join } from 'path';
import { howCheckableIsYoursAlone } from './how-checkable-is-yours-alone';

/**
 * "This is about the check-in. Only you see it." (done.txt). The server makes it true: the read of
 * how checkable a check-in was reaches the person who gave it and nobody else, lead and admin
 * included.
 */
const participants = [
  { id: 'p-lead', userId: 'u-lead' },
  { id: 'p-miriam', userId: 'u-miriam' },
  { id: 'p-brian', userId: 'u-brian' },
];
const dims = { delivery: 'specific', evidence: 'vague', enablement: 'specific', coverage: 'specific', commitment: 'specific' };
const checkIns = [
  { id: 'c1', participantId: 'p-lead', sessionNumber: 1, specificityLevel: 'specific', specificityDimensions: dims },
  { id: 'c2', participantId: 'p-miriam', sessionNumber: 1, specificityLevel: 'directional', specificityDimensions: dims },
  { id: 'c3', participantId: 'p-brian', sessionNumber: 1, specificityLevel: 'vague', specificityDimensions: dims },
];

describe('how checkable a check-in was, as each reader receives it', () => {
  it('Miriam receives the read of her own check-in', () => {
    const rows = howCheckableIsYoursAlone(checkIns, participants, 'u-miriam');
    const hers = rows.find((r) => r.id === 'c2')!;
    expect(hers.specificityLevel).toBe('directional');
    expect(hers.specificityDimensions).toEqual(dims);
  });

  it('Miriam receives nothing about Brian or the lead', () => {
    const rows = howCheckableIsYoursAlone(checkIns, participants, 'u-miriam');
    for (const id of ['c1', 'c3']) {
      const r = rows.find((x) => x.id === id)!;
      expect(r.specificityLevel).toBeNull();
      expect(r.specificityDimensions).toBeNull();
    }
  });

  it('the lead receives nothing about Miriam or Brian, only their own', () => {
    const rows = howCheckableIsYoursAlone(checkIns, participants, 'u-lead');
    expect(rows.find((r) => r.id === 'c1')!.specificityDimensions).toEqual(dims);
    expect(rows.find((r) => r.id === 'c2')!.specificityDimensions).toBeNull();
    expect(rows.find((r) => r.id === 'c3')!.specificityLevel).toBeNull();
  });

  it('an admin who is not in the check-in receives nothing about anyone', () => {
    const rows = howCheckableIsYoursAlone(checkIns, participants, 'u-admin');
    expect(rows.every((r) => r.specificityLevel === null && r.specificityDimensions === null)).toBe(true);
  });

  it('with no reader, nobody’s read is sent', () => {
    const rows = howCheckableIsYoursAlone(checkIns, participants, undefined);
    expect(rows.every((r) => r.specificityDimensions === null)).toBe(true);
  });

  it('keeps everything else on the row, so the sessions still show', () => {
    const rows = howCheckableIsYoursAlone(checkIns, participants, 'u-lead');
    expect(rows.map((r) => [r.id, r.participantId, r.sessionNumber])).toEqual(checkIns.map((r) => [r.id, r.participantId, r.sessionNumber]));
  });
});

describe('and the reads that send check-ins use it', () => {
  const CODE = readFileSync(join(__dirname, 'grounds.service.ts'), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '');

  it('GET /grounds/:id cuts the rows before anything is built from them', () => {
    const get = CODE.slice(CODE.indexOf('async get(id: string'), CODE.indexOf('const checkInsByParticipant'));
    expect(get).toContain('howCheckableIsYoursAlone(');
    expect(get).toContain('requestingUserId,');
  });

  it('the organisation roster, which admins read, no longer carries anybody’s read', () => {
    const roster = CODE.slice(CODE.indexOf('async getOrgRoster('), CODE.indexOf('async getOrgRoster(') + 4000);
    expect(roster).not.toMatch(/latestSpecificity/);
    expect(roster).not.toMatch(/specificityLevel/);
  });
});
