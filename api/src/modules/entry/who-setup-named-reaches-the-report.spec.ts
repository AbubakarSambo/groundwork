import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * SHE NAMED HER TEAM IN SETUP AND THE REPORT SAID THE TEAM WAS NOT NAMED.
 *
 * Read off a live run. The lead listed her team members in the setup chat, and the report she got at
 * the end carried an open item headed "Team members not named here", telling her to add each of them
 * so their contributions could be seen. Her words: "I clear named the team members on the entry
 * chat."
 *
 * The chat had been given `peopleNamed` for a while, which is why the conversation stopped asking
 * who else was involved. The report was never given them: it reads the check-in's own turns and
 * nothing else, so everything said before it was invisible. Two reads of one session, one of them
 * told and one of them not.
 *
 * Asserted at the seam rather than on a rendered report, because that is where it was severed: the
 * controller has to take the list, and the read has to be handed it.
 */
describe('who setup named reaches the report', () => {
  const strip = (t: string) => t.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  const controller = strip(readFileSync(join(__dirname, 'entry.controller.ts'), 'utf8'));
  const service = strip(readFileSync(join(__dirname, 'entry.service.ts'), 'utf8'));

  it('the report route takes the list setup collected', () => {
    expect(controller).toMatch(/peopleNamed\?: string\[\];/);
    expect(controller).toMatch(/this\.service\.report\([^)]*dto\.peopleNamed[,)]/);
  });

  it('and the read is handed it, not left to find it in the turns', () => {
    const read = service.slice(service.indexOf('async report(messages'));
    expect(read).toMatch(/peopleNamed\?: string\[\]/);
    const body = read.slice(0, read.indexOf('extract<EntryReport>'));
    expect(body).toMatch(/alreadyNamed/);
    expect(body).toMatch(/trimmed\.unshift/);
  });

  it('and is told plainly not to report them as missing, which is the thing that happened', () => {
    expect(service).toMatch(/do not report them as missing/i);
  });
});
