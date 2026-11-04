import { readdirSync, readFileSync, statSync } from 'fs';
import { join, relative } from 'path';

/**
 * HOW LONG A CHECK-IN TAKES IS SAID FROM ONE OWNER, and the owner says "About ten minutes" (Hafsah's fixed decision, 3 November 2026).
 *
 * History. Hafsah's fix list, item 4 (14 October 2026), said "about ten minutes" wherever a check-in's length is mentioned. On
 * 3 November 2026 a team member's check-in was measured at a median of 1.9 minutes and Hafsah approved "About two minutes", which
 * became A_CHECK_IN_TAKES. But only the invitation read it: the check-in's opening line, Today, the board, the assistant, the
 * embedded panel, the emails, the WhatsApp messages inside the 24 hours and the words suggested for chasing still said ten, and
 * the approved WhatsApp templates say five. The earlier version of this spec looked only for "two" and "five", so every "ten" passed.
 *
 * CHANGED 3 November 2026 (evening; renamed from a-check-in-takes-about-ten-minutes.spec.ts): the owner moved to
 * common/how-long-a-check-in-takes.ts, and this now refuses any length of its own, ten included, in anything a person reads.
 *
 * CHANGED 3 November 2026 (night): Hafsah fixed the length as "about ten minutes", a decision and not a measurement, so the owner
 * says ten and this pins ten. The scenario packs' pacing words now read the owner too.
 *
 * Left as they are, on purpose:
 *  - the WhatsApp templates (whatsapp/a-message-outside-the-window.ts). The approved ones cannot change without a new approval,
 *    and the ones waiting for approval must match what was submitted, so they are pinned here word for word and listed for Hafsah;
 *  - setting a check-in up, which has its own owner (client/src/lib/how-long-setup-takes.ts).
 */
const WHAT_THE_WHATSAPP_TEMPLATES_SAY = [
  /* Approved by Meta (Hafsah's eight). */
  "'Hi {{1}}, your check-in for {{2}} is open. It takes about five minutes, and you can answer right here. Reply START to begin.'",
  "'Hi {{1}}, your check-in for {{2}} closes in an hour, at {{3}}. Five minutes now means your view is part of this round.'",
  "\"Hi {{1}}, your check-in for {{2}} is still waiting. Your answers help {{3}} understand what's in your way, and where they can help. It takes about five minutes, and you can answer here.\"",
  /* Written for submission (19 and 21 October), word for word. */
  "'Hi {{1}}, your check-in for {{2}} is open. It takes about ten minutes, and you can answer right here. Reply START to begin.'",
  "'Hi {{1}}, your check-in for {{2}} closes at {{3}}. It takes about ten minutes, and you can answer right here.'",
];

const ROOTS = [join(__dirname, '..', '..'), join(__dirname, '..', '..', '..', '..', 'client', 'src')];
const LEFT_AS_THEY_ARE = ['modules/whatsapp/a-message-outside-the-window.ts'];
const THE_ONE_OWNER = 'common/how-long-a-check-in-takes.ts';
const NUMBER = '(?:a few|one|two|three|four|five|six|seven|eight|nine|ten|fifteen|twenty|\\d+(?:\\s+to\\s+\\d+)?)';
const A_LENGTH_OF_ITS_OWN = new RegExp(`\\b(?:about|takes?|only)\\s+${NUMBER}\\s+minutes?\\b|\\b${NUMBER}\\s+minutes\\s+(?:now|each)\\b`, 'i');
/** Setting a check-in up, not answering one: "we'll set it up in about five minutes", "then add the people. Takes about five minutes." */
const ABOUT_SETTING_IT_UP = /\bset (?:it )?up\b|\bthen add the people\b/i;

function filesUnder(dir: string, out: string[] = []): string[] {
  for (const f of readdirSync(dir)) {
    const p = join(dir, f);
    if (statSync(p).isDirectory()) { if (f !== 'node_modules' && f !== '__fixtures__') filesUnder(p, out); continue; }
    if (/\.(ts|tsx)$/.test(f) && !/\.(spec|test)\./.test(f)) out.push(p);
  }
  return out;
}
const withoutComments = (t: string) => t.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '').replace(/\{\s*\/\*[\s\S]*?\*\/\s*\}/g, '');

describe('a check-in\'s length is said from one owner', () => {
  it('no sentence a person reads states a check-in\'s length of its own, ten included', () => {
    const found: string[] = [];
    for (const root of ROOTS) {
      for (const p of filesUnder(root)) {
        const rel = relative(root, p).split('\\').join('/');
        if (LEFT_AS_THEY_ARE.includes(rel) || rel === THE_ONE_OWNER) continue;
        withoutComments(readFileSync(p, 'utf8')).split('\n').forEach((line, i) => {
          if (A_LENGTH_OF_ITS_OWN.test(line) && !ABOUT_SETTING_IT_UP.test(line)) found.push(`${rel}:${i + 1}: ${line.trim().slice(0, 120)}`);
        });
      }
    }
    expect(found).toEqual([]);
  });

  it('the one owner says Hafsah\'s fixed length, "About ten minutes"', () => {
    const { A_CHECK_IN_TAKES, ABOUT_HOW_LONG, IT_TAKES } = require('../../common/how-long-a-check-in-takes');
    expect(A_CHECK_IN_TAKES).toBe('About ten minutes');
    expect(ABOUT_HOW_LONG).toBe('about ten minutes');
    expect(IT_TAKES).toBe('It takes about ten minutes.');
  });

  it('the WhatsApp templates are left exactly as they were approved or submitted', () => {
    const src = readFileSync(join(__dirname, '..', 'whatsapp', 'a-message-outside-the-window.ts'), 'utf8');
    for (const words of WHAT_THE_WHATSAPP_TEMPLATES_SAY) expect(src).toContain(words);
  });
});
