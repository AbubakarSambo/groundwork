import { theAnchorScenarioIsOn, theRequestOfferIsShown } from '../admin/what-is-hidden-at-release';
import { STARTED_FROM_THE_ANCHOR } from './the-anchor-weekly-check-in';
import { looksLikeARequest, shallITreatThisAs } from '../public-api/a-whatsapp-message-is-routed';
import { readLeaveDates, soundsLikeLeave } from '../suites/leave-said-in-chat';
import { readSpending } from '../suites/spend-said-in-chat';

/**
 * A REQUEST OFFERED IN THE CHECK-IN (anchor pieces 26 and 27; section 22; decision 105 item 4).
 *
 * When a person says in their anchor check-in that they want leave, or that they need money approved, Groundwork offers
 * the request there, as WhatsApp already does: the same reading of their words (`looksLikeARequest`, which only takes a
 * request said in their own words, never "I was on leave on Monday"), and the same one question in Hafsah's words,
 * "Shall I treat this as a leave request?". Their yes is answered with the spec's sentence and a way to the request
 * form; their no, or carrying on, leaves nothing. Nothing is filed for them: the request is made on its own form, by
 * them, so a date or a sum is never guessed.
 *
 * NO MODEL AND NO PROMPT. The reading is the deterministic one WhatsApp uses, so nothing the model is told changes.
 * Only for a check-in started from the anchor link, only while the anchor switch is on.
 *
 * The section 22 sentences, in the spec's words:
 *  - leave on: "You can submit that through Leave here and it'll appear on your manager's board." Request leave.
 *  - leave off: "Your organisation also has the option to manage leave through Groundwork."
 *  - spending on: "I can turn that into a payment request so it appears on the appropriate board." Create request.
 *  - spending off: the same sentence as leave off, for spending.
 * Hours are not in section 22, so an hours request is not offered here.
 */
export type ARequestOffer = { kind: 'leave' | 'spending'; question: string; yes: string; no: string };
/**
 * WHAT THE FORM IS FILLED IN WITH (request 165). Only what was read from the person's own words, and only where it was read:
 * a day that could not be read without guessing, or an amount with no reason, leaves that field out. Nothing is ever guessed.
 * Leave: `startsOn` and `endsOn`. Spending: `amount`, `what` and `currency` (the one they wrote, never the organisation's).
 */
export type ThePrefill = { startsOn?: string; endsOn?: string; amount?: number; what?: string; currency?: string };
export type ARequestToOpen = { kind: 'leave' | 'spending'; suiteIsOn: boolean; says: string; button: string | null; prefill?: ThePrefill };

/** What the person's own words give for the form: read by the same rules the chat uses, never by a model. */
export function thePrefillFromTheirWords(kind: 'leave' | 'spending', message: string, today: Date = new Date()): ThePrefill {
  if (kind === 'leave') {
    const days = readLeaveDates(message, today);
    return days ? { startsOn: days.startsOn, endsOn: days.endsOn } : {};
  }
  const read = readSpending(message, null);
  if (read.kind === 'ok') return { amount: read.said.amount, what: read.said.what, ...(read.said.currency ? { currency: read.said.currency } : {}) };
  if (read.kind === 'ask' && read.purpose) return { amount: read.purpose.amount, ...(read.purpose.currency ? { currency: read.purpose.currency } : {}) };
  /* "I need 15,000 shillings approved for fuel for the van this week" is offered, and is not said with the word spend: its sum and its reason are read here. */
  return theSumAskedFor(message);
}

const CODES: Record<string, string> = { kes: 'KES', ksh: 'KES', usd: 'USD', ngn: 'NGN', ghs: 'GHS', gbp: 'GBP', eur: 'EUR', zar: 'ZAR', '$': 'USD', '£': 'GBP', '€': 'EUR', '₦': 'NGN' };
/**
 * A SUM ASKED FOR WITHOUT THE WORD "SPEND": one amount, and what it is for when "for" follows it. Only what is there: no amount, or more than one,
 * gives nothing; a reason is read only after "for"; and a currency is kept only when the person wrote its code or sign, never from "shillings" alone,
 * because shillings are three countries'.
 */
export function theSumAskedFor(message: string): ThePrefill {
  const t = (message ?? '').trim();
  const money = [...t.matchAll(/(?:(KES|KSh|Ksh|USD|NGN|GHS|GBP|EUR|ZAR|\$|£|€|₦)\s?)?(\d[\d,]*(?:\.\d+)?)\s*(k|thousand|million|m)?\b(?:\s*(shillings?|bob|naira|dollars?|pounds?|euros?|cedis?|rand|KES|KSh|USD|NGN|GHS))?/gi)]
    .filter((m) => m[1] || m[3] || m[4] || /\d{4,}|\d,\d{3}/.test(m[2]));
  if (money.length !== 1) return {};
  const m = money[0];
  const base = Number(m[2].replace(/,/g, ''));
  const unit = (m[3] ?? '').toLowerCase();
  const amount = base * (unit === 'k' || unit === 'thousand' ? 1_000 : unit === 'm' || unit === 'million' ? 1_000_000 : 1);
  if (!Number.isFinite(amount) || amount <= 0 || amount > 1e12) return {};
  const code = CODES[(m[1] ?? m[4] ?? '').toLowerCase()];
  const after = t.slice((m.index ?? 0) + m[0].length);
  const reason = /\b(?:approved\s+)?for\s+([^.?!]+)/i.exec(after)?.[1]?.trim().replace(/\s+/g, ' ');
  return { amount, ...(reason ? { what: reason } : {}), ...(code ? { currency: code } : {}) };
}

const YES = 'Yes';
const NO = 'No';
const SUITE_KEY = { leave: 'leave', spending: 'spend' } as const;

export function whatTheYesOpens(kind: 'leave' | 'spending', suiteIsOn: boolean): ARequestToOpen {
  if (kind === 'leave') {
    return suiteIsOn
      ? { kind, suiteIsOn, says: "You can submit that through Leave here and it'll appear on your manager's board.", button: 'Request leave' }
      : { kind, suiteIsOn, says: 'Your organisation also has the option to manage leave through Groundwork.', button: null };
  }
  return suiteIsOn
    ? { kind, suiteIsOn, says: 'I can turn that into a payment request so it appears on the appropriate board.', button: 'Create request' }
    : { kind, suiteIsOn, says: 'Your organisation also has the option to manage spending requests through Groundwork.', button: null };
}

/**
 * WHAT KIND OF REQUEST THEIR WORDS ARE, IF ANY. The reading WhatsApp uses first; and for leave, also somebody asking for a day off the way people say it
 * ("Can I take Friday off next week?", "I need Monday off"), which that reading misses because it wants the word "leave" or "day off". Asking is
 * still required ("can I", "I need", "please"), so "I was on leave on Monday" is a thing they tell their check-in, never an offer.
 */
const AN_ASK = /\b(?:(?:can|could|may)\s+i|i\s+(?:want|need|would\s+like|wish)|i'd\s+like|please|request|apply\s+for)\b/i;
export function theKindOfRequest(message: string): 'leave' | 'spending' | null {
  const read = looksLikeARequest(message);
  if (read === 'leave' || read === 'spending') return read;
  if (read === 'hours') return null;
  return AN_ASK.test(message) && soundsLikeLeave(message) ? 'leave' : null;
}

const isYes = (m: string) => /^\s*(yes|yeah|yep|sure|ok|okay|please)\b/i.test(m);
const isNo = (m: string) => /^\s*(no|nope|nah|not now|no thanks|no thank you)\b/i.test(m);

/**
 * WHETHER THEIR WORDS ARE THE YES (OR NO) TO AN OFFER OF A REQUEST THAT IS WAITING FOR ONE (known issue B12; screens request 168 item 6).
 * Read only, and ahead of the model's reply being judged: "Yes" to "Shall I treat this as a payment request?" is not the person
 * saying they are done, but the model took it for that and said "Okay. That's all for today.", which closed the check-in. A yes or a
 * no to an offer waiting never closes it.
 */
export async function theyAreAnsweringAnOffer(
  prisma: any,
  a: { groundId: string; startedFrom?: string | null; participantId: string | null; message: string },
): Promise<boolean> {
  try {
    if (a.startedFrom !== STARTED_FROM_THE_ANCHOR || !a.participantId) return false;
    if (!(await theAnchorScenarioIsOn(prisma)) || !(await theRequestOfferIsShown(prisma))) return false;
    if (!isYes(a.message) && !isNo(a.message)) return false;
    const waiting = ((await prisma.workItem?.findMany?.({ where: { groundId: a.groundId, kind: 'request-offered', ownerParticipantId: a.participantId } })?.catch?.(() => [])) ?? []) as any[];
    return waiting.length > 0;
  } catch {
    return false;
  }
}

/**
 * After the person's turn: a yes to the offer waiting opens the request, anything else leaves nothing, and a request in
 * what they just wrote is offered. Never throws; the check-in never fails over this.
 */
export async function aRequestAfterTheirTurn(
  prisma: any,
  a: { groundId: string; organizationId: string | null; startedFrom?: string | null; participantId: string | null; message: string; sessionComplete?: boolean },
): Promise<{ requestOffer?: ARequestOffer; openTheRequest?: ARequestToOpen; sayFirst?: string }> {
  try {
    if (a.startedFrom !== STARTED_FROM_THE_ANCHOR || !a.participantId) return {};
    if (!(await theAnchorScenarioIsOn(prisma))) return {};
    /* Hidden at release until the form's routes exist (request 165): no offer is made, and nothing is kept. */
    if (!(await theRequestOfferIsShown(prisma))) return {};
    const waiting = ((await prisma.workItem?.findMany?.({ where: { groundId: a.groundId, kind: 'request-offered', ownerParticipantId: a.participantId } })?.catch?.(() => [])) ?? []) as any[];
    for (const w of waiting) await prisma.workItem.delete({ where: { id: w.id } }).catch(() => undefined);
    if (waiting.length && isYes(a.message)) {
      const kind = waiting[0].name === 'spending' ? 'spending' : 'leave';
      const suite = a.organizationId
        ? await prisma.organizationSuite?.findUnique?.({ where: { organizationId_suite: { organizationId: a.organizationId, suite: SUITE_KEY[kind] } }, select: { isOn: true } })?.catch?.(() => null)
        : null;
      const open = whatTheYesOpens(kind, !!suite?.isOn);
      /* The form is filled in only when it opens: with the suite off there is no form. */
      const prefill = (waiting[0].fields as { prefill?: ThePrefill } | null)?.prefill;
      const filled = suite?.isOn && prefill && Object.keys(prefill).length ? { ...open, prefill } : open;
      return { openTheRequest: filled, sayFirst: open.says };
    }
    if (a.sessionComplete) return {};
    const kind = theKindOfRequest(a.message);
    if (!kind) return {};
    /* NEVER OFFERED WHILE THE SUITE IS OFF (known issue B12; screens request 168 item 7). There is no form to open and nothing to submit it to, so
       an offer here promised something that was not there, and its yes could only say "Your organisation also has the option...". */
    const suiteHere = a.organizationId
      ? await prisma.organizationSuite?.findUnique?.({ where: { organizationId_suite: { organizationId: a.organizationId, suite: SUITE_KEY[kind] } }, select: { isOn: true } })?.catch?.(() => null)
      : null;
    if (!suiteHere?.isOn) return {};
    const prefill = thePrefillFromTheirWords(kind, a.message);
    await prisma.workItem.create({ data: { groundId: a.groundId, kind: 'request-offered', name: kind, ownerParticipantId: a.participantId, ...(Object.keys(prefill).length ? { fields: { prefill } } : {}) } });
    return { requestOffer: { kind, question: shallITreatThisAs(kind), yes: YES, no: NO } };
  } catch {
    return {};
  }
}

/*
 * THE REPLY NEVER CONTRADICTS THE OFFER (review of pieces 26 and 27). With the offer to ask for the leave attached, the
 * model's own reply said "I can't directly approve time off. That's a conversation you'd need to have with Rukia." and
 * "I can't approve that request directly." The offer under it is how they ask, so a sentence that says Groundwork
 * cannot approve it, or that sends them to somebody else for it, is taken off the reply. Read-side and narrow: only
 * while an offer or the request's own form is attached, and only those sentences.
 */
const CANNOT_APPROVE = /\b(?:I|we|Groundwork)\s+(?:can(?:'|’)?t|cannot|can not|am not able to|are not able to|is not able to|am unable to|are unable to|don(?:'|’)t have the (?:power|authority) to)\s+(?:\w+\s+){0,2}?(?:approve|grant|authori[sz]e|sign off|okay|ok)\b/i;
/* The other wording of the same refusal: "I can't directly help with time off requests." (screens request 168 item 7, known issue B12). */
/* The thing refused is the object of the refusal, a few words on ("help with time off requests", "assist with annual leave"), never any later word in the
   sentence: "I don't manage your calendar, so tell me when your leave starts" and "We cannot support the client until the payment terms are agreed" stay. */
const CANNOT_HELP_WITH_IT = /\b(?:I|we|Groundwork)\s+(?:can(?:'|’)?t|cannot|can not|am not able to|are not able to|am unable to|are unable to|don(?:'|’)t|do not)\s+(?:\w+\s+){0,2}?(?:help|assist|handle|deal|process|manage|take care|do anything|support)\b(?:\s+(?:you|with|about|of|for|on|your|the|a|any|these|those|this|that|such|their|my|our|directly|requests?|for))*\s+(?:annual |sick )?(?:leave|time off|day off|days off|holiday|holidays|vacation|spending|expenses?|payments?)\b/i;
const SENT_ELSEWHERE = /\b(?:that(?:'|’)s|that is|this is|it(?:'|’)s|it is)\s+(?:a conversation|something|a question|a decision|one)\s+(?:you(?:'|’)d|you would|you(?:'|’)ll|you will)\s+(?:need|have)\s+to\s+(?:have|take up|raise|ask)\b|\byou(?:'|’)d (?:need|have) to (?:ask|speak (?:to|with)|talk (?:to|with)|check with|raise (?:it|this|that) with|take (?:it|this|that) up with)\b|\byou would (?:need|have) to (?:ask|speak (?:to|with)|talk (?:to|with)|check with|raise (?:it|this|that) with|take (?:it|this|that) up with)\b/i;

export function withoutACannotApprove(reply: string): { text: string; cut: string[] } {
  const cut: string[] = [];
  const paragraphs = String(reply ?? '').split(/\n{2,}/).map((p) => {
    const sentences = p.match(/[^.!?]+(?:[.!?]+["'”’)]*|$)/g) ?? [p];
    const kept = sentences.filter((s) => {
      const hit = CANNOT_APPROVE.test(s) || CANNOT_HELP_WITH_IT.test(s) || SENT_ELSEWHERE.test(s);
      if (hit) cut.push(s.trim());
      return !hit;
    });
    return kept.join('').trim();
  });
  return { text: paragraphs.filter(Boolean).join('\n\n'), cut };
}


/*
 * NO PROMISE TO PASS A REQUEST ON, WHERE NOTHING WILL (known issue B12; screens request 167 item 4).
 *
 * With the request offer hidden at release, an anchor check-in's reply said "I'll pass that leave request to Halima." and nothing was
 * passed on. Where no offer or form is attached to the reply, a sentence that says Groundwork will pass, send or forward a leave or
 * spending request on is taken off, because nothing here does. Read-side and narrow: only that promise, only in an anchor check-in.
 */
const A_PROMISE_TO_PASS_IT_ON = /\b(?:I(?:'|’)ll|I will|I(?:'|’)m going to|I am going to|let me|I can)\s+(?:pass|send|forward|hand|take|raise|put|log|file|submit)\b[^.!?\n]*\b(?:leave|time off|day off|days off|holiday|vacation|spending|payment|expense|request)\b[^.!?\n]*[.!?]?/i;
export function withoutAPromiseToPassItOn(reply: string): { text: string; cut: string[] } {
  const cut: string[] = [];
  const paragraphs = String(reply ?? '').split(/\n{2,}/).map((p) => {
    const sentences = p.match(/[^.!?]+(?:[.!?]+["'”’)]*|$)/g) ?? [p];
    return sentences.filter((s) => { const hit = A_PROMISE_TO_PASS_IT_ON.test(s); if (hit) cut.push(s.trim()); return !hit; }).join('').trim();
  });
  return { text: paragraphs.filter(Boolean).join('\n\n'), cut };
}
