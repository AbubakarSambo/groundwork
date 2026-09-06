/**
 * THE PEOPLE WHO AGREED AN OBJECTIVE ARE THE PEOPLE ON IT.
 *
 * The seed wrote an owner and nobody else, so an objective six people worked out
 * arrived looking like one person's — losing the single fact that makes a
 * drafted objective different from an assigned one.
 *
 * It also broke the step after it, without the two being obviously connected:
 * the suggestion that proposes a check-in about new work requires two or more
 * contributors, so "once we have objectives, check in on them" was failing on an
 * empty array in a different module.
 */
import { newProject } from '../detectors/a-conversation-the-record-suggests';

const seeded = (contributors: string[]) => ({
  externalId: 'obj-1',
  title: 'Ten companies onboarded',
  ownerExternalId: 'sahar',
  contributorExternalIds: contributors,
  dueDate: null,
  createdAt: new Date('2026-09-01'),
});

const now = new Date('2026-09-05');

describe('an objective people agreed together', () => {
  it('produces a suggestion to check in on it', () => {
    const [candidate] = newProject([seeded(['hafsah', 'abubakar'])], now, new Set());
    expect(candidate).toBeDefined();
    expect(candidate.proposeTo).toBe('sahar');
    expect(candidate.says).toContain('nobody has checked in about it yet');
  });

  it('and counts the owner among the people on it', () => {
    /* It said "2 people are on it" about work three people are on, every time —
       this detector only ever looks at subjects that HAVE an owner. Somebody
       deciding whether to open a conversation was told a number smaller than
       the truth. */
    const [candidate] = newProject([seeded(['hafsah', 'abubakar'])], now, new Set());
    expect(candidate.says).toContain('3 people are on it');
  });

  it('and produced none at all while the seed dropped who agreed it', () => {
    /* The regression this file exists for. Nothing threw, nothing failed, and
       the loop simply never closed. */
    expect(newProject([seeded([])], now, new Set())).toEqual([]);
  });

  it('and still produces none once somebody has talked about it', () => {
    expect(newProject([seeded(['hafsah', 'abubakar'])], now, new Set(['obj-1']))).toEqual([]);
  });
});

describe('the seed', () => {
  const source = require('fs')
    .readFileSync(require('path').join(__dirname, 'drafts.service.ts'), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\/\/.*$/gm, '');

  it('counts only people who actually responded', () => {
    /**
     * Written positively, and that is the point. DECLINED is a first-class state
     * — saying no is an answer — and it is also not INVITED, so excluding
     * silence by exclusion would record everybody who REFUSED this objective as
     * a contributor to it.
     */
    expect(source).toMatch(/state: DraftParticipantState\.RESPONDED/);
    expect(source).not.toMatch(/state: \{ not: 'INVITED' \}/);
  });

  it('and writes them onto the objective, on create and on update', () => {
    expect((source.match(/contributorExternalIds,/g) ?? []).length).toBe(2);
  });

  it('and does not list the owner as their own contributor', () => {
    expect(source).toMatch(/\.filter\(\(id\) => id !== \(draft\.proposedOwnerExternalId/);
  });
});
