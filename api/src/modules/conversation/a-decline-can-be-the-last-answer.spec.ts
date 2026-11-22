/**
 * A DECLINE CAN BE THE ANSWER THE ROUND WAS WAITING ON.
 *
 * `AN_ANSWER` taught every reader that a decline counts. The decline itself was never taught: it
 * wrote DECLINED and returned, recording no round and emitting nothing. So a round whose last
 * outstanding person declined was closed in fact and open in the record, and the report sat
 * written and unreleased until the 3am backstop found it.
 *
 * Held on what `decline()` does after the write, because the defect was the ABSENCE of a call and
 * absence is what a happy-path test cannot see.
 */
import { readFileSync } from 'fs';
import { join } from 'path';

const SRC = readFileSync(join(__dirname, 'conversation.service.ts'), 'utf8');
const CODE = SRC.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

const bodyOf = (name: string) => {
  const m = new RegExp(`async \\*?${name}\\(`).exec(CODE);
  if (!m) throw new Error(`no method named ${name}`);
  return CODE.slice(m.index, m.index + 1600);
};

describe('declining', () => {
  it('records the round, the way completing one does', () => {
    expect(bodyOf('decline')).toMatch(/closeTheRoundIfThisWasTheLastAnswer\(/);
  });

  it('and the round it closes is the one the decline was in', () => {
    expect(bodyOf('decline')).toMatch(/closeTheRoundIfThisWasTheLastAnswer\(checkIn\.groundId, checkIn\.sessionNumber, checkIn\.participantId\)/);
  });
});

describe('what closing that round does', () => {
  const body = bodyOf('closeTheRoundIfThisWasTheLastAnswer');

  it('asks recordRoundCompletion first, and stops when the round is not closed', () => {
    expect(body).toMatch(/recordRoundCompletion\(this\.prisma, this\.events, groundId, sessionNumber, whose\)/);
    expect(body).toMatch(/if \(!roundJustClosed\) return/);
  });

  it('releases nothing when a report has already been taken for the round', () => {
    /** Otherwise a second "your report is ready" reaches everybody. */
    expect(body).toMatch(/reportRound\.findUnique/);
    expect(body).toMatch(/if \(taken\) return/);
  });

  it('and nothing at all when nobody gave an account, because there is no report to make', () => {
    expect(body).toMatch(/status: CheckInStatus\.COMPLETED/);
    expect(body).toMatch(/if \(!anAccount\) return/);
  });

  it("carries the backstop's source, so nobody is told somebody checked in", () => {
    expect(body).toMatch(/source: 'repair'/);
  });
});
