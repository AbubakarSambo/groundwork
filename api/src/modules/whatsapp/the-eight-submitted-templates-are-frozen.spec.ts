/* KNOWN FAILURE (Release 1, pull request 1, 18 October 2026): this test fails on origin/staging (cbc1927ed) too, run the
   same way, so this pull request does not cause it: it pins template words in docs/whatsapp-templates.md that staging's notes do not hold yet. Left in place, not changed, so it is fixed in its own change. */
import * as fs from 'fs';
import * as path from 'path';
import { TEMPLATES } from './a-message-outside-the-window';

/**
 * DECISION 131: THE EIGHT WHATSAPP TEMPLATES ALREADY SUBMITTED TO META ARE FROZEN.
 * Their fixed words are never changed in code or in docs/whatsapp-templates.md ("Hafsah's eight"). Meta approved these exact words; a changed
 * word is a template that has to be submitted and approved again. The doc is the source: this reads each body from it and requires the code to
 * hold the same words, and the doc to hold the words below, so a change to either side fails here.
 */
const THE_EIGHT: Record<string, { kind: string; body: string }> = {
  checkin_open: { kind: 'checkin-open', body: 'Hi {{1}}, your check-in for {{2}} is open. It takes about five minutes, and you can answer right here. Reply START to begin.' },
  checkin_due_tomorrow: { kind: 'due-tomorrow', body: 'Hi {{1}}, your check-in for {{2}} is due tomorrow, {{3}}. You can answer here whenever suits you before then.' },
  checkin_opens_soon: { kind: 'opens-soon', body: "Hi {{1}}, your check-in for {{2}} opens in an hour, at {{3}}. Reply here when it opens and we'll begin." },
  checkin_closes_soon: { kind: 'closes-soon', body: 'Hi {{1}}, your check-in for {{2}} closes in an hour, at {{3}}. Five minutes now means your view is part of this round.' },
  checkin_overdue: { kind: 'overdue', body: "Hi {{1}}, your check-in for {{2}} is overdue. It's still open, so you can answer here now." },
  checkin_team_almost_in: { kind: 'team-almost-in', body: 'Hi {{1}}, {{2}} of {{3}} people have checked in for {{4}}. Your check-in is still open, and you can answer here.' },
  checkin_your_view_matters: { kind: 'your-view-matters', body: "Hi {{1}}, your check-in for {{2}} is still waiting. Your answers help {{3}} understand what's in your way, and where they can help. It takes about five minutes, and you can answer here." },
  lead_daily_summary: { kind: 'lead-summary', body: 'Good morning {{1}}. Here is today\'s summary of your check-ins. {{2}} You can open your board for the full picture here {{3}} If you would rather not hear from us here again today, reply "not now".' },
};

/* A markdown file has no code comments to strip; the replace is here only because the repository's ratchet asks every spec that reads a file to strip them. */
const DOC = fs.readFileSync(path.join(__dirname, '..', '..', '..', '..', 'docs', 'whatsapp-templates.md'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
const eightSection = DOC.slice(DOC.indexOf("## Hafsah's eight"), DOC.indexOf('\n## ', DOC.indexOf("## Hafsah's eight") + 10));
const docBody = (name: string): string => {
  const at = eightSection.indexOf(`\`${name}\``);
  const line = eightSection.slice(at).split('\n').find((l) => l.startsWith('- **Body:**')) ?? '';
  return line.replace('- **Body:** ', '').trim().replace(/^`|`$/g, '');
};

describe('the eight templates submitted to Meta (decision 131)', () => {
  it('are exactly eight', () => {
    expect(Object.keys(THE_EIGHT)).toHaveLength(8);
    expect(eightSection.match(/^### \d\. `/gm)).toHaveLength(8);
  });
  it.each(Object.entries(THE_EIGHT))('%s: the doc, the code and this pin hold the same words', (name, { kind, body }) => {
    expect(docBody(name)).toBe(body);
    expect(TEMPLATES[kind].name).toBe(name);
    expect(TEMPLATES[kind].body).toBe(body);
  });
});
