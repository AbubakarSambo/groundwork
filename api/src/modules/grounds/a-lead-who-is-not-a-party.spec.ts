import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * "I AM SETTING IT UP FOR OTHERS" HAS TO REACH THE RECORD.
 *
 * The wizard has always offered this and the client has always sent it - as `confirmLead` right after
 * create. But `confirmLead` refuses unless the ground is `AWAITING_LEAD`, and an ADMIN creating their
 * own ground leaves it `OPEN`, so the call threw "This ground has already been confirmed" into a
 * silent catch on the client. Across an eighteen-ground simulation the setting was ignored fourteen
 * times out of fourteen and nobody could have known.
 *
 * The damage was not cosmetic. `isSessionReadyForReport` waits on every party that is not
 * managingOnly, so an admin who said "this is not my ground" became the person the report waited for -
 * on a ground she was only administering, with no email ever sent to tell her a check-in was hers.
 * Three grounds in that run ended with real conversations in the record and no report that could ever
 * close.
 *
 * Pinned as source assertions rather than a mocked create, because the fault was never in the logic -
 * it was in WHERE the logic lived. Live behaviour was confirmed separately against a fresh org:
 * managingOnly true gave `managing_only = t` with zero check-ins for the initiator, and omitting it
 * gave `f` with one.
 */
const SRC = readFileSync(join(__dirname, 'grounds.service.ts'), 'utf8');
const CODE = SRC.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
const create = CODE.slice(CODE.indexOf('async create('), CODE.indexOf('async createForLead('));

describe('the create path honours managingOnly', () => {
  it('reads the flag from the request rather than assuming false', () => {
    expect(create).toMatch(/const managingOnly = dto\.managingOnly === true;/);
  });

  it('writes it onto the initiator participant row', () => {
    /** Without this the flag is accepted and discarded, which is what a silent catch already did. */
    expect(create).toMatch(/partyType: PartyType\.INITIATOR,\s*\n\s*managingOnly,/);
  });

  it('and does NOT create a session-1 check-in for a managing-only lead', () => {
    /**
     * The assertion that actually unblocks reports. A check-in for somebody who will never answer sits
     * NOT_STARTED forever and holds the whole ground open behind them.
     */
    const guarded = create.slice(create.indexOf('if (!managingOnly)'));
    expect(create).toMatch(/if \(!managingOnly\) \{/);
    expect(guarded).toMatch(/tx\.checkIn\.create/);
  });

  it('a lead who IS a party still gets their check-in', () => {
    /** The control. The default must stay exactly as it was for everybody who did not opt out. */
    expect(create).toMatch(/sessionNumber: 1, status: CheckInStatus\.NOT_STARTED/);
  });
});

describe('the flag is accepted at the door', () => {
  it('createGroundDto carries managingOnly', () => {
    const dto = readFileSync(join(__dirname, 'dto', 'create-ground.dto.ts'), 'utf8');
    expect(dto).toMatch(/managingOnly\?: boolean;/);
    /** Validated, so a stray string cannot quietly read as truthy. */
    expect(dto).toMatch(/@IsBoolean\(\)\s*\n\s*managingOnly/);
  });

  it('and the client sends it AT CREATE, not only afterwards', () => {
    /**
     * The whole bug in one line. Sending it only via the follow-up confirmLead call is what failed,
     * because that call rejects a ground its own creator just made.
     */
    const page = readFileSync(
      join(__dirname, '../../../../client/src/pages/grounds/CreateGroundPage.tsx'), 'utf8',
    ).replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
    const createCall = page.slice(0, page.indexOf('confirmLead'));
    expect(createCall).toMatch(/managingOnly: !alsoAParty/);
  });
});
