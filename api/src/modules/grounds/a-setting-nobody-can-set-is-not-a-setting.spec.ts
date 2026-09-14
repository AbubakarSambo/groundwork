import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * A COLUMN, A READER, AND NO WRITER COMPILES CLEAN AND PASSES EVERYTHING.
 *
 * Three of these have turned up in this codebase now. `peersVisibleToEachOther` was read by the
 * ground payload and the board and written by nothing, so the rule deciding whether a participant
 * knows who else is in their check-in was set by a default nobody could see. `whoSeesTargets` was
 * read by the board and the conversation. `expectThemToUnblock` was read by the conversation and
 * decides whether a check-in asks what somebody actually tried - its own column note says plainly
 * "it can be turned off" and lists the cases, describing a choice no lead could make.
 *
 * Each one carried a careful comment about when the other value is right, which is what makes this
 * worth a guard rather than three fixes: the care went into the note and never into a way in.
 *
 * So: for every one of these settings, a route that writes it, a value that travels back on the
 * ground so a control can show what is stored, and one permission rule shared between them.
 */
const read = (...p: string[]) => readFileSync(join(__dirname, ...p), 'utf8')
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/^\s*\/\/.*$/gm, '');

const SERVICE = read('grounds.service.ts');
const CONTROLLER = read('grounds.controller.ts');
const CLIENT_API = read('..', '..', '..', '..', 'client', 'src', 'api', 'grounds.ts');
const SETUP = read('..', '..', '..', '..', 'client', 'src', 'pages', 'grounds', 'GroundAdminPage.tsx');

/** The column, the writer on the service, and the route that reaches it. */
const EVERY_ONE_OF_THEM = [
  { column: 'peersVisibleToEachOther', writer: 'setPeerVisibility', route: 'peer-visibility', calls: 'setPeerVisibility' },
  { column: 'peopleWorkTogether', writer: 'setPeopleWorkTogether', route: 'people-work-together', calls: 'setPeopleWorkTogether' },
  { column: 'restrictExternalVisibility', writer: 'setExternalVisibility', route: 'external-visibility', calls: 'setExternalVisibility' },
  { column: 'whoSeesTargets', writer: 'setWhoSeesTargets', route: 'who-sees-targets', calls: 'setWhoSeesTargets' },
  { column: 'expectThemToUnblock', writer: 'setExpectThemToUnblock', route: 'expect-them-to-unblock', calls: 'setExpectThemToUnblock' },
];

describe('every setting on a check-in has a way in', () => {
  for (const s of EVERY_ONE_OF_THEM) {
    describe(s.column, () => {
      it('is written by something', () => {
        expect(SERVICE).toMatch(new RegExp(`data: \\{[^}]*${s.column}`));
      });

      it('has a route', () => {
        expect(CONTROLLER).toContain(`':id/${s.route}'`);
        expect(CONTROLLER).toContain(`this.grounds.${s.writer}(`);
      });

      it('and the client can call it', () => {
        /* A route nothing calls is the state every one of these was already in. */
        expect(CLIENT_API).toContain(`/${s.route}`);
      });

      it('and a lead can see it and change it on the setup page', () => {
        /*
         * The API FUNCTION, not a mutation named after it. Two of these are wired through
         * mutations with different names - `setContactVisibility` calls `setExternalVisibility` -
         * and a guard that insists on a naming convention would fail honest code and teach people
         * to rename things to satisfy a test. What matters is that the page reaches the route.
         */
        expect(SETUP).toContain(`groundsApi.${s.calls}(`);
      });
    });
  }

  it('and the two that had no way in travel back on the ground, so a control shows what is stored', () => {
    /*
     * The other three already travelled. Without this a switch reads its own default forever and
     * shows "off" whatever the database holds - which is worse than having no switch, because it
     * states something untrue rather than nothing.
     */
    expect(SERVICE).toMatch(/whoSeesTargets: \(ground as any\)\.whoSeesTargets/);
    expect(SERVICE).toMatch(/expectThemToUnblock: \(ground as any\)\.expectThemToUnblock/);
  });
});
