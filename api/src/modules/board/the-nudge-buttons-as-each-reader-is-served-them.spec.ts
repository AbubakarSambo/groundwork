import { boardAs } from './the-switchboards-sections-harness';
import { theShortRun, reader } from './the-short-run-harness';

/**
 * "NUDGE KEVIN" ON THE BOARD, AS EACH READER IS SERVED IT (nudges that get answers, 20 October 2026), from Drop Access's short run
 * (gw_sweep_drop3): Grace runs it; Kevin, Mercy and Joseph checked in on 12, 13 and 14 October at about two in the afternoon in Nairobi,
 * and session 4 opened at eight on Thursday 15 October. At half past four that Thursday nobody has answered it.
 *
 * Served to Grace alone, and only with the direct morning on: at the top of her board, and on each person's row of "The team today".
 * Kevin, a rep, is served neither the buttons nor the morning. With the switch off, Grace's board carries no button either.
 */
const DAY = ['2026-10-12', '2026-10-13', '2026-10-14', '2026-10-15'];
function theRun(directMorning: boolean, now: string) {
  const run: any = theShortRun({ directMorning } as any);
  run.clock = { ...run.clock, now: new Date(now) };
  run.checkIns = run.checkIns.map((c: any) => ({ ...c, availableFrom: new Date(`${DAY[c.sessionNumber - 1]}T05:00:00Z`), createdAt: new Date(`${DAY[c.sessionNumber - 1]}T05:00:00Z`) }));
  return run;
}
const THURSDAY_AFTERNOON = '2026-10-15T13:30:00Z';
const THURSDAY_MORNING = '2026-10-15T06:00:00Z';

describe('Grace, who runs it, with the direct morning on', () => {
  it('reads "Nudge" for each person past their usual time, at the top and on their row', async () => {
    const g = await boardAs(theRun(true, THURSDAY_AFTERNOON), ...reader('Grace'));
    expect(g.theMorning.nudges.map((n: any) => n.says)).toEqual(['Nudge Mercy', 'Nudge Joseph', 'Nudge Kevin']);
    expect(g.theMorning.parts.find((p: any) => p.key === 'team').lines).toEqual([
      "Mercy hasn't checked in today, and last checked in yesterday.",
      "Joseph hasn't checked in today, and last checked in yesterday.",
      "Kevin hasn't checked in today, and last checked in yesterday.",
    ]);
    expect(g.eachPersonToday.map((r: any) => [r.who, r.nudge?.says ?? null])).toEqual([['Mercy Wairimu', 'Nudge Mercy'], ['Joseph Kariuki', 'Nudge Joseph'], ['Kevin Omondi', 'Nudge Kevin']]);
  });
  it('in the morning, before anybody’s usual time, there is no button, and each is credited for checking in on time', async () => {
    const g = await boardAs(theRun(true, THURSDAY_MORNING), ...reader('Grace'));
    expect(g.theMorning.nudges).toBeUndefined();
    expect(g.eachPersonToday.some((r: any) => r.nudge)).toBe(false);
    expect(g.theMorning.parts.find((p: any) => p.key === 'team').lines).toEqual(expect.arrayContaining([
      'Mercy checked in on time 3 days running.', 'Joseph checked in on time 3 days running.', 'Kevin checked in on time 3 days running.',
    ]));
  });
});

describe('everybody else', () => {
  it('Kevin, a rep, is served no button and no morning', async () => {
    const k = await boardAs(theRun(true, THURSDAY_AFTERNOON), ...reader('Kevin'));
    expect(k.theMorning).toBeUndefined();
    expect(JSON.stringify(k)).not.toMatch(/Nudge |"nudges?"/);
  });
});
