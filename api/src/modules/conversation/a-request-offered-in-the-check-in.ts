import { theAnchorScenarioIsOn } from '../admin/what-is-hidden-at-release';
import { STARTED_FROM_THE_ANCHOR } from './the-anchor-weekly-check-in';
import { looksLikeARequest, shallITreatThisAs } from '../public-api/a-whatsapp-message-is-routed';

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
export type ARequestToOpen = { kind: 'leave' | 'spending'; suiteIsOn: boolean; says: string; button: string | null };

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

const isYes = (m: string) => /^\s*(yes|yeah|yep|sure|ok|okay|please)\b/i.test(m);

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
    const waiting = ((await prisma.workItem?.findMany?.({ where: { groundId: a.groundId, kind: 'request-offered', ownerParticipantId: a.participantId } })?.catch?.(() => [])) ?? []) as any[];
    for (const w of waiting) await prisma.workItem.delete({ where: { id: w.id } }).catch(() => undefined);
    if (waiting.length && isYes(a.message)) {
      const kind = waiting[0].name === 'spending' ? 'spending' : 'leave';
      const suite = a.organizationId
        ? await prisma.organizationSuite?.findUnique?.({ where: { organizationId_suite: { organizationId: a.organizationId, suite: SUITE_KEY[kind] } }, select: { isOn: true } })?.catch?.(() => null)
        : null;
      const open = whatTheYesOpens(kind, !!suite?.isOn);
      return { openTheRequest: open, sayFirst: open.says };
    }
    if (a.sessionComplete) return {};
    const kind = looksLikeARequest(a.message);
    if (kind !== 'leave' && kind !== 'spending') return {};
    await prisma.workItem.create({ data: { groundId: a.groundId, kind: 'request-offered', name: kind, ownerParticipantId: a.participantId } });
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
const SENT_ELSEWHERE = /\b(?:that(?:'|’)s|that is|this is|it(?:'|’)s|it is)\s+(?:a conversation|something|a question|a decision|one)\s+(?:you(?:'|’)d|you would|you(?:'|’)ll|you will)\s+(?:need|have)\s+to\s+(?:have|take up|raise|ask)\b|\byou(?:'|’)d (?:need|have) to (?:ask|speak (?:to|with)|talk (?:to|with)|check with|raise (?:it|this|that) with|take (?:it|this|that) up with)\b|\byou would (?:need|have) to (?:ask|speak (?:to|with)|talk (?:to|with)|check with|raise (?:it|this|that) with|take (?:it|this|that) up with)\b/i;

export function withoutACannotApprove(reply: string): { text: string; cut: string[] } {
  const cut: string[] = [];
  const paragraphs = String(reply ?? '').split(/\n{2,}/).map((p) => {
    const sentences = p.match(/[^.!?]+(?:[.!?]+["'”’)]*|$)/g) ?? [p];
    const kept = sentences.filter((s) => {
      const hit = CANNOT_APPROVE.test(s) || SENT_ELSEWHERE.test(s);
      if (hit) cut.push(s.trim());
      return !hit;
    });
    return kept.join('').trim();
  });
  return { text: paragraphs.filter(Boolean).join('\n\n'), cut };
}
