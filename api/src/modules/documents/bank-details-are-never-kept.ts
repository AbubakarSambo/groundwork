/**
 * BANK DETAILS ARE NEVER KEPT, IN ANY DOCUMENT.
 *
 * The prototype's upload screen says it in so many words: "Bank account details, Page 4, Never kept,
 * in any document." The capability check on 27 September 2026 uploaded a Word file with a made-up
 * account number in it, and found the number whole in `ground_documents.content`, and so in every
 * session the document reaches, because a document's text is what the model is given. Hafsah:
 * "before any document is stored or sent to the model, hide account numbers, card numbers and
 * similar."
 *
 * ONE PURE FUNCTION, APPLIED WHERE THE TEXT IS TAKEN OUT OF THE FILE. documents.service calls it on
 * every file it reads, whatever reader read it (text, Word, PDF, a sheet, a deck, or a photo or a
 * scan the vision model transcribed), before the row is written and before any read of the text by a
 * model. The link reader and the context chat call it on what they are handed. Nothing downstream
 * ever holds the number, so nothing downstream has to remember to hide it.
 *
 * WHAT COUNTS, and each one is either labelled or checkable, because an ordinary figure must never
 * be hidden - 38,000 dollars, a date, a phone number, a receipt number:
 *
 *   - a card number: 13 to 19 digits, with or without spaces or dashes, that passes the Luhn check
 *     the card networks use, or any such run labelled as a card number;
 *   - an IBAN, which carries its own check digits, so it is hidden only when they are right;
 *   - a number labelled as an account: "account number", "acct no", "A/C", "NUBAN", a wallet or
 *     mobile-money account, a routing or ABA number, a sort code or BSB, a SWIFT or BIC code;
 *   - a ten-digit run (the Nigerian NUBAN) on a line that names a bank or an account before it.
 *
 * WHAT DOES NOT, on purpose: a phone number that nobody called an account, an amount with a comma in
 * it, a date, and any reference shorter than six digits. A long number next to "phone", "tel",
 * "mobile" or "WhatsApp" is a phone number even when it happens to pass the card check.
 */

export const HIDDEN = {
  account: '[account number hidden]',
  card: '[card number hidden]',
  iban: '[IBAN hidden]',
  sortCode: '[sort code hidden]',
  routing: '[routing number hidden]',
  swift: '[SWIFT code hidden]',
} as const;

/** The check digit every card number carries. */
export function passesTheCardCheck(digits: string): boolean {
  if (!/^\d{13,19}$/.test(digits)) return false;
  let sum = 0;
  let double = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let d = digits.charCodeAt(i) - 48;
    if (double) { d *= 2; if (d > 9) d -= 9; }
    sum += d;
    double = !double;
  }
  return sum % 10 === 0;
}

/** The check digits every IBAN carries (ISO 13616, mod 97). */
export function passesTheIbanCheck(candidate: string): boolean {
  const iban = candidate.replace(/[\s-]/g, '').toUpperCase();
  if (!/^[A-Z]{2}\d{2}[A-Z0-9]{11,30}$/.test(iban)) return false;
  const moved = iban.slice(4) + iban.slice(0, 4);
  let rest = 0;
  for (const ch of moved) {
    const n = /\d/.test(ch) ? ch : String(ch.charCodeAt(0) - 55);
    for (const digit of n) rest = (rest * 10 + (digit.charCodeAt(0) - 48)) % 97;
  }
  return rest === 1;
}

const digitsOf = (s: string) => s.replace(/\D/g, '');

/* The words that come before a number that is somebody's phone, not their bank. */
const A_PHONE_BEFORE = /\b(?:phone|tel|telephone|mobile|cell|whats\s?app|call|sms|text)\b[^\n\d]{0,20}$/i;

/* What may sit between a label and its value: a colon, a dash, "is", a hash, spaces. */
/* The long dashes are written as \u2013 and \u2014, so no dash character sits in the source. */
const BETWEEN = String.raw`\s*(?:[:#=\-\u2013\u2014]|\bis\b|\bwas\b)?\s*(?:[:#=\-\u2013\u2014])?\s*`;

/* A run of digits that may be broken by single spaces or dashes: the shape a written account takes. */
const A_DIGIT_RUN = String.raw`\d(?:[ \-]?\d){5,33}`;

type Rule = { label: RegExp; value: string; hide: string; minDigits?: number };

/*
 * THE LABELLED ONES. Each label is whole words, and the value has to follow it straight away, with
 * nothing but a separator between. "The account had 1500000 in it" is not labelled; "Account:
 * 0123456789" is.
 */
const LABELLED: Rule[] = [
  { label: /\b(?:card|debit card|credit card)\s*(?:number|no\.?|num|#)/i, value: String.raw`\d(?:[ \-]?\d){12,18}`, hide: HIDDEN.card, minDigits: 13 },
  { label: /\biban\b/i, value: String.raw`[A-Z]{2}\d{2}(?:[ ]?[A-Z0-9]){11,30}`, hide: HIDDEN.iban },
  { label: /\b(?:sort\s*code|bsb)\b/i, value: String.raw`\d{2}[ \-]?\d{2}[ \-]?\d{2}`, hide: HIDDEN.sortCode },
  { label: /\b(?:routing|aba|transit)\s*(?:number|no\.?|num|#)?/i, value: String.raw`\d{9}`, hide: HIDDEN.routing },
  { label: /\b(?:swift|bic)(?:\s*(?:code|no\.?|number))?\b/i, value: String.raw`[A-Z]{6}[A-Z0-9]{2}(?:[A-Z0-9]{3})?`, hide: HIDDEN.swift },
  {
    label: new RegExp([
      String.raw`\b(?:bank\s+)?account\s*(?:number|no\.?|num|#)?`,
      String.raw`\bacct\.?\s*(?:number|no\.?|num|#)?`,
      String.raw`\ba\/c\s*(?:number|no\.?|num|#)?`,
      String.raw`\bnuban\b`,
      String.raw`\b(?:wallet|mobile[\s-]money)\s*(?:account|number|no\.?|id)`,
      String.raw`\b(?:m-?pesa|momo|mtn\s+momo|airtel\s+money|opay|palmpay|paga|kuda)\s+(?:account|wallet)(?:\s*(?:number|no\.?))?`,
    ].join('|'), 'i'),
    value: A_DIGIT_RUN,
    hide: HIDDEN.account,
    minDigits: 6,
  },
];

function hideTheLabelled(text: string): string {
  let out = text;
  for (const rule of LABELLED) {
    const re = new RegExp(`(${rule.label.source})(${BETWEEN})(${rule.value})(?![A-Za-z0-9])`, 'gi');
    out = out.replace(re, (whole, label: string, between: string, value: string) => {
      if (rule.minDigits && digitsOf(value).length < rule.minDigits) return whole;
      if (rule.hide === HIDDEN.iban && !passesTheIbanCheck(value)) return whole;
      if (rule.hide === HIDDEN.swift && value !== value.toUpperCase()) return whole;
      return `${label}${between}${rule.hide}`;
    });
  }
  return out;
}

/* An IBAN anywhere, labelled or not: its own check digits say what it is. */
function hideIbans(text: string): string {
  return text.replace(/\b[A-Z]{2}\d{2}(?:[ ]?[A-Z0-9]{4}){2,7}(?:[ ]?[A-Z0-9]{1,4})?\b/g, (m) => (passesTheIbanCheck(m) ? HIDDEN.iban : m));
}

/*
 * A card number anywhere: written the way cards are written, the right length for the network its
 * first digit names, the check digit right, and not somebody's phone.
 *
 * THE WAY CARDS ARE WRITTEN, because a sheet read as text is full of numbers one space apart
 * ("38000 12000 40000 5000"), and nineteen of those digits pass the check one time in ten. A card is
 * all in one run, or in fours (4-4-4-4, with a short last group), or 4-6-5 like Amex.
 */
const WRITTEN_LIKE_A_CARD = /(?<![\d+])(?:\d{13,19}|\d{4}([ -])\d{4}\1\d{4}\1\d{1,4}(?:\1\d{1,3})?|\d{4}([ -])\d{6}\2\d{4,5})(?!\d|[ -]\d)/g;
function theRightLengthForItsNetwork(digits: string): boolean {
  const n = digits.length;
  const first = digits[0];
  if (first === '4') return n === 13 || n === 16 || n === 19;
  if (first === '3') return n === 14 || n === 15;
  if (first === '2' || first === '5') return n === 16 || (first === '5' && n >= 17 && n <= 19);
  if (first === '6') return n >= 16 && n <= 19;
  return false;
}
function hideCards(text: string): string {
  return text.replace(WRITTEN_LIKE_A_CARD, (m: string, _a: string, _b: string, offset: number, whole: string) => {
    const digits = digitsOf(m);
    if (!theRightLengthForItsNetwork(digits) || !passesTheCardCheck(digits)) return m;
    const before = whole.slice(Math.max(0, offset - 30), offset);
    if (A_PHONE_BEFORE.test(before)) return m;
    return HIDDEN.card;
  });
}

/*
 * A TEN-DIGIT NUBAN ON A LINE THAT NAMES A BANK OR AN ACCOUNT BEFORE IT, as a Nigerian invoice writes
 * it: "Pay to Zenith Bank, 1012345678, Harbor Foods Ltd". Ten digits alone is also a phone number
 * with its 0 dropped, so the line has to say bank first.
 */
function hideNubansNextToABank(text: string): string {
  return text.replace(/(?<![\d+])\d{10}(?!\d)/g, (m, offset: number, whole: string) => {
    const lineStart = whole.lastIndexOf('\n', offset - 1) + 1;
    const before = whole.slice(Math.max(lineStart, offset - 60), offset);
    if (A_PHONE_BEFORE.test(before)) return m;
    /* "bank" without a word boundary in front, so "GTBank" and "Zenith Bank" both count. */
    return /(?:\b(?:account|acct|a\/c|nuban|beneficiary)\b|bank\b)/i.test(before) ? HIDDEN.account : m;
  });
}

/**
 * The text with every bank account, card and similar number replaced by a plain placeholder, and
 * everything else exactly as it was.
 */
export function withoutBankDetails(text: string): string;
export function withoutBankDetails(text: string | null | undefined): string | null | undefined;
export function withoutBankDetails(text: string | null | undefined): string | null | undefined {
  if (!text) return text;
  let out = hideTheLabelled(text);
  out = hideIbans(out);
  out = hideCards(out);
  out = hideNubansNextToABank(out);
  return out;
}

/**
 * AND THE SAME FOR A CONVERSATION PASTED INTO CONTEXT. The context chat is where a lead pastes a
 * plan, an invoice or a price list as text instead of attaching it, and every turn is handed to the
 * model and can be kept as a line of context. Each turn goes through the same function.
 */
export function withoutBankDetailsInEachTurn<T extends { content: string }>(turns: T[] | null | undefined): T[] {
  return (turns ?? []).map((t) => ({ ...t, content: withoutBankDetails(t?.content ?? '') }));
}

/**
 * AND EVERY STRING IN SOMETHING A PERSON TYPED, however it arrived: a setup's draft, the setup's
 * conversation, the answers it was committed with. The same function on each string and nothing
 * else changed, so a name, an address or a date comes through exactly as it was.
 */
export function withoutBankDetailsAnywhere<T>(value: T): T {
  if (typeof value === 'string') return withoutBankDetails(value) as unknown as T;
  if (Array.isArray(value)) return value.map((v) => withoutBankDetailsAnywhere(v)) as unknown as T;
  if (value && typeof value === 'object' && Object.getPrototypeOf(value) === Object.prototype) {
    return Object.fromEntries(Object.entries(value as Record<string, unknown>).map(([k, v]) => [k, withoutBankDetailsAnywhere(v)])) as T;
  }
  return value;
}
