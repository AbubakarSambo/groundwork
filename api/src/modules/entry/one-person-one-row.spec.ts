import { readFileSync } from 'fs';
import { join } from 'path';

const strip = (t: string) => t.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^\s*\/\/.*$/gm, ' ');
const SRC = strip(readFileSync(join(__dirname, 'the-open-link.service.ts'), 'utf8'));

/**
 * "EHI OKOSUN — NOBODY HAS SAID ANYTHING ABOUT THIS YET", beside an unnamed card holding everything
 * he had said (a live board, 22 September 2026). He was invited by mail and answered on the shared
 * link, so the ground held two rows for one man and every count read them as two people.
 */
describe('one person, one row', () => {
  it('moves the answer onto the row that was invited, rather than refusing the address', () => {
    const finish = SRC.slice(SRC.indexOf('async finish('));
    expect(finish).not.toContain('That address is already on this check-in');
    expect(finish).toContain("this.prisma.checkIn.updateMany({ where: { participantId: row.id }, data: { participantId: already.id } })");
    /* What they said moves with it, or the merge loses the record it exists to protect. */
    expect(finish).toContain("this.prisma.recordEntry.updateMany({ where: { participantId: row.id }, data: { participantId: already.id } })");
    expect(finish).toContain("this.prisma.groundDocument.updateMany({ where: { participantId: row.id }, data: { participantId: already.id } })");
    /* And the duplicate goes, in the same transaction, so a half-merged pair cannot exist. */
    expect(finish).toContain('this.prisma.groundParticipant.delete({ where: { id: row.id } })');
    expect(finish).toMatch(/\$transaction\(\[[\s\S]*?groundParticipant\.delete/);
  });

  it('and the session is completed against the row it moved to', () => {
    const finish = SRC.slice(SRC.indexOf('async finish('));
    expect(finish).toContain("this.conversation.complete(theirs!.id, { theParticipant: already.id }, { theyAskedToFinish: true })");
  });
});
