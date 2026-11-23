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
        /* Same exception, now that the read lives in a method of its own rather than inline in the
           report: it is the one place a disputed row must still be visible. */
        if (src.slice(Math.max(0, m.index - 900), m.index).includes('theirOwnRows(')) continue;
        /*
         * AND THE SYNTHESIS READ, WHICH SHOWS RATHER THAN COUNTS.
         *
         * A dispute stops a line counting; it does not delete it. Every read above this one is
         * arithmetic - shares, percentages, keyword sweeps - and a number built on a contested
         * claim asserts what nobody agreed, so those keep the filter. This one is the read the
         * report is WRITTEN from, and filtering it deleted the claim and the person's objection to
         * it together, leaving the reader a picture with an invisible hole in it. The rows come
         * through with the dispute attached in the same string. See
         * a-disputed-line-is-shown-as-disputed.ts.
         */
        if (src.slice(Math.max(0, m.index - 500), m.index).includes('withTheDisputeAttached')
          || src.slice(m.index, m.index + 500).includes('withTheDisputeAttached')) continue;
        counted += 1;
        expect(m[0]).toContain('disputedAt: null');
      }
      expect(counted).toBeGreaterThan(0);
    });
  }

  it('except the read that shows the person their own rows, which needs the disputed ones too', () => {
    /*
     * It used to be inline in the report and is now a method, because the pre-release branch of
     * `get` returned no rows at all - so somebody finishing their own check-in saw none of what
     * they had just said. The rule is unchanged and is what this pins: this read alone keeps the
     * disputed rows, so the mark is visible to the person who made it.
     */
    const at = REPORTS.indexOf('private async theirOwnRows(');
    expect(at).toBeGreaterThan(-1);
    const body = REPORTS.slice(at, at + 900);
    expect(body).toContain('disputedAt: true');
    expect(body).not.toContain('disputedAt: null');
  });

  it('and both places that build a report use that one read', () => {
    /* Pre-release and released. A person\'s own words are theirs either way, and the gap between
       the two branches is exactly what hid them. */
    expect((REPORTS.match(/this\.theirOwnRows\(/g) ?? []).length).toBeGreaterThanOrEqual(3);
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

/* Changed 24 November (page audit, row 6, approved by Hafsah): the note explaining that these are lines taken from what people said
   was a sentence explaining the report, and it is gone. The read still says how much there is and why. */
describe('confidence says how much there is, and no sentence explaining the report', () => {
  const base = { answered: 2, ofPeople: 2, documented: 0, saidInAll: 5, agreed: 1, stillOpen: 0, commitments: 1, commitmentsWithOwnerAndDate: 1 };
  it('has its saying and its reasons, and no note', () => {
    const c = howMuchThereIsToGoOn(base) as any;
    expect(c.saying).toBeTruthy();
    expect(Array.isArray(c.reasons)).toBe(true);
    expect('note' in c).toBe(false);
  });
});
