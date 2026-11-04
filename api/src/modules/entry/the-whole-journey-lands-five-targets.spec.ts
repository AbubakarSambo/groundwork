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
    /* Now with the setup transcript passed in: since setup stopped counting as the lead's own
       check-in, session 1 is empty at commit and reading the turns off it would have taken these
       five targets straight back out. They are what she said the check-in is FOR, so they still
       come from setup - they were never her account of the work. */
    expect(src).toMatch(/extractExpectations\(checkIn\.id, participant\.id, ground\.id, dto\.history\)/);
  });

  /* Changed 3 November 2026: the save no longer waits for the reading (Hafsah's speed brief). The board is warmed again when it lands,
     so it is still built with the targets; this pins that instead of the wait. */
  it('runs after the save has answered, and the board is built again when the targets land', () => {
    const at = src.indexOf('.extractExpectations(checkIn.id, participant.id, ground.id, dto.history)');
    expect(at).toBeGreaterThan(-1);
    expect(src.slice(Math.max(0, at - 400), at)).toMatch(/void readUntilItLands\(/);
    expect(src.slice(at, at + 600)).toMatch(/GroundworkEvents\.SETUP_READ/);
  });

  /* Changed 3 November 2026: a failure is tried again rather than caught and dropped; readUntilItLands never throws. */
  it('and a failure there never loses the session, and is tried again', () => {
    const at = src.indexOf('extractExpectations(');
    expect(src.slice(Math.max(0, at - 400), at)).toMatch(/readUntilItLands\(/);
  });

  it('is only attempted when something was actually said', () => {
    const at = src.indexOf('extractExpectations(');
    expect(src.slice(Math.max(0, at - 260), at)).toMatch(/dto\.history\.length > 0/);
  });
});
