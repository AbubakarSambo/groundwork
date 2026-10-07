import { readFileSync } from 'fs';
import { join } from 'path';
import { TEMPLATES, fill } from './a-message-outside-the-window';
import { theTeamIsAlmostIn } from './what-goes-to-a-phone';
import { theSummaryOnWhatsApp } from '../suites/the-approvals-summary';
import { THE_REMINDERS_IN_SIMPLER_WORDS } from '../grounds/what-is-sent-in-simpler-words';

/* Comments are taken out before anything is matched, so a sentence in a comment cannot satisfy this. */
const withoutComments = (t: string) => t.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

/**
 * EVERY TEMPLATE IN THE CODE FOLLOWS THE RULES META CHECKS (Hafsah is submitting them).
 *
 * Read from the body each template really has: the blanks are numbered in the order they appear, there is no blank at the very start or the very end, no two
 * blanks sit side by side, the body is at most 1,024 characters, and it is the same words as docs/whatsapp-templates.md, which is what is submitted. Then the two
 * that broke the rules are read rendered, as the person reads them.
 */
const blanks = (body: string) => [...body.matchAll(/\{\{(\d+)\}\}/g)].map((m) => Number(m[1]));
const doc = withoutComments(readFileSync(join(__dirname, '..', '..', '..', '..', 'docs', 'whatsapp-templates.md'), 'utf8'));

const all = Object.entries(TEMPLATES).map(([kind, t]) => ({ kind, name: t.name, body: t.body }));

describe.each(all)('$name ($kind)', ({ body }) => {
  it('numbers its blanks in the order they appear, from one, without gaps', () => {
    const seen: number[] = [];
    for (const n of blanks(body)) if (!seen.includes(n)) seen.push(n);
    expect(seen).toEqual(seen.map((_, i) => i + 1));
  });
  it('has no blank at the very start or the very end', () => {
    expect(body).not.toMatch(/^\s*\{\{\d+\}\}/);
    expect(body).not.toMatch(/\{\{\d+\}\}[\s.!?,]*$/);
  });
  it('has no two blanks side by side', () => {
    expect(body).not.toMatch(/\{\{\d+\}\}\s*\{\{\d+\}\}/);
  });
  it('is at most 1,024 characters, even with every blank at its longest sample', () => {
    expect(body.length).toBeLessThanOrEqual(1024);
  });
});

describe('the words that are submitted are the words in the code', () => {
  it.each(all)('$name', ({ name, body }) => {
    const at = doc.indexOf(`\`${name}\``);
    expect(at).toBeGreaterThan(-1);
    const rest = doc.slice(at);
    const line = /- \*\*Body:\*\*\s*(.+)/.exec(rest)![1].trim().replace(/^`|`$/g, '');
    expect(line).toBe(body);
  });
  it('and each template in the doc carries a sample values line', () => {
    const sections = doc.split(/\n### /).slice(1).filter((x) => /\*\*Body:\*\*/.test(x));
    for (const sct of sections) expect(sct).toMatch(/\*\*Sample values:\*\*/);
  });
});

describe('the plainer bodies keep the same blanks in the same order', () => {
  it.each(Object.entries(THE_REMINDERS_IN_SIMPLER_WORDS))('%s', (kind, body) => {
    const usual = TEMPLATES[kind].body;
    expect(blanks(body)).toEqual(blanks(usual));
    expect(body).not.toMatch(/\{\{\d+\}\}[\s.!?,]*$/);
  });
});

describe('what Miriam reads in the check-in that is nearly in', () => {
  it('four of six, in order, a plain notice about her own open check-in', () => {
    const m = theTeamIsAlmostIn({ firstName: 'Miriam', label: 'the sales team' }, 4, 6);
    expect(m.text).toBe('Hi Miriam, 4 of 6 people have checked in for the sales team. Your check-in is still open, and you can answer here.');
    expect(m.text).not.toMatch(/picture is coming together|Add yours/);
  });
  it('and the plainer form reads the same way round', () => {
    const m = theTeamIsAlmostIn({ firstName: 'Miriam', label: 'the sales team' }, 4, 6, true);
    expect(m.text).toBe('Hi Miriam, 4 of 6 people have answered the check-in for the sales team. You have not answered yet. When you answer, your answers go into the report.');
  });
});

describe('what Omar reads when requests are waiting', () => {
  it('ends with words, has no colon, and the link sits inside a sentence', () => {
    const m = theSummaryOnWhatsApp('Omar', 'Six requests are waiting for you to approve or decline, three for leave and three to spend.', 'https://app.test/today');
    expect(m.text).toBe('Hi Omar. Six requests are waiting for you to approve or decline, three for leave and three to spend. You can read and answer them in Groundwork here https://app.test/today and nothing is decided until you do.');
    expect(m.text.replace(/https?:\/\/\S+/g, '')).not.toMatch(/:/);
    expect(fill(TEMPLATES['requests-waiting'].body, ['a', 'b', 'c'])).toMatch(/until you do\.$/);
  });
});
