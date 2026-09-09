import { readFileSync } from 'fs';
import { join } from 'path';
import { howMuchThereIsToGoOn } from './how-much-there-is-to-go-on';

/**
 * A DISPUTED ROW COUNTS TOWARD NOTHING, AND CONFIDENCE SAYS WHAT IT IS COUNTING.
 *
 * The wall between "a model said this" and "the record holds this" was crossed at extraction and
 * never mentioned again. This pins the three things that make it visible: the person can dispute a
 * row of their own (owner-scoped, nothing deleted), every read that counts rows leaves disputed ones
 * out, and the confidence read says its inputs are extracted lines rather than typed ones.
 */
const strip = (t: string) => t.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^\s*\/\/.*$/gm, ' ');
const REPORTS = strip(readFileSync(join(__dirname, 'reports.service.ts'), 'utf8'));
const BOARD = strip(readFileSync(join(__dirname, '../board/board.service.ts'), 'utf8'));
const CONVO = strip(readFileSync(join(__dirname, '../conversation/conversation.service.ts'), 'utf8'));

describe('every read that counts rows leaves disputed ones out', () => {
  for (const [name, src] of [['reports.service', REPORTS], ['board.service', BOARD]] as const) {
    it(`${name}: every recordEntry.findMany that counts filters disputedAt: null`, () => {
      const re = /this\.prisma\.recordEntry\.findMany\(\{\s*where:\s*\{[^}]*/g;
      let m: RegExpExecArray | null;
      let counted = 0;
      while ((m = re.exec(src))) {
        /* The one read that SHOWS a person their own rows has to include the disputed ones, so the
           dispute is visible. It is the exception the next test pins. */
        if (src.slice(Math.max(0, m.index - 400), m.index).includes('myRows:')) continue;
        counted += 1;
        expect(m[0]).toContain('disputedAt: null');
      }
      expect(counted).toBeGreaterThan(0);
    });
  }

  it('except the read that shows the person their own rows, which needs the disputed ones too', () => {
    const at = REPORTS.indexOf('myRows: participant');
    expect(at).toBeGreaterThan(-1);
    expect(REPORTS.slice(at, at + 600)).toContain('disputedAt: true');
  });
});

describe('disputing is owner-scoped and deletes nothing', () => {
  it('loads the check-in as the owner and matches the entry to that participant', () => {
    const at = CONVO.indexOf('async disputeEntry(');
    const body = CONVO.slice(at, at + 900);
    expect(body).toContain('loadOwnedCheckIn(checkInId, requestingUserId)');
    expect(body).toContain('participantId: checkIn.participantId');
    expect(body).toContain('data: { disputedAt: new Date() }');
    expect(body).not.toMatch(/recordEntry\.delete/);
  });
});

describe('confidence says what it is counting', () => {
  const base = { answered: 2, ofPeople: 2, documented: 0, saidInAll: 5, agreed: 1, stillOpen: 0, commitments: 1, commitmentsWithOwnerAndDate: 1 };
  it('carries the note whenever there is anything to count', () => {
    expect(howMuchThereIsToGoOn(base).note).toMatch(/lines taken from what people said/);
  });
  it('and not when there is nothing', () => {
    expect(howMuchThereIsToGoOn({ ...base, saidInAll: 0 }).note).toBeNull();
  });
});
