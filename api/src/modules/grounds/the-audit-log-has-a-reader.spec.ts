import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * THE AUDIT LOG NOTHING READ. W14-3.
 *
 * `updateTimeline` writes every change to how long a ground runs and how often people check in, with
 * a comment saying this makes them "traceable without a separate audit table". Traceable by whom was
 * never answered: only `contextNotes` was read back out, and the timeline half went to the database
 * and stopped.
 *
 * So a lead could cut a ground from eight weeks to four after people had started answering, and no
 * party could see it happened - in the product whose claim is that the record is the record.
 */
const SERVICE = readFileSync(join(__dirname, 'grounds.service.ts'), 'utf8');
const CODE = SERVICE.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

describe('the ground returns its own change history', () => {
  it('reads the timeline half of the log, not only contextNotes', () => {
    expect(CODE).toMatch(/const rawTimeline/);
    expect(CODE).toMatch(/\(rawLog as any\)\.timeline \?\? \[\]/);
  });

  it('and returns it from get()', () => {
    expect(CODE).toMatch(/^\s*settingsChanges,$/m);
  });

  it('handles the legacy array shape the writer still migrates from', () => {
    // `updateTimeline` migrates a bare array to the object form. A ground that has not been
    // written since would otherwise read as having no history at all.
    expect(CODE).toMatch(/Array\.isArray\(rawLog\) \? rawLog : \[\]/);
  });

  it('never names who made the change', () => {
    /**
     * THE PART THAT MATTERS. Peer visibility can be off on this ground, and resolving `changedBy`
     * to a name here would walk straight around it - a party who is not supposed to know who else
     * is here would learn a name from a settings page.
     *
     * "the lead" or "a party" is all anybody needs and is true either way.
     */
    expect(CODE).toMatch(/by: e\.changedBy === ground\.initiatorId \? \('lead' as const\) : \('party' as const\)/);
    const block = CODE.slice(CODE.indexOf('const settingsChanges'), CODE.indexOf('const settingsChanges') + 600);
    expect(block).not.toMatch(/firstName|lastName|changedBy: e\.changedBy/);
  });
});

describe('and the settings page shows it', () => {
  const PAGE = readFileSync(
    join(__dirname, '../../../../client/src/pages/grounds/GroundAdminPage.tsx'),
    'utf8',
  ).replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

  it('under the controls that write it', () => {
    expect(PAGE).toMatch(/What has been changed here/);
    expect(PAGE).toMatch(/settingsChanges/);
  });

  it('newest first', () => {
    // The log is appended to, so raw order buries the change somebody just made.
    expect(PAGE).toMatch(/\.settingsChanges\]\.reverse\(\)/);
  });

  it('and says what it changed from, not only what it is now', () => {
    // "Changed to 4 weeks" is not an audit trail. What it was is the whole point.
    expect(PAGE).toMatch(/c\.weeks\.from/);
    expect(PAGE).toMatch(/c\.cadence\.from/);
  });
});
