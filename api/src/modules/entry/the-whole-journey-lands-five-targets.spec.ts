import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * TWO TARGETS WHERE THERE SHOULD HAVE BEEN FIVE, AND IT LOOKED LIKE IT WAS WORKING.
 *
 * Ran the whole journey: setup, her own check-in, the report, save, then a participant. She said
 * "500 contracts by the end of the year, 150 each for Rita, Kunle and Amir, and I have a target of
 * 50 myself." What landed:
 *
 *   500  the team
 *    50  a person
 *
 * The extraction was perfect - the model returned Rita, Kunle and Amir at 150 each. The call was
 * placed straight after the record extraction, which runs BEFORE the contributors are invited, so
 * the ground had nobody on it but the lead. The resolver had an empty list to match three names
 * against and dropped all three without a word.
 *
 * THE GROUND'S OWN 500 AND HER OWN 50 STILL LANDED, which is what made it dangerous: a board with
 * two real targets on it reads as working. Only counting the rows against what she said showed it.
 *
 * It runs after addParticipant now, where the people it needs are real.
 */
describe('the whole journey lands every target', () => {
  const src = readFileSync(join(__dirname, 'entry.service.ts'), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

  it('extracts the aims and targets after the contributors are invited, not before', () => {
    const invites = src.indexOf('addParticipant(');
    const extraction = src.indexOf('extractExpectations(');
    expect(invites).toBeGreaterThan(-1);
    expect(extraction).toBeGreaterThan(-1);
    expect(extraction).toBeGreaterThan(invites);
  });

  it('and still runs it at all, which is the half that was missing before', () => {
    expect(src).toMatch(/extractExpectations\(checkIn\.id, participant\.id, ground\.id\)/);
  });

  it('waits for it, so the report and the board are not built before the targets exist', () => {
    const at = src.indexOf('extractExpectations(');
    expect(src.slice(Math.max(0, at - 120), at)).toMatch(/await this\.conversation\s*\./s);
  });

  it('and a failure there never loses the session', () => {
    const at = src.indexOf('extractExpectations(');
    expect(src.slice(at, at + 220)).toMatch(/\.catch\(/);
  });

  it('is only attempted when something was actually said', () => {
    const at = src.indexOf('extractExpectations(');
    expect(src.slice(Math.max(0, at - 260), at)).toMatch(/dto\.history\.length > 0/);
  });
});
