/**
 * The loader exposes `groundwork.context({ subjectExternalId })` so a customer's page can say what
 * the person is on. The panel received it, wrote it to `window.__gwContext`, and NOTHING read that
 * property — so the documented promise that the panel "opens grounded rather than cold" did
 * nothing at all, and somebody on a specific objective got the same greeting as somebody who
 * opened the panel from a dashboard.
 */
import * as fs from 'fs';
import * as path from 'path';
import { openingAbout } from './what-they-are-looking-at';

const subject = { externalId: 'obj-14', title: 'Ship the billing rewrite', kind: 'OBJECTIVE' };

describe('opening on what they are looking at', () => {
  it('names the thing they are on', () => {
    expect(openingAbout(subject, 'Ada', 0).line).toContain('Ship the billing rewrite');
    expect(openingAbout(subject, 'Ada', 0).line).toContain('Ada');
  });

  it('says what is waiting on them here, when something is', () => {
    expect(openingAbout(subject, 'Ada', 1).line).toMatch(/one thing waiting on you/);
    expect(openingAbout(subject, 'Ada', 3).line).toMatch(/3 things waiting on you/);
  });

  it('does not invent a count when there is nothing waiting', () => {
    const line = openingAbout(subject, 'Ada', 0).line;
    expect(line).not.toMatch(/waiting/);
    expect(line).toMatch(/Ask me anything about it/);
  });

  it('offers suggestions about that thing rather than in general', () => {
    const s = openingAbout(subject, 'Ada', 0).suggestions;
    expect(s.every((x) => x.includes('Ship the billing rewrite') || x.includes('objective'))).toBe(true);
  });

  it('survives a subject with no kind', () => {
    expect(openingAbout({ ...subject, kind: null }, 'Ada', 0).suggestions.join(' ')).toContain('this');
  });

  it('is marked as its own source, so it can be told apart from the generic openings', () => {
    expect(openingAbout(subject, 'Ada', 0).source).toBe('what_they_are_looking_at');
  });
});

describe('and the panel actually sends it', () => {
  const panel = fs.readFileSync(path.join(__dirname, 'static', 'panel.html'), 'utf8');

  it('reads __gwContext rather than only writing it', () => {
    const writes = [...panel.matchAll(/window\.__gwContext =/g)].length;
    const reads = [...panel.matchAll(/window\.__gwContext \?|window\.__gwContext !==/g)].length;
    expect(writes).toBeGreaterThan(0);
    expect(reads).toBeGreaterThan(0);
  });

  it('passes it to the opening as `about`', () => {
    expect(panel).toContain("'?about=' + encodeURIComponent(window.__gwContext)");
  });

  it('redraws when the host says the person has moved', () => {
    expect(panel).toContain('__gwDrawOpening');
    expect(panel).toMatch(/if \(changed && typeof window\.__gwDrawOpening === 'function'\)/);
  });

  it('and never puts it in a chat message, which is what somebody said', () => {
    const ask = panel.slice(panel.indexOf('function ask('), panel.indexOf("form.addEventListener"));
    expect(ask).not.toContain('__gwContext');
  });
});

describe('and a failed opening is not an empty panel', () => {
  const panel = fs.readFileSync(path.join(__dirname, 'static', 'panel.html'), 'utf8');

  it('says something on a refusal and on a thrown request', () => {
    expect([...panel.matchAll(/could not read your record just then/g)]).toHaveLength(2);
  });

  it('and still tells the host it is ready, so the frame is not left mid-load', () => {
    const draw = panel.slice(panel.indexOf('window.__gwDrawOpening = function'));
    expect([...draw.matchAll(/send\('ready'\)/g)].length).toBeGreaterThanOrEqual(3);
  });
});

describe('and the server checks the host\'s claim', () => {
  const service = fs
    .readFileSync(path.join(__dirname, 'embed.service.ts'), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '');

  it('only opens on a subject in this organisation that still exists', () => {
    const from = service.indexOf('aboutSubjectExternalId?.trim()');
    const block = service.slice(from, from + 400);
    expect(block).toContain('organizationId');
    expect(block).toContain('sourceDeletedAt: null');
  });

  it('and refuses an embed configured for no domains at all', () => {
    expect(service).toContain('if (!domains.length)');
    expect(service).toMatch(/looks like a broken install/);
  });
});
