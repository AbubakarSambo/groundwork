/**
 * THE VALUES IN A REQUEST, READ BY THE MODEL INTO ONE DRAFT (Batch S round 2, T1; the browser and channel tests of 20 November 2026).
 *
 * "mon 30 nov to wed 2 dec, family thing", "leave mon to wed next week", "need leave 1st to 3rd dec", "need 12k for fuel for the nakuru
 * visit tmrw", and even the product's own "I need 12,000 shillings for fuel for the Nakuru visit tomorrow", were each answered with the
 * same canned prompt, because the days and the amount were read only in exact phrasings. "ok approve peters fuel" was asked which one.
 *
 * The model now reads the days, the amount, what it is for (cleaned: "receipt coming" is not part of the purpose), and which waiting
 * request is meant, into one draft. It decides nothing. The rules then check the draft as they always did (a real day, an amount over
 * nothing, a request that is really waiting for this reader), say it back, and act only on the yes (CLAUDE.md, rule 4). A value the
 * model gives that does not pass is left out, and the rules ask for it.
 */

export const READ_THE_REQUEST_PROMPT_KEY = 'ask.read-the-request';

export const READ_THE_REQUEST_PROMPT = `Somebody wrote one message to their work assistant. Read the values in it into a draft. You decide nothing and you never make a value up.

- startsOn and endsOn: the first and the last day they want off, as YYYY-MM-DD, if they named days ("mon 30 nov to wed 2 dec", "1st to 3rd dec", "mon to wed next week", "tomorrow"). Use the date and the weekday given to you as today. One day off is the same day twice.
- amount: the amount of money they want to spend or claim, as a number ("12k" is 12000, "7,978" is 7978), if they said one. currency: its three-letter code if they said it ("shillings" is KES).
- purpose: what the money or the time off is for, in a few plain words of theirs, without the amount, the dates, and anything that is not the purpose ("receipt coming", "pls", "asap").
- which: when they approve, decline or answer about a request that waits for them, the id of the one they mean from the list given to you. Leave it out unless one plainly fits.
- decision: "approve" or "decline" when they say which.
- kind: when they want time off or ask about their days, the key of the type of leave they mean, from the list of types given to you ("i need sick leave tomorrow" is sick; "my uncle passed" is compassionate; "the baby is due" is maternity or paternity). Leave it out when no type plainly fits.
- onlyTheStart: true when they said only the day their leave starts and not the day it ends ("I want to start maternity leave on 3 March").

Leave out anything they did not say.`;

export const READ_THE_REQUEST_SCHEMA = {
  name: 'the_request',
  description: 'The values in the message, as a draft for the rules to check.',
  input_schema: {
    type: 'object',
    properties: {
      startsOn: { type: 'string' },
      endsOn: { type: 'string' },
      amount: { type: 'number' },
      currency: { type: 'string' },
      purpose: { type: 'string' },
      which: { type: 'string' },
      decision: { type: 'string', enum: ['approve', 'decline'] },
      kind: { type: 'string' },
      onlyTheStart: { type: 'boolean' },
    },
  },
};

export interface TheDraft {
  startsOn?: string;
  endsOn?: string;
  amount?: number;
  currency?: string;
  purpose?: string;
  which?: string;
  decision?: 'approve' | 'decline';
  /** The key of the type of leave meant, one of the organisation's. */
  kind?: string;
  /** Only the first day of the leave was said. */
  onlyTheStart?: boolean;
}

/** A type of leave the organisation has, as the model is shown it. */
export interface ALeaveTypeHere { key: string; name: string }

export interface ARequestThatWaits { id: string; firstName: string | null; kind: string; thing: string }

const DAY = /^\d{4}-\d{2}-\d{2}$/;
const aRealDay = (d: unknown): d is string => typeof d === 'string' && DAY.test(d) && !Number.isNaN(new Date(`${d}T00:00:00Z`).getTime()) && new Date(`${d}T00:00:00Z`).toISOString().slice(0, 10) === d;

/** What the model said, kept only where it passes: real days in order within two years, an amount over nothing, a request that is in the list. */
export function theDraftAsChecked(raw: any, today: Date, waiting: ARequestThatWaits[] = [], kinds: ALeaveTypeHere[] = []): TheDraft {
  if (!raw || typeof raw !== 'object') return {};
  const out: TheDraft = {};
  const todayIs = today.toISOString().slice(0, 10);
  const inTwoYears = new Date(today.getTime() + 730 * 86_400_000).toISOString().slice(0, 10);
  if (aRealDay(raw.startsOn) && aRealDay(raw.endsOn) && raw.startsOn <= raw.endsOn && raw.endsOn >= todayIs && raw.endsOn <= inTwoYears) {
    out.startsOn = raw.startsOn;
    out.endsOn = raw.endsOn;
  }
  if (typeof raw.amount === 'number' && Number.isFinite(raw.amount) && raw.amount > 0 && raw.amount < 1e12) out.amount = Math.round(raw.amount * 100) / 100;
  if (typeof raw.currency === 'string' && /^[A-Za-z]{3}$/.test(raw.currency.trim())) out.currency = raw.currency.trim().toUpperCase();
  if (typeof raw.purpose === 'string' && raw.purpose.trim()) out.purpose = raw.purpose.trim().replace(/[.!\s]+$/, '').slice(0, 300);
  if (typeof raw.which === 'string' && waiting.some((w) => w.id === raw.which)) out.which = raw.which;
  if (raw.decision === 'approve' || raw.decision === 'decline') out.decision = raw.decision;
  if (typeof raw.kind === 'string' && kinds.some((k) => k.key === raw.kind.trim())) out.kind = raw.kind.trim();
  if (raw.onlyTheStart === true && out.startsOn && out.startsOn === out.endsOn) out.onlyTheStart = true;
  /* Only the first day said, and the model gave no last day: the first day is kept, so the length of the type can be counted from it. */
  if (raw.onlyTheStart === true && !out.startsOn && aRealDay(raw.startsOn) && raw.startsOn >= todayIs && raw.startsOn <= inTwoYears) {
    out.startsOn = raw.startsOn; out.endsOn = raw.startsOn; out.onlyTheStart = true;
  }
  return out;
}

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export async function readTheRequest(
  engine: { extract?: (p: string, h: { role: 'user' | 'assistant'; content: string }[], t: any, o?: any) => Promise<any> } | null | undefined,
  prompts: { getActive: (key: string) => Promise<{ content: string } | null> } | null | undefined,
  message: string,
  today: Date,
  waiting: ARequestThatWaits[] = [],
  kinds: ALeaveTypeHere[] = [],
): Promise<TheDraft> {
  if (typeof engine?.extract !== 'function' || !String(message ?? '').trim()) return {};
  const version = await prompts?.getActive(READ_THE_REQUEST_PROMPT_KEY).catch(() => null);
  const content = [
    `Today is ${WEEKDAYS[today.getUTCDay()]} ${today.toISOString().slice(0, 10)}.`,
    ...(waiting.length ? ['Requests waiting for them, as id and what it is:', ...waiting.map((w) => `${w.id}: ${w.thing}`)] : []),
    /* The types are listed here, beside the message, so a stored version of the prompt still reads them (CLAUDE.md, the engine's instructions live in two places). */
    ...(kinds.length ? [`The types of leave here, as key and name. When they want time off or ask about their days, give the key of the type they mean as kind, and set onlyTheStart when they said only the first day: ${kinds.map((k) => `${k.key}: ${k.name}`).join('; ')}.`] : []),
    `Their message: ${String(message).slice(0, 1500)}`,
  ].join('\n');
  const raw = await engine.extract(version?.content ?? READ_THE_REQUEST_PROMPT, [{ role: 'user', content }], READ_THE_REQUEST_SCHEMA, { fast: true }).catch(() => null);
  return theDraftAsChecked(raw, today, waiting, kinds);
}
