import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * THE TEAM'S STARTING POINT. `GroundBaseline`, which had no reader and no writer.
 *
 * Her call, and she reached it before I did: "groundbaseline is good because it is the team starting
 * point."
 *
 * WHY IT WAS WORTH BUILDING RATHER THAN DELETING. It is the missing home for two things already in use.
 * The report's weigh section asks "what did you say doing well means, and what does the record hold
 * against it" and has been scraping the answer out of the lead's check-in prose. The setup chat's
 * `success` gap writes to `brief`, which is what the ground is ABOUT, not what good would look like in
 * it. Neither is a yardstick you can point at afterwards and say: that is what we agreed on day one.
 *
 * AND IT WAS ALREADY LYING TO PEOPLE. `GroundAdminPage` passed `hasBaseline: false` and
 * `conditionCount: 0` as literals into `whatThisGroundCanTellYou`, so two of that read's lines fired on
 * every ground whatever the truth - a lead who HAD named conditions was still told the record would not
 * be able to say whether they were met. The literals were honest about a table nothing used.
 */
const SERVICE = readFileSync(join(__dirname, 'grounds.service.ts'), 'utf8');
const CODE = SERVICE.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
const STATE = CODE.slice(CODE.indexOf('async stateBaseline('), CODE.indexOf('async baselineHistory('));

describe('stating it', () => {
  it('is the lead\'s, or an admin in the same organisation', () => {
    /**
     * A party stating it would be the person being read setting their own measure, which is the one
     * thing the report exists to compare against something else.
     */
    expect(STATE).toMatch(/ground\.initiatorId !== requestingUserId && !isOrgAdmin/);
    expect(STATE).toMatch(/asker\?\.role === 'ADMIN' && asker\.organizationId === ground\.organizationId/);
  });

  it('writes a new version rather than editing the old one', () => {
    /**
     * The schema's own note is the argument: "half the findings this product makes are the distance
     * between what people believed at the start and what turned out to be true. Corrected, a baseline
     * becomes a second description of the present and the arc disappears."
     */
    expect(STATE).toMatch(/version: \(latest\?\.version \?\? 0\) \+ 1/);
    expect(STATE).toMatch(/groundBaseline\.create/);
    expect(STATE).not.toMatch(/groundBaseline\.update/);
  });

  it('and a restatement has to say why', () => {
    // Not to police anybody: without it the record shows a yardstick that moved with no account of
    // why, which reads worse than either version does on its own.
    expect(STATE).toMatch(/if \(latest && !dto\.changeReason\?\.trim\(\)\)/);
  });

  it('the first statement needs no reason, because nothing changed', () => {
    expect(STATE).toMatch(/The first version stays on the record either way/);
  });

  it('restating one half does not erase the other', () => {
    // Somebody restating what doing well looks like must not silently drop the conditions.
    expect(STATE).toMatch(/const carried = Array\.isArray\(latest\?\.conditions\)/);
    expect(STATE).toMatch(/conditions: conditions\.length \? conditions : carried/);
  });

  it('and an empty submission is refused', () => {
    expect(STATE).toMatch(/if \(!success && !conditions\.length\) throw new BadRequestException/);
  });
});

describe('reading it', () => {
  const HISTORY = CODE.slice(CODE.indexOf('async baselineHistory('), CODE.indexOf('async getMySpecificity('));

  it('is open to everybody on the ground, not only the lead', () => {
    /**
     * The yardstick somebody is being read against is the last thing that should be private from them,
     * and if it moved mid-ground, the move is the part they most need to see.
     */
    expect(HISTORY).toMatch(/groundParticipant\.findFirst\(\{ where: \{ groundId, userId: requestingUserId \} \}\)/);
    expect(HISTORY).toMatch(/if \(!link && ground\.initiatorId !== requestingUserId && !isOrgAdmin\)/);
  });

  it('and returns every version, oldest first, so the arc is visible', () => {
    expect(HISTORY).toMatch(/orderBy: \{ version: 'asc' \}/);
  });
});

describe('and the reads that were guessing now have the answer', () => {
  it('the ground returns its baseline', () => {
    expect(CODE).toMatch(/^\s*baseline,$/m);
    expect(CODE).toMatch(/groundBaseline\.findFirst\(\{\s*where: \{ groundId: id \}/);
  });

  it('the page stops passing literals into the context read', () => {
    const PAGE = readFileSync(
      join(__dirname, '../../../../client/src/pages/grounds/GroundAdminPage.tsx'),
      'utf8',
    ).replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
    expect(PAGE).not.toMatch(/conditionCount: 0,/);
    expect(PAGE).not.toMatch(/hasBaseline: false,/);
    expect(PAGE).toMatch(/conditionCount: \(\(ground as any\)\.baseline\?\.conditions \?\? \[\]\)\.length/);
    expect(PAGE).toMatch(/hasBaseline: !!\(ground as any\)\.baseline/);
  });

  it('and the report puts the stated baseline before the scraped prose', () => {
    /**
     * `statedStandards` is whatever the engine typed as a SUCCESS_DEFINITION while the lead was
     * talking. A good fallback, and not the same as something deliberately written down. Session 0
     * because it predates every session.
     */
    const REPORTS = readFileSync(join(__dirname, '../reports/reports.service.ts'), 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
    expect(REPORTS).toMatch(/\{ text: baseline\.successLooksLike\.trim\(\), session: 0 \}, \.\.\.statedStandards/);
    expect(REPORTS).toMatch(/statedStandards: stated/);
  });

  it('and the conditions travel with it', () => {
    /**
     * A weigh section showing an unmet standard without the conditions it depended on invites exactly
     * the reading this product exists to prevent.
     */
    const REPORTS = readFileSync(join(__dirname, '../reports/reports.service.ts'), 'utf8');
    expect(REPORTS).toMatch(/if \(restsOn\.length\) out\.whatItRestedOn = restsOn/);
    const PAGE = readFileSync(join(__dirname, '../../../../client/src/pages/report/ReportPage.tsx'), 'utf8');
    expect(PAGE).toMatch(/These were not in their hands\. Read anything unmet above against them first\./);
  });
});
