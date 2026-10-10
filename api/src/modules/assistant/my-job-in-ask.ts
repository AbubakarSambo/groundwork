import type { APart } from '../suites/correct-their-job';
import { PART_WORDS } from '../suites/correct-their-job';

/**
 * A PERSON ASKS ABOUT, OR CORRECTS, WHAT THEY TOLD US ABOUT THEIR JOB, IN ASK GROUNDWORK (decision 129).
 * Read by rules, for the person alone. A correction is said back and written only on a yes (decision 12). Their words are kept as typed.
 */
export const SHARE_KIND = 'role_correction';

const ASKS = /\b(?:what\s+(?:do\s+you|did\s+you|have\s+you)\s+(?:know|got|have|kept)\s+(?:about|on)\s+my\s+(?:role|job)|what\s+is\s+my\s+(?:role|job)(?:\s+(?:here|then))?\s*\??$|what\s+(?:have\s+i|did\s+i)\s+(?:told|tell|say|said)\s+you\s+about\s+my\s+(?:role|job)|show\s+me\s+(?:what\s+you\s+(?:know|have)\s+about\s+my\s+(?:role|job)|my\s+(?:role|job))|what\s+do\s+you\s+think\s+my\s+(?:role|job)\s+is)/i;
export const asksWhatWeKnowOfTheirJob = (m: string): boolean => ASKS.test((m ?? '').trim());

const CORRECTIONS: { part: APart; re: RegExp }[] = [
  { part: 'roleName', re: /^(?:please\s+)?(?:change|set|update|correct|make)\s+my\s+(?:role|job(?:\s+title)?)\s+(?:to|as|be)\s+(?:a\s+|an\s+|the\s+)?(.+)$/i },
  { part: 'roleName', re: /^my\s+(?:role|job(?:\s+title)?)\s+is\s+(?:now\s+|actually\s+)?(?:a\s+|an\s+|the\s+)?(.+)$/i },
  { part: 'owns', re: /^(?:please\s+)?(?:change|update|correct)\s+what\s+i\s+(?:own|am\s+responsible\s+for)\s+to\s+(.+)$/i },
  { part: 'owns', re: /^(?:i\s+(?:now|actually)\s+own|i(?:'m|\s+am)\s+(?:now|actually)\s+responsible\s+for)\s+(.+)$/i },
  { part: 'doingWell', re: /^(?:in\s+my\s+job,?\s+)?doing\s+well\s+(?:now\s+)?(?:looks\s+like|means|is)\s+(.+)$/i },
  { part: 'dependsOn', re: /^i\s+(?:now|actually)\s+(?:depend|rely)\s+on\s+(.+)$/i },
  { part: 'inTheWay', re: /^what\s+(?:usually\s+)?gets\s+in\s+my\s+way\s+(?:is|are)\s+(.+)$/i },
];

export function parseAJobCorrection(m: string): { part: APart; value: string } | null {
  const said = (m ?? '').trim().replace(/[.!]+$/, '');
  if (!said || said.length > 1100) return null;
  for (const { part, re } of CORRECTIONS) {
    const hit = re.exec(said);
    if (hit?.[1]?.trim()) return { part, value: hit[1].trim() };
  }
  return null;
}

const q = (t: string) => `"${t.replace(/["“”]/g, "'")}"`;

/** The change said back in a plain sentence, with their words quoted and not reworded. */
export function theCorrectionSaidBack(part: APart, value: string, old: string | null): string {
  if (part === 'roleName') return old ? `Shall I change your job from ${q(old)} to ${q(value)}?` : `Shall I record your job as ${q(value)}?`;
  const what = `what you ${PART_WORDS[part]}`;
  return old ? `Shall I change ${what} from ${q(old)} to ${q(value)}?` : `Shall I record ${what} as ${q(value)}?`;
}

export const NOTHING_KEPT_YET =
  'I do not have anything about your job yet. You can tell me now, for example "My job is sales representative" or "I own the Nairobi accounts". I will say it back to you before I keep it.';

/** What they told us, in plain sentences, in their own words. */
export function whatTheyToldUs(j: { roleName: string | null; owns: string | null; doingWell: string | null; dependsOn: string | null; dependedOnBy: string | null; inTheWay: string | null; roleMapShowsWhatYouOwn: boolean }): string {
  const lines: string[] = [];
  if (j.roleName) lines.push(`I have your job as ${q(j.roleName)}.`);
  if (j.owns) lines.push(`You told me you are responsible for ${q(j.owns)}.`);
  if (j.doingWell) lines.push(`You told me doing well looks like ${q(j.doingWell)}.`);
  if (j.dependsOn) lines.push(`You told me about who you depend on and who depends on you: ${q(j.dependsOn)}.`);
  if (j.dependedOnBy) lines.push(`You told me ${q(j.dependedOnBy)} depend on you.`);
  if (j.inTheWay) lines.push(`You told me what usually gets in your way is ${q(j.inTheWay)}.`);
  if (!lines.length) return NOTHING_KEPT_YET;
  lines.push(j.roleMapShowsWhatYouOwn ? 'The role map shows what you own. Everything else here is private to you.' : 'All of this is private to you, and the role map does not show it.');
  lines.push('To correct any of it, say for example "Change my job to account manager" or "I now own the Mombasa accounts", and I will say it back to you before I change anything.');
  return lines.join(' ');
}
