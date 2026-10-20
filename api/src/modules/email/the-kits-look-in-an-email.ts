/**
 * THE KIT'S LOOK, IN AN EMAIL (Hafsah's kit and the prototype, 20 October).
 *
 * Every mail used to be a bare `<div style="font-family: sans-serif">` with a dark-navy button of
 * 6px corners and grey small print (#9B9590, #888, #555): none of it the product's look. This is
 * the one place the mail's look is decided, in the same values the screens use (client/src/index.css):
 *
 * - the page cream (#FDFBF6), a white card with the warm rule line (#EDE5D6) and 12px corners;
 * - Atkinson Hyperlegible for what a person reads and Literata for a heading, each with a safe
 *   fallback for the mail programs that do not load a web font (most of Outlook, some of Gmail);
 * - ink text (#1A1916), secondary text in the kit's warm brown (#4E4236), small print never below
 *   13px and never grey;
 * - the kit's primary button: flat navy (#0C447C), white bold words, 8px corners, no border and
 *   about 44px tall; no shadow anywhere.
 *
 * Mail programs strip a good deal, so everything is inline and the frame is a table: a `<style>`
 * block and the Google Fonts link are a bonus for the programs that honour them, never the thing
 * the look depends on. Nothing here changes a word: the body each sender wrote goes inside as it is.
 */

export const MAIL_INK = '#1A1916';
export const MAIL_MUTED = '#4E4236';
export const MAIL_NAVY = '#0C447C';
export const MAIL_PAGE = '#FDFBF6';
export const MAIL_RULE = '#EDE5D6';
export const MAIL_FILL = '#F7F1E5';

/** Atkinson Hyperlegible where the program loads it; Arial, which every mail program has, where it does not. */
/* Written without quotes (valid CSS for a name of several words), so it can sit inside a style="" in any JS string. */
export const MAIL_FONT_UI = 'Atkinson Hyperlegible,Arial,Helvetica,sans-serif';
/** Literata where loaded; Georgia otherwise. Headings only. */
export const MAIL_FONT_NAME = 'Literata,Georgia,Times New Roman,serif';

export const MAIL_FONTS_LINK =
  'https://fonts.googleapis.com/css2?family=Atkinson+Hyperlegible:ital,wght@0,400;0,700;1,400&family=Literata:opsz,wght@7..72,400;7..72,500&display=swap';

/**
 * THE KIT'S PRIMARY BUTTON, for an `<a>` in a mail. 12px above and below a 20px line is the 44px a
 * thumb needs, drawn with padding because mail programs ignore `min-height` on a link.
 */
export const MAIL_BUTTON =
  `display:inline-block;background:${MAIL_NAVY};color:#ffffff;padding:12px 20px;border:0;border-radius:8px;` +
  `text-decoration:none;font-weight:700;font-size:16px;line-height:20px;font-family:${MAIL_FONT_UI};`;

/** The small print under a mail: the kit's secondary text at 13px, never grey and never smaller. */
export const MAIL_SMALL = `font-size:13px;color:${MAIL_MUTED};`;

/** A quoted note (somebody's own words, or a reason) set off by the warm rule. */
export const MAIL_QUOTE = `border-left:3px solid ${MAIL_RULE};padding:8px 14px;margin:18px 0;color:${MAIL_MUTED};`;

/** Said once, so a mail that has already been dressed is never dressed twice (a held mail is dressed when it goes). */
const DRESSED = 'data-gw-mail="kit"';

export function isDressed(html: string): boolean {
  return html.includes(DRESSED);
}

/**
 * The mail as a whole document in the kit's look, around the body its sender wrote. Called once,
 * at the door (deliverNow), after every footer has been added, so the footer sits inside the card.
 */
export function dressedInTheKitsLook(body: string): string {
  if (isDressed(body)) return body;
  return (
    '<!doctype html>' +
    '<html lang="en"><head>' +
    '<meta charset="utf-8">' +
    '<meta name="viewport" content="width=device-width, initial-scale=1">' +
    '<meta name="color-scheme" content="light">' +
    /* The fonts by @import rather than a <link href>: the same sheet for the programs that load one, and no address in the mail that is
       not one of its own links (the text part carries every link a person can follow, and this is not one). */
    '<style>' +
    `@import url('${MAIL_FONTS_LINK}');` +
    `body{margin:0;padding:0;background:${MAIL_PAGE};}` +
    `.gw-mail p{margin:0 0 14px;}` +
    `.gw-mail a{color:${MAIL_NAVY};}` +
    `.gw-mail h1,.gw-mail h2{font-family:${MAIL_FONT_NAME};font-weight:500;}` +
    '</style>' +
    '</head>' +
    `<body ${DRESSED} style="margin:0;padding:0;background:${MAIL_PAGE};">` +
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${MAIL_PAGE}" style="background:${MAIL_PAGE};width:100%;">` +
    '<tr><td align="center" style="padding:24px 12px;">' +
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#ffffff" style="max-width:600px;width:100%;background:#ffffff;border:1px solid ${MAIL_RULE};border-radius:12px;">` +
    `<tr><td class="gw-mail" style="padding:28px 24px;font-family:${MAIL_FONT_UI};font-size:16px;line-height:1.5;color:${MAIL_INK};font-variant-numeric:lining-nums;">` +
    body +
    '</td></tr></table>' +
    '</td></tr></table>' +
    '</body></html>'
  );
}
