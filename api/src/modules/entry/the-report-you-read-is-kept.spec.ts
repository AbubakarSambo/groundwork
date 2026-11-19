import * as fs from 'fs';
import * as path from 'path';

/**
 * THE REPORT SOMEBODY READ AT THE END WAS DESTROYED ABOUT TWENTY SECONDS LATER.
 *
 * Reported four times, most plainly as: "I want the exact same forming report to be openable or
 * seen. I have not seen it anywhere - when I click, it sends me back to the chat and the report
 * looks nothing like what I got at the end."
 *
 * The entry commit wrote the whole report into `GroundParticipant.soloArtifact`. That column
 * belongs to `buildSoloArtifact`, fired from the same method a few lines earlier and landing later
 * with its own `{summary, whatToCarry}` - so the write was overwritten by a background job, and
 * every reader of the column expects the two-field shape and would not have rendered the report
 * anyway. Two ways of being wrong, one column.
 *
 * It goes on the session that produced it, `CheckIn.sessionReport`, whole and unedited.
 */
const withoutComments = (file: string) =>
  fs
    .readFileSync(path.join(__dirname, file), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\/\/.*$/gm, '');

describe('the report a session ended on', () => {
  const service = withoutComments('entry.service.ts');

  it('is kept on the check-in that produced it', () => {
    expect(service).toMatch(/checkIn\.update\(\{[\s\S]{0,200}?sessionReport: dto\.report/);
  });

  it('is carried whole: every key the client\'s report has, the DTO declares, and the merge passes it through', () => {
    /* Seven of nine fields were shown at the end of the entry chat and dropped at the moment an
       account was made, because the DTO declared two and the merge rebuilt a one-key object. A key
       added to the client's EntryReport and not here is a 400 under forbidNonWhitelisted, which is
       how this DTO came to exist - so the two are held equal. */
    const clientType = fs.readFileSync(path.join(__dirname, '..', '..', '..', '..', 'client', 'src', 'api', 'entry.ts'), 'utf8');
    const iface = clientType.slice(clientType.indexOf('export interface EntryReport {'), clientType.indexOf('\n}', clientType.indexOf('export interface EntryReport {')));
    const keys = [...iface.matchAll(/^\s{2}(\w+)\??:/gm)].map((m) => m[1]);
    expect(keys.length).toBeGreaterThanOrEqual(9);
    /* Updated 19 November 2026: the keys are held equal to the one function that shapes the report on the server, not to a
       class in the controller, and the save's one door reads what the screen sent. */
    const kept = withoutComments('the-report-as-it-is-kept.ts');
    for (const k of keys) expect(kept).toMatch(new RegExp(`\\b${k}\\b`));
    expect(service).toMatch(/report: dto\.report \?\? theReportAsItIsKept\(sent\.reportSummary\) \?\? null/);
    const page = fs.readFileSync(path.join(__dirname, '..', '..', '..', '..', 'client', 'src', 'pages', 'enter', 'EntryChatPage.tsx'), 'utf8');
    /* Since 0e649a61a (a correction on the setup card is saved with it), the page sends the report it showed only when it was made
       from the whole conversation; otherwise the save makes it from the conversation and the team's names (dd2344ad5). */
    expect(page).toMatch(/reportSummary: sessionReport && reportMadeFrom === history\.length \? sessionReport : undefined/);
  });

  it('never goes into the column the background summary owns', () => {
    /* `buildSoloArtifact` writes soloArtifact after this method returns. A commit that also wrote
       it would be racing a job it started itself, and losing. */
    expect(service).not.toMatch(/soloArtifact:\s*JSON\.stringify\(dto\.report\)/);
  });

  const conversation = fs
    .readFileSync(path.join(__dirname, '..', 'conversation', 'conversation.service.ts'), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\/\/.*$/gm, '');

  it('is readable again, by its owner and nobody else', () => {
    expect(conversation).toContain('async getSessionReport(');
    const from = conversation.indexOf('async getSessionReport(');
    const body = conversation.slice(from, from + 900);
    expect(body).toContain('loadOwnedCheckIn(checkInId, requestingUserId)');
  });

  it('is served by a route of its own', () => {
    const controller = withoutComments(path.join('..', 'conversation', 'conversation.controller.ts'));
    expect(controller).toContain("@Get(':id/session-report')");
    expect(controller).toContain('getSessionReport(id, userId)');
  });
});
