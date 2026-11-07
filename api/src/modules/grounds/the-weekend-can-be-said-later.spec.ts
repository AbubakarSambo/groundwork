import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { workingDaysOf, theNextDayTheyWork, isAWorkingDay } from './which-days-this-team-works';

/**
 * "HE CANNOT CHOOSE TO SET CHECK-INS TO HAPPEN OUTSIDE OF WEEKENDS."
 *
 * Everything underneath was already built: the days are stored, every cadence honours them, and the
 * setup chat offers them under the rhythm with a "weekdays only" shortcut. What did not exist was
 * any way to say it once the check-in existed - and the in-app rhythm editor, which is where a lead
 * goes when they notice their check-ins landing on a Sunday, carried no control at all.
 */
const SERVICE = readFileSync(join(__dirname, 'grounds.service.ts'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
const CONTROLLER = readFileSync(join(__dirname, 'grounds.controller.ts'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
/* The settings tab moved into its own file (People and setup, rebuilt from the shared parts on
   29 September); GroundAdminPage keeps the drafts and passes them in as props. Both are read. */
const readClient = (f: string) => readFileSync(join(__dirname, '../../../../client/src/pages/grounds', f), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
/* People and setup as pictured is the only People and setup page since batch 1 (4 November 2026); its helpers stay in CheckInPeopleAndSetup.tsx. */
const ADMIN_PAGE = readClient('GroundAdminPage.tsx') + '\n' + readClient('CheckInPeopleAndSetup.tsx').replace(/props\./g, '') + '\n' + readClient('PeopleAndSetupAsPictured.tsx').replace(/props\./g, '');

describe('the days a team works, after the check-in exists', () => {
  it('are accepted where the rhythm is changed', () => {
    expect(CONTROLLER).toMatch(/workingDays\?: number\[\];/);
    expect(CONTROLLER).toMatch(/@Max\(6, \{ each: true \}\)/);
    expect(SERVICE).toMatch(/\.\.\.\(dto\.workingDays !== undefined && \{ workingDays: workingDaysOf\(dto\.workingDays\) \}\)/);
  });

  /* Changing when a check-in may open is the lead's call, like the rhythm itself. */
  it('and changing them is the lead\'s call', () => {
    expect(SERVICE).toMatch(/const changesTheSchedule = requestedDays !== undefined \|\| dto\.cadence !== undefined \|\| dto\.workingDays !== undefined \|\| dto\.cadenceAnchorDay !== undefined;/);
  });

  it('and the change is on the record like every other schedule change', () => {
    expect(SERVICE).toMatch(/workingDays: \{ from: \(ground as any\)\.workingDays \?\? \[\], to: workingDaysOf\(dto\.workingDays\) \}/);
  });

  /*
   * AND IT DOES SOMETHING TO THE CHECK-IN IN FRONT OF THEM.
   *
   * A setting that agrees with you and changes nothing is the whole family of bug this week - the
   * trial that lifted no cap, the working days that reached no schedule. The first session's gate is
   * the one thing already sitting on a date, so it moves.
   */
  it('and a gate already on a Sunday moves off it', () => {
    const at = SERVICE.indexOf('if (dto.workingDays !== undefined && dto.startsAt === undefined)');
    expect(at).toBeGreaterThan(-1);
    const block = SERVICE.slice(at, at + 1200);
    expect(block).toMatch(/theNextDayTheyWork\(new Date\(row\.availableFrom as Date\), dto\.workingDays\)/);
    /* Only where nobody has started, and forward only. */
    expect(block).toMatch(/status: CheckInStatus\.NOT_STARTED/);
  });

  it('and the lead has somewhere to say it', () => {
    expect(ADMIN_PAGE).toMatch(/<WhichDaysTheyWork value=\{workingDaysDraft\} onChange=\{setWorkingDaysDraft\} \/>/);
    /* Sent with the rhythm it belongs to, and the save button knows it changed. */
    /* The save goes through one helper now (`theTimeframeToSave`, which also sends the end on the
       field); what this guards is unchanged: the days travel with the rhythm and the length. */
    /* The pictured page gathers every changed field into one patch, the timeframe through theTimeframeToSave, and saves it once. */
    expect(ADMIN_PAGE).toMatch(/Object\.assign\(patch, theTimeframeToSave\(/);
    expect(ADMIN_PAGE).toMatch(/saveSetup\.mutate\(patch\)/);
    expect(ADMIN_PAGE).toMatch(/return \{ timelineDays: p\.timelineDaysDraft, cadence: p\.cadenceDraft, workingDays: p\.workingDaysDraft/);
    expect(ADMIN_PAGE).toMatch(/!sameDays\(workingDaysDraft, \(ground as \{ workingDays\?: number\[\] \}\)\.workingDays\)/);
  });

  /* One picker, not a second copy that quietly stops agreeing with the first. */
  it('and there is one picker in the product', () => {
    const client = join(__dirname, '../../../../client/src');
    const strip = (t: string) => t.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
    const entry = strip(readFileSync(join(client, 'pages/enter/EntryChatPage.tsx'), 'utf8'));
    /* The setup draws the shared picker over the page's own days. How its change is handled (it is
       also kept in the saved session since the setup page, piece 3a) is not what this guards. */
    expect(entry).toMatch(/<WhichDaysTheyWork value=\{workingDays\} onChange=\{/);
    expect(entry).not.toMatch(/Which days does this team work\?/);
    /* And no other screen draws its own copy: the picker's own choices live in one file only. */
    const files: string[] = [];
    const walk = (d: string) => { for (const f of readdirSync(d)) { const full = join(d, f); if (statSync(full).isDirectory()) walk(full); else if (/\.tsx?$/.test(f) && !/\.spec\./.test(f)) files.push(full); } };
    walk(client);
    const drawsTheChoices = files.filter((f) => /['>"]Weekdays only['<"]|Any day is fine/.test(strip(readFileSync(f, 'utf8'))));
    expect(drawsTheChoices.map((f) => f.slice(client.length + 1))).toEqual(['components/gw/WhichDaysTheyWork.tsx']);
  });
});

describe('and what the days do to a date', () => {
  /* 20 September 2026 is a Sunday. */
  const sunday = new Date(2026, 8, 20);

  it('moves a weekend check-in forward, never back', () => {
    expect(theNextDayTheyWork(sunday, [1, 2, 3, 4, 5]).getDay()).toBe(1);
    expect(theNextDayTheyWork(sunday, [1, 2, 3, 4, 5]).getTime()).toBeGreaterThan(sunday.getTime());
  });

  /* Updated 29 October (one calendar for each check-in): no days given is Monday to Friday; all seven listed is every day. */
  it('with no days given moves it to Monday, and with every day leaves it where it is', () => {
    expect(theNextDayTheyWork(sunday, []).getDay()).toBe(1);
    expect(isAWorkingDay(sunday, [])).toBe(false);
    expect(workingDaysOf([0, 1, 2, 3, 4, 5, 6])).toEqual([0, 1, 2, 3, 4, 5, 6]);
    expect(theNextDayTheyWork(sunday, [0, 1, 2, 3, 4, 5, 6]).getTime()).toBe(sunday.getTime());
  });
});
