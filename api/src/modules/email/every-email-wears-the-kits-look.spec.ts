import { readFileSync } from 'fs';
import { join } from 'path';
import { dressedInTheKitsLook, MAIL_BUTTON, MAIL_FONT_UI, MAIL_FONT_NAME, MAIL_SMALL } from './the-kits-look-in-an-email';
import { plainTextOf, UNSUBSCRIBE_FOOTER } from './email.service';
import { WHAT_GROUNDWORK_IS } from './what-groundwork-is';

/**
 * EVERY EMAIL WEARS THE KIT'S LOOK (Hafsah, 20 October: every screen and every HTML email).
 *
 * What a person sees when the mail opens: the cream page, a white card with the warm line, the
 * kit's two typefaces with fallbacks a mail program has, ink text, the navy button with 8px corners
 * and no border, small print never grey and never below 13px, and no shadow. And the frame adds no
 * words: the text part of a dressed mail is the text part of the mail.
 */
const HERE = __dirname;
const SOURCES = [
  join(HERE, 'email.service.ts'),
  join(HERE, 'the-direct-words.ts'),
  join(HERE, 'what-groundwork-is.ts'),
  join(HERE, 'the-kits-look-in-an-email.ts'),
  join(HERE, '../conversation/ignoring-it-should-be-enough.ts'),
  join(HERE, '../engagement/the-daily-delivery-alert.ts'),
].map((p) => [p, readFileSync(p, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')] as const);

describe('every email wears the kit\'s look', () => {
  const body = '<p>Hi Wanjiru,</p><p>Your check-in for <strong>Sales team, Q4</strong> is open.</p>' +
    `<p><a href="https://app.test/checkin/1" style="${MAIL_BUTTON}">Start my check-in</a></p>`;
  const mail = dressedInTheKitsLook(body);

  it('is a whole document on the cream page, with the words in a white card', () => {
    expect(mail.startsWith('<!doctype html>')).toBe(true);
    expect(mail).toContain('background:#FDFBF6');
    expect(mail).toMatch(/background:#ffffff;border:1px solid #EDE5D6;border-radius:12px;/);
    expect(mail).toContain(body);
  });

  it('reads in Atkinson Hyperlegible, with Literata for a heading, and a fallback every mail program has', () => {
    expect(MAIL_FONT_UI).toMatch(/^Atkinson Hyperlegible,Arial/);
    expect(MAIL_FONT_NAME).toMatch(/^Literata,Georgia/);
    expect(mail).toContain('fonts.googleapis.com/css2?family=Atkinson+Hyperlegible');
    expect(mail).toContain('family=Literata');
    expect(mail).toContain(`font-family:${MAIL_FONT_UI};font-size:16px;line-height:1.5;color:#1A1916;`);
  });

  it('the button is the kit\'s primary: flat navy, white bold words, 8px corners, no border, 44px tall', () => {
    expect(MAIL_BUTTON).toMatch(/background:#0C447C;color:#ffffff;padding:12px 20px;border:0;border-radius:8px;/);
    expect(MAIL_BUTTON).toMatch(/font-weight:700;font-size:16px;line-height:20px;/);
  });

  it('small print is the kit\'s warm brown at 13px, and so are the footers every sender shares', () => {
    expect(MAIL_SMALL).toBe('font-size:13px;color:#4E4236;');
    expect(UNSUBSCRIBE_FOOTER('https://app.test/u/1')).toContain('font-size:13px;color:#4E4236;');
    expect(WHAT_GROUNDWORK_IS).toContain('font-size:13px;color:#4E4236;');
  });

  it('the frame adds no words: the text part is the same with it and without it', () => {
    expect(plainTextOf(mail)).toBe(plainTextOf(body));
  });

  it('is dressed once, however many times it is handed over', () => {
    expect(dressedInTheKitsLook(mail)).toBe(mail);
  });

  it('no mail source paints a grey, an old dark button, a shadow, or small print below 13px', () => {
    const GREY = /#(9B9590|6B6560|888|999|666|555|ccc|eee|E2E0DB|E8E5DE|4A4540|F5F3EF)(?![0-9A-Fa-f])/i;
    const found: string[] = [];
    for (const [p, code] of SOURCES) {
      const name = p.split('/').pop();
      if (GREY.test(code)) found.push(`${name}: grey ${code.match(GREY)![0]}`);
      if (/background:#0A1628;color:white/.test(code)) found.push(`${name}: the old dark button`);
      if (/box-shadow/.test(code)) found.push(`${name}: a shadow`);
      if (/font-size:\s*(9|10|11|12)(\.\d+)?px/.test(code)) found.push(`${name}: small print below 13px`);
      if (/border-radius:6px/.test(code)) found.push(`${name}: 6px corners`);
    }
    expect(found).toEqual([]);
  });
});
