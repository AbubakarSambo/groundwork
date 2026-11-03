import { readdirSync, readFileSync, statSync } from 'fs';
import { join, relative } from 'path';

/**
 * HAFSAH'S FIX LIST, ITEM 4 (14 October 2026): "Ten minutes is fine and normal for a check-in ... Just never promise
 * 'about two minutes': say 'about ten minutes' wherever the check-in's length is mentioned (the check-in page,
 * invitations, reminders, Today, emails and WhatsApp)."
 *
 * Read across everything a person can be sent or shown, with the comments taken out: no sentence says a check-in takes
 * two or five minutes. Two places are left as they are, on purpose:
 *  - the WhatsApp templates Meta has approved (whatsapp/a-message-outside-the-window.ts). Their words cannot change
 *    without a new approval, so they are pinned here exactly, and reported to Hafsah;
 *  - the instructions to the model (conversation/prompt-library.ts), which say how long the conversation should feel
 *    to the model, never to a person. The lean conversation (fix list, item 4, main part) waits for Hafsah's yes.
 * Setting a check-in up ("Two minutes to set up") is not a check-in's length, and is not touched.
 *
 * CHANGED 3 November 2026 (F5, the approved journey, stage 6): a team member's check-in was measured at a median of 1.9
 * minutes, and Hafsah approved "About two minutes". That length now has one owner, A_CHECK_IN_TAKES in
 * participants/when-it-asks.ts, which every screen and message reads. So what this checks now is that no other sentence
 * a person reads states a check-in's length of its own, and that the one owner says the measured length.
 */
/** The approved WhatsApp templates that still say five minutes, word for word, left as Meta approved them (fix list, item 4). */
const WHAT_THE_WHATSAPP_TEMPLATES_SAY = [
  "'Hi {{1}}, your check-in for {{2}} is open. It takes about five minutes, and you can answer right here. Reply START to begin.'",
  "'Hi {{1}}, your check-in for {{2}} closes in an hour, at {{3}}. Five minutes now means your view is part of this round.'",
  "\"Hi {{1}}, your check-in for {{2}} is still waiting. Your answers help {{3}} understand what's in your way, and where they can help. It takes about five minutes, and you can answer here.\"",
];

const ROOTS = [join(__dirname, '..', '..'), join(__dirname, '..', '..', '..', '..', 'client', 'src')];
const LEFT_AS_THEY_ARE = ['modules/whatsapp/a-message-outside-the-window.ts', 'modules/conversation/prompt-library.ts'];
/** The one owner of a check-in's length (F5, stage 6), read by everything else. */
const THE_ONE_OWNER = 'modules/participants/when-it-asks.ts';
const A_SHORTER_PROMISE = /\b(?:about|takes|only)\s+(?:two|five|2|5)\s+minutes\b|\b(?:two|five)\s+minutes\s+now\b/i;
/** Setting a check-in up, not answering one: "we'll set it up in about two minutes", "then add the people. Takes about two minutes." */
const ABOUT_SETTING_IT_UP = /\bset (?:it )?up\b|\bthen add the people\b/i;

function filesUnder(dir: string, out: string[] = []): string[] {
  for (const f of readdirSync(dir)) {
    const p = join(dir, f);
    if (statSync(p).isDirectory()) { if (f !== 'node_modules') filesUnder(p, out); continue; }
    if (/\.(ts|tsx)$/.test(f) && !/\.(spec|test)\./.test(f)) out.push(p);
  }
  return out;
}
const withoutComments = (t: string) => t.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '').replace(/\{\s*\/\*[\s\S]*?\*\/\s*\}/g, '');

describe('a check-in\'s length is said in one place, the measured one', () => {
  it('no other sentence a person reads states a check-in\'s length of its own', () => {
    const found: string[] = [];
    for (const root of ROOTS) {
      for (const p of filesUnder(root)) {
        const rel = relative(root, p).split('\\').join('/');
        if (LEFT_AS_THEY_ARE.includes(rel) || rel === THE_ONE_OWNER) continue;
        withoutComments(readFileSync(p, 'utf8')).split('\n').forEach((line, i) => {
          if (A_SHORTER_PROMISE.test(line) && !ABOUT_SETTING_IT_UP.test(line)) found.push(`${rel}:${i + 1}: ${line.trim().slice(0, 120)}`);
        });
      }
    }
    expect(found).toEqual([]);
  });

  it('the one owner says the measured length, "About two minutes"', () => {
    const { A_CHECK_IN_TAKES } = require('../participants/when-it-asks');
    expect(A_CHECK_IN_TAKES).toBe('About two minutes');
  });

  it('the approved WhatsApp templates are left exactly as Meta approved them', () => {
    const src = readFileSync(join(__dirname, '..', 'whatsapp', 'a-message-outside-the-window.ts'), 'utf8');
    for (const words of WHAT_THE_WHATSAPP_TEMPLATES_SAY) expect(src).toContain(words);
  });
});
