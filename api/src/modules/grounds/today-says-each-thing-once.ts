import type { Need } from './what-needs-you';

/**
 * ONE QUESTION, ONCE, NAMING EVERY CHECK-IN IT IS ABOUT (fix plan, pattern 6; quarter test, Grace's Today on 24 December). The first three of
 * her twenty things were "Do you want to drop a deal after 3 working days with no answer?", once for each check-in that had no rule yet,
 * and none said which. Items with the same words are one item now, and say the check-ins they are for. The first one's button is kept.
 */
export function eachQuestionOnce(needs: readonly Need[]): Need[] {
  const out: Need[] = [];
  const at = new Map<string, number>();
  for (const n of needs) {
    const key = `${n.kind}\u0000${n.title.trim().toLowerCase()}`;
    const i = at.get(key);
    if (i === undefined) { at.set(key, out.length); out.push(n); continue; }
    const kept = out[i] as Need & { alsoFor?: string[] };
    const labels = [...new Set([...(kept.alsoFor ?? (kept.checkInLabel ? [kept.checkInLabel] : [])), ...(n.checkInLabel ? [n.checkInLabel] : [])])];
    out[i] = { ...kept, alsoFor: labels, detail: [kept.detail?.replace(/\s*It is for [^.]*\.$/, ''), labels.length > 1 ? `It is for ${andList(labels)}.` : null].filter(Boolean).join(' ') || null } as Need;
  }
  return out;
}

const andList = (xs: string[]) => (xs.length <= 1 ? xs.join('') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`);

/**
 * A DIRECTION WHOSE DATE HAS PASSED ASKS WHAT IS NEXT (fix plan, pattern 4; quarter test, 20 November). The direction still said "Sell 120
 * water dispensers by 30 October, every sale proved" three weeks after that day, and nothing asked Grace what the company was aiming for
 * now. Once the day its aim names has passed, whoever may set the direction is asked, on Today.
 */
const MONTHS = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];
export function theDayAnAimIsBy(text: string, setAt: Date): Date | null {
  const t = String(text ?? '').toLowerCase();
  const m = /\bby\s+(?:the\s+)?(\d{1,2})(?:st|nd|rd|th)?\s+(?:of\s+)?([a-z]+)(?:\s+(\d{4}))?/.exec(t) ?? null;
  const n = m ? null : /\bby\s+([a-z]+)\s+(\d{1,2})(?:st|nd|rd|th)?(?:,?\s+(\d{4}))?/.exec(t);
  const [day, monthWord, yearWord] = m ? [m[1], m[2], m[3]] : n ? [n[2], n[1], n[3]] : [null, null, null];
  const month = monthWord ? MONTHS.indexOf(monthWord) : -1;
  if (!day || month < 0) return null;
  let year = yearWord ? Number(yearWord) : setAt.getUTCFullYear();
  /* Said in December for "by 31 January": next year's. */
  if (!yearWord && Date.UTC(year, month, Number(day)) < setAt.getTime() - 31 * 86_400_000) year += 1;
  return new Date(Date.UTC(year, month, Number(day), 23, 59, 59));
}

export function aDirectionPastItsDay(d: { now: any; setAt: Date } | null, organizationId: string, today: Date): Need | null {
  const aim = String(d?.now?.achieve ?? d?.now?.whatWeAreTryingToAchieve ?? '').trim();
  if (!d || !aim) return null;
  const by = theDayAnAimIsBy(aim, new Date(d.setAt));
  if (!by || by.getTime() >= today.getTime()) return null;
  const day = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'long', timeZone: 'UTC' }).format(by);
  return {
    key: 'direction-past-its-day',
    kind: 'decide',
    title: `The company’s aim was for ${day}, and that day has passed.`,
    detail: `The direction still says “${aim.replace(/[.\s]+$/, '')}”. Set what the company is aiming for now, so every team reads the new aim.`,
    action: { label: 'Set a new direction', to: '/direction' },
    groundId: '',
    organizationId,
  };
}
