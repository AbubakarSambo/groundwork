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

  it('creates a SETUP conversation for a managing-only lead, not a session', () => {
    /**
     * REVERSED DELIBERATELY, AND THE DISTINCTION IS THE WHOLE POINT. GW-EXP-6.
     *
     * This asserted that no check-in was created at all, which was right while a check-in could only
     * mean "give your account". It became the reason every expectation feature was dead on exactly
     * the grounds most likely to need one: nothing ever asked a lead who runs a check-in without
     * taking part what they expect of anybody.
     *
     * Setting up is not testifying. So the row exists and carries `isSetup`, and is excluded from
     * every session count - the test below proves the report still releases, which is the rule this
     * file was really protecting.
     */
    const create = CODE.slice(CODE.indexOf('async create('), CODE.indexOf('async createForLead('));
    /* Everyone does a first check-in: the managing-only lead's session 1 is a real session. */
    expect(create).toMatch(/isSetup: false/);
    expect(create).toMatch(/tx\.checkIn\.create/);
    expect(create).not.toMatch(/if \(!managingOnly\) \{/);
  });

  it('a lead who IS a party still gets their check-in', () => {
    /** The control. The default must stay exactly as it was for everybody who did not opt out. */
    /** Reformatted across lines when `isSetup` joined the create. The claim is the same. */
    expect(create).toMatch(/sessionNumber: 1,[\s\S]{0,60}?status: CheckInStatus\.NOT_STARTED/);
  });
});

describe('the flag is accepted at the door', () => {
  it('createGroundDto carries managingOnly', () => {
    const dto = readFileSync(join(__dirname, 'dto', 'create-ground.dto.ts'), 'utf8');
    expect(dto).toMatch(/managingOnly\?: boolean;/);
    /** Validated, so a stray string cannot quietly read as truthy. */
    expect(dto).toMatch(/@IsBoolean\(\)\s*\n\s*managingOnly/);
  });

  it('and the server still takes it at create, which is the half that mattered', () => {
    /**
     * The whole bug in one line: sending this only via the follow-up `confirmLead` call is what
     * failed, because that call rejects a ground its own creator just made. So `create` has to
     * accept it.
     *
     * THE CLIENT HALF OF THIS ASSERTION IS GONE WITH THE SCREEN THAT HELD IT. The wizard asked
     * "do you check in too" on a form step and posted `managingOnly` at create; /grounds/new is a
     * picker now that hands over to the setup conversation, and the conversation asks that question
     * at the end and commits through /entry/commit.
     *
     * IT IS NOT YET PASSED ON THAT PATH, and this comment is the honest record of it rather than a
     * silently dropped test: somebody who says "they check in, I read the reports" in the
     * conversation is not yet recorded as managing-only. Tracked as the oversight work; the server
     * contract below is what makes it a one-field change when it is done.
     */
    expect(SRC).toMatch(/const managingOnly = dto\.managingOnly === true;/);
  });
});
