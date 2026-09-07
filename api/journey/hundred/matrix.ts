/**
 * ONE HUNDRED FIRST JOURNEYS.
 *
 * The question every one of these asks is the same: can this person get from their situation to a
 * report they understand, without guessing, backtracking, re-entering anything, hunting for a link,
 * or needing somebody from Groundwork to explain what to do.
 *
 * They are permutations across entry route, authentication, organisation state, role, setup method,
 * scenario, chat behaviour, documents, participant mix and report kind — not one happy path wearing
 * a hundred hats. Admin journeys run first, because everything else depends on somebody having set
 * something up.
 *
 * PASS means the intended first report was actually reached. PASS WITH FRICTION means it was
 * reached and something cost the person effort they should not have spent. FAIL names the step
 * where it became impossible to continue.
 */

export type Persona =
  | 'org admin' | 'lead' | 'registered participant' | 'new participant' | 'external participant';

export type Entry = 'entry chat' | 'marketing' | 'direct /start' | 'signed-in nav' | 'invite email' | 'join link';
export type Auth = 'email + password' | 'magic link' | 'google' | 'already signed in' | 'none yet';
export type OrgState = 'brand new' | 'existing, admin' | 'existing, member' | 'guest elsewhere';
export type Setup = 'scenario card' | 'describe your own' | 'suggested route' | 'chat-led' | 'document first' | 'API';
export type DocState = 'none' | 'one, up front' | 'one, later' | 'two, overlapping' | 'two, contradictory' | 'replaced' | 'unreadable';
export type Mix = 'solo' | 'one registered' | 'one unregistered' | 'one external' | 'mixed' | 'many' | 'lead runs it';

export interface Journey {
  id: number;
  persona: Persona;
  entry: Entry;
  auth: Auth;
  org: OrgState;
  setup: Setup;
  scenario: string;
  /** The conversational behaviour under test — how a real person actually talks. */
  behaviour: string;
  docs: DocState;
  mix: Mix;
  /** What reaching the end means for this person. */
  wants: 'shared report' | 'individual report' | 'both' | 'setup only';
  /** Anything this journey deliberately does mid-flight. */
  twist?: string;
}

const j = (
  id: number, persona: Persona, entry: Entry, auth: Auth, org: OrgState, setup: Setup,
  scenario: string, behaviour: string, docs: DocState, mix: Mix,
  wants: Journey['wants'], twist?: string,
): Journey => ({ id, persona, entry, auth, org, setup, scenario, behaviour, docs, mix, wants, twist });

export const JOURNEYS: Journey[] = [
  // ── 1-30 · organisation admin, first, because everything else depends on them ──────────────
  j(1,  'org admin', 'entry chat', 'magic link', 'brand new', 'chat-led', 'NEW_HIRE', 'a clear paragraph', 'none', 'one unregistered', 'both'),
  j(2,  'org admin', 'entry chat', 'magic link', 'brand new', 'chat-led', 'NEW_PROJECT', 'one sentence, nothing else', 'none', 'one unregistered', 'both'),
  j(3,  'org admin', 'entry chat', 'magic link', 'brand new', 'chat-led', 'DRIFT', 'six paragraphs at once', 'none', 'mixed', 'both'),
  j(4,  'org admin', 'entry chat', 'magic link', 'brand new', 'chat-led', 'OPEN_READ', 'vague, no situation named', 'none', 'one unregistered', 'both'),
  j(5,  'org admin', 'entry chat', 'magic link', 'brand new', 'chat-led', 'REALIGN_TEAM', 'answers a different question than the one asked', 'none', 'many', 'both'),
  j(6,  'org admin', 'entry chat', 'magic link', 'brand new', 'chat-led', 'NEW_HIRE', 'asks the assistant questions instead of answering', 'none', 'one unregistered', 'setup only'),
  j(7,  'org admin', 'entry chat', 'magic link', 'brand new', 'chat-led', 'NEW_PROJECT', 'changes their mind about the situation', 'none', 'one unregistered', 'both'),
  j(8,  'org admin', 'entry chat', 'magic link', 'brand new', 'chat-led', 'NEW_HIRE', 'corrects a name they gave earlier', 'none', 'one unregistered', 'both'),
  j(9,  'org admin', 'entry chat', 'magic link', 'brand new', 'chat-led', 'CONTRACT_REVIEW', 'contradicts themselves two turns apart', 'none', 'one external', 'both'),
  j(10, 'org admin', 'entry chat', 'magic link', 'brand new', 'chat-led', 'IMPLEMENTATION_TRACKING', 'uses words the product does not use', 'none', 'one external', 'both'),
  j(11, 'org admin', 'entry chat', 'magic link', 'brand new', 'chat-led', 'NEW_PROJECT', 'adds a participant after the list looked finished', 'none', 'mixed', 'both'),
  j(12, 'org admin', 'entry chat', 'magic link', 'brand new', 'chat-led', 'NEW_PROJECT', 'removes a participant they already named', 'none', 'mixed', 'both'),
  j(13, 'org admin', 'entry chat', 'magic link', 'brand new', 'chat-led', 'NEW_HIRE', 'leaves halfway and comes back', 'none', 'one unregistered', 'both', 'abandons, returns via the same browser'),
  j(14, 'org admin', 'entry chat', 'magic link', 'brand new', 'chat-led', 'NEW_HIRE', 'refreshes mid-conversation', 'none', 'one unregistered', 'both', 'hard refresh at turn 4'),
  j(15, 'org admin', 'entry chat', 'google', 'brand new', 'chat-led', 'NEW_PROJECT', 'a clear paragraph', 'none', 'one unregistered', 'both', 'authenticates with Google halfway'),
  j(16, 'org admin', 'entry chat', 'email + password', 'brand new', 'chat-led', 'NEW_HIRE', 'a clear paragraph', 'none', 'one unregistered', 'both'),
  j(17, 'org admin', 'entry chat', 'already signed in', 'existing, admin', 'chat-led', 'PULSE_CHECK', 'a clear paragraph', 'none', 'many', 'both'),
  j(18, 'org admin', 'direct /start', 'magic link', 'brand new', 'describe your own', 'OPEN_READ', 'their own words, no card', 'none', 'one unregistered', 'both'),
  j(19, 'org admin', 'marketing', 'magic link', 'brand new', 'scenario card', 'NEW_HIRE', 'picks a card and types nothing', 'none', 'one unregistered', 'both'),
  j(20, 'org admin', 'signed-in nav', 'already signed in', 'existing, admin', 'scenario card', 'ROLE_HANDOVER', 'straight through the wizard', 'none', 'one registered', 'both'),
  j(21, 'org admin', 'signed-in nav', 'already signed in', 'existing, admin', 'scenario card', 'PIP', 'straight through the wizard', 'none', 'one registered', 'both'),
  j(22, 'org admin', 'entry chat', 'magic link', 'brand new', 'document first', 'CONTRACT_REVIEW', 'uploads before saying anything', 'one, up front', 'one external', 'both'),
  j(23, 'org admin', 'entry chat', 'magic link', 'brand new', 'chat-led', 'NEW_PROJECT', 'explains, then uploads', 'one, later', 'one unregistered', 'both'),
  j(24, 'org admin', 'entry chat', 'magic link', 'brand new', 'document first', 'IMPLEMENTATION_TRACKING', 'a contract with parties, dates and terms in it', 'one, up front', 'one external', 'both'),
  j(25, 'org admin', 'entry chat', 'magic link', 'brand new', 'document first', 'NEW_HIRE', 'a job description', 'one, up front', 'one unregistered', 'both'),
  j(26, 'org admin', 'entry chat', 'magic link', 'brand new', 'document first', 'NEW_PROJECT', 'two documents that overlap', 'two, overlapping', 'mixed', 'both'),
  j(27, 'org admin', 'entry chat', 'magic link', 'brand new', 'document first', 'CONTRACT_REVIEW', 'two documents that disagree', 'two, contradictory', 'one external', 'both'),
  j(28, 'org admin', 'entry chat', 'magic link', 'brand new', 'document first', 'NEW_PROJECT', 'says something the document contradicts', 'one, up front', 'one unregistered', 'both'),
  j(29, 'org admin', 'entry chat', 'magic link', 'brand new', 'document first', 'NEW_HIRE', 'uploads the wrong file and replaces it', 'replaced', 'one unregistered', 'both'),
  j(30, 'org admin', 'entry chat', 'magic link', 'brand new', 'document first', 'NEW_PROJECT', 'uploads something unreadable', 'unreadable', 'one unregistered', 'setup only'),

  // ── 31-45 · admin, authentication and context preservation across the seam ────────────────
  j(31, 'org admin', 'entry chat', 'magic link', 'brand new', 'chat-led', 'NEW_HIRE', 'a clear paragraph', 'one, up front', 'one unregistered', 'both', 'document survives the magic link'),
  j(32, 'org admin', 'entry chat', 'google', 'brand new', 'chat-led', 'NEW_PROJECT', 'a clear paragraph', 'one, up front', 'mixed', 'both', 'document + participants survive Google'),
  j(33, 'org admin', 'entry chat', 'magic link', 'existing, admin', 'chat-led', 'DRIFT', 'a clear paragraph', 'none', 'one registered', 'both', 'signs in to an account that already exists'),
  j(34, 'org admin', 'entry chat', 'magic link', 'brand new', 'chat-led', 'NEW_HIRE', 'a clear paragraph', 'none', 'one unregistered', 'both', 'opens the link on a different device'),
  j(35, 'org admin', 'entry chat', 'magic link', 'brand new', 'chat-led', 'NEW_HIRE', 'a clear paragraph', 'none', 'one unregistered', 'both', 'opens the link a day late'),
  j(36, 'org admin', 'entry chat', 'magic link', 'brand new', 'chat-led', 'NEW_HIRE', 'a clear paragraph', 'none', 'one unregistered', 'both', 'clicks the link twice'),
  j(37, 'org admin', 'entry chat', 'magic link', 'brand new', 'chat-led', 'NEW_PROJECT', 'a clear paragraph', 'none', 'one unregistered', 'both', 'renames the check-in after the email is sent'),
  j(38, 'org admin', 'signed-in nav', 'already signed in', 'existing, admin', 'scenario card', 'NEW_PROJECT', 'straight through', 'none', 'mixed', 'both', 'reloads the wizard at step seven'),
  j(39, 'org admin', 'signed-in nav', 'already signed in', 'existing, admin', 'scenario card', 'NEW_HIRE', 'straight through', 'none', 'one unregistered', 'both', 'goes back two steps and changes the brief'),
  j(40, 'org admin', 'signed-in nav', 'already signed in', 'existing, admin', 'scenario card', 'NEW_PROJECT', 'straight through', 'none', 'one unregistered', 'setup only', 'types an address with a typo'),
  j(41, 'org admin', 'signed-in nav', 'already signed in', 'existing, admin', 'scenario card', 'NEW_PROJECT', 'straight through', 'none', 'mixed', 'both', 'adds the same person twice'),
  j(42, 'org admin', 'signed-in nav', 'already signed in', 'existing, admin', 'scenario card', 'NEW_PROJECT', 'straight through', 'none', 'one registered', 'both', 'invites somebody already on another check-in'),
  j(43, 'org admin', 'signed-in nav', 'already signed in', 'existing, admin', 'scenario card', 'NEW_HIRE', 'straight through', 'none', 'solo', 'individual report', 'sets one up for themselves alone'),
  j(44, 'org admin', 'signed-in nav', 'already signed in', 'existing, admin', 'scenario card', 'NEW_PROJECT', 'straight through', 'none', 'lead runs it', 'shared report', 'hands it to a lead and does not take part'),
  j(45, 'org admin', 'signed-in nav', 'already signed in', 'existing, admin', 'suggested route', 'CONTRACT_REVIEW', 'follows what the product suggested', 'one, up front', 'one external', 'both'),

  // ── 46-60 · the check-in itself, as the admin who is also a party ─────────────────────────
  j(46, 'org admin', 'signed-in nav', 'already signed in', 'existing, admin', 'scenario card', 'NEW_HIRE', 'short answers throughout', 'none', 'one registered', 'both'),
  j(47, 'org admin', 'signed-in nav', 'already signed in', 'existing, admin', 'scenario card', 'NEW_HIRE', 'very long answers', 'none', 'one registered', 'both'),
  j(48, 'org admin', 'signed-in nav', 'already signed in', 'existing, admin', 'scenario card', 'DRIFT', 'ambiguous answers', 'none', 'one registered', 'both'),
  j(49, 'org admin', 'signed-in nav', 'already signed in', 'existing, admin', 'scenario card', 'DRIFT', 'contradicts an earlier answer', 'none', 'one registered', 'both'),
  j(50, 'org admin', 'signed-in nav', 'already signed in', 'existing, admin', 'scenario card', 'NEW_HIRE', 'asks whether their answers are private', 'none', 'one registered', 'both'),
  j(51, 'org admin', 'signed-in nav', 'already signed in', 'existing, admin', 'scenario card', 'NEW_HIRE', 'refuses to answer one question', 'none', 'one registered', 'both'),
  j(52, 'org admin', 'signed-in nav', 'already signed in', 'existing, admin', 'scenario card', 'NEW_HIRE', 'leaves halfway through the check-in', 'none', 'one registered', 'both', 'returns the next day'),
  j(53, 'org admin', 'signed-in nav', 'already signed in', 'existing, admin', 'scenario card', 'NEW_HIRE', 'refreshes mid-check-in', 'none', 'one registered', 'both'),
  j(54, 'org admin', 'signed-in nav', 'already signed in', 'existing, admin', 'scenario card', 'NEW_HIRE', 'corrects an answer after saying it', 'none', 'one registered', 'both'),
  j(55, 'org admin', 'signed-in nav', 'already signed in', 'existing, admin', 'scenario card', 'NEW_HIRE', 'tries to answer again after finishing', 'none', 'one registered', 'both'),
  j(56, 'org admin', 'signed-in nav', 'already signed in', 'existing, admin', 'scenario card', 'NEW_HIRE', 'uploads a document during the check-in', 'one, later', 'one registered', 'both'),
  j(57, 'org admin', 'signed-in nav', 'already signed in', 'existing, admin', 'scenario card', 'SNAPSHOT', 'one honest read, no follow-up', 'none', 'many', 'shared report'),
  j(58, 'org admin', 'signed-in nav', 'already signed in', 'existing, admin', 'scenario card', 'COHORT_CHECK', 'several people in the same role', 'none', 'many', 'shared report'),
  j(59, 'org admin', 'signed-in nav', 'already signed in', 'existing, admin', 'scenario card', 'NEW_HIRE', 'straight through', 'none', 'one registered', 'both', 'the other party never starts'),
  j(60, 'org admin', 'signed-in nav', 'already signed in', 'existing, admin', 'scenario card', 'NEW_HIRE', 'straight through', 'none', 'one registered', 'both', 'both finish, admin last'),

  // ── 61-78 · participants arriving ────────────────────────────────────────────────────────
  j(61, 'new participant', 'invite email', 'magic link', 'brand new', 'scenario card', 'NEW_HIRE', 'first time hearing of Groundwork', 'none', 'one unregistered', 'individual report'),
  j(62, 'new participant', 'invite email', 'email + password', 'brand new', 'scenario card', 'NEW_HIRE', 'sets a password on the way in', 'none', 'one unregistered', 'individual report'),
  j(63, 'new participant', 'invite email', 'google', 'brand new', 'scenario card', 'NEW_PROJECT', 'signs in with Google', 'none', 'one unregistered', 'individual report'),
  j(64, 'registered participant', 'invite email', 'already signed in', 'existing, member', 'scenario card', 'NEW_PROJECT', 'already in the organisation', 'none', 'one registered', 'individual report'),
  j(65, 'registered participant', 'invite email', 'magic link', 'guest elsewhere', 'scenario card', 'NEW_PROJECT', 'has an account somewhere else', 'none', 'one external', 'individual report'),
  j(66, 'external participant', 'invite email', 'magic link', 'brand new', 'scenario card', 'CONTRACT_REVIEW', 'from the other company entirely', 'none', 'one external', 'individual report'),
  j(67, 'new participant', 'invite email', 'magic link', 'brand new', 'scenario card', 'NEW_HIRE', 'opens the invite while signed into another account', 'none', 'one unregistered', 'individual report'),
  j(68, 'new participant', 'invite email', 'magic link', 'brand new', 'scenario card', 'NEW_HIRE', 'opens the invite twice', 'none', 'one unregistered', 'individual report'),
  j(69, 'new participant', 'invite email', 'magic link', 'brand new', 'scenario card', 'NEW_HIRE', 'closes it and comes back a week later', 'none', 'one unregistered', 'individual report'),
  j(70, 'new participant', 'direct /start', 'magic link', 'brand new', 'scenario card', 'NEW_HIRE', 'navigates in rather than using the email', 'none', 'one unregistered', 'individual report'),
  j(71, 'new participant', 'join link', 'magic link', 'brand new', 'scenario card', 'COHORT_CHECK', 'arrives on a broadcast link', 'none', 'many', 'individual report'),
  j(72, 'new participant', 'invite email', 'magic link', 'brand new', 'scenario card', 'NEW_HIRE', 'short answers', 'none', 'one unregistered', 'individual report'),
  j(73, 'new participant', 'invite email', 'magic link', 'brand new', 'scenario card', 'NEW_HIRE', 'asks who will see this', 'none', 'one unregistered', 'individual report'),
  j(74, 'new participant', 'invite email', 'magic link', 'brand new', 'scenario card', 'PIP', 'answers about something that is about them', 'none', 'one unregistered', 'individual report'),
  j(75, 'new participant', 'invite email', 'magic link', 'brand new', 'scenario card', 'NEW_HIRE', 'declines the willingness gate', 'none', 'one unregistered', 'setup only'),
  j(76, 'new participant', 'invite email', 'magic link', 'brand new', 'scenario card', 'NEW_HIRE', 'leaves halfway and returns', 'none', 'one unregistered', 'individual report'),
  j(77, 'new participant', 'invite email', 'magic link', 'brand new', 'scenario card', 'NEW_HIRE', 'a bounced invite', 'none', 'one unregistered', 'setup only'),
  j(78, 'new participant', 'invite email', 'magic link', 'brand new', 'scenario card', 'NEW_HIRE', 'the invite arrives before the start date', 'none', 'one unregistered', 'individual report'),

  // ── 79-88 · leads ────────────────────────────────────────────────────────────────────────
  j(79, 'lead', 'invite email', 'magic link', 'brand new', 'scenario card', 'NEW_PROJECT', 'handed a check-in an admin set up', 'none', 'lead runs it', 'both'),
  j(80, 'lead', 'invite email', 'already signed in', 'existing, member', 'scenario card', 'NEW_PROJECT', 'already has an account here', 'none', 'lead runs it', 'both'),
  j(81, 'lead', 'invite email', 'magic link', 'guest elsewhere', 'scenario card', 'NEW_PROJECT', 'has an account in another organisation', 'none', 'lead runs it', 'both'),
  j(82, 'lead', 'signed-in nav', 'already signed in', 'existing, member', 'scenario card', 'NEW_HIRE', 'a named lead opening their own', 'none', 'one unregistered', 'both'),
  j(83, 'lead', 'signed-in nav', 'already signed in', 'existing, member', 'scenario card', 'NEW_HIRE', 'a member where only leads may open', 'none', 'one unregistered', 'setup only'),
  j(84, 'lead', 'invite email', 'magic link', 'brand new', 'scenario card', 'NEW_PROJECT', 'adds the people themselves', 'none', 'mixed', 'both'),
  j(85, 'lead', 'invite email', 'magic link', 'brand new', 'scenario card', 'NEW_PROJECT', 'confirms and takes part as well', 'none', 'mixed', 'both'),
  j(86, 'lead', 'invite email', 'magic link', 'brand new', 'scenario card', 'NEW_PROJECT', 'confirms as managing only', 'none', 'mixed', 'shared report'),
  j(87, 'lead', 'signed-in nav', 'already signed in', 'existing, member', 'scenario card', 'NEW_PROJECT', 'sends a reminder to somebody who has not started', 'none', 'mixed', 'shared report'),
  j(88, 'lead', 'signed-in nav', 'already signed in', 'existing, member', 'scenario card', 'NEW_PROJECT', 'reads the report and closes the check-in', 'none', 'mixed', 'shared report'),

  // ── 89-100 · reports, and the ways people look for them ──────────────────────────────────
  j(89, 'org admin', 'signed-in nav', 'already signed in', 'existing, admin', 'scenario card', 'NEW_HIRE', 'follows the report-ready email', 'none', 'one registered', 'shared report'),
  j(90, 'org admin', 'signed-in nav', 'already signed in', 'existing, admin', 'scenario card', 'NEW_HIRE', 'goes looking on the dashboard instead', 'none', 'one registered', 'shared report'),
  j(91, 'new participant', 'invite email', 'magic link', 'brand new', 'scenario card', 'NEW_HIRE', 'opens the report link while signed out', 'none', 'one unregistered', 'individual report'),
  j(92, 'registered participant', 'invite email', 'already signed in', 'existing, member', 'scenario card', 'NEW_HIRE', 'opens it signed into the wrong organisation', 'none', 'one registered', 'individual report'),
  j(93, 'org admin', 'signed-in nav', 'already signed in', 'existing, admin', 'scenario card', 'NEW_HIRE', 'looks for a report before everyone has finished', 'none', 'one registered', 'shared report'),
  j(94, 'new participant', 'invite email', 'magic link', 'brand new', 'scenario card', 'NEW_HIRE', 'wants to know what the report says about them', 'none', 'one unregistered', 'individual report'),
  j(95, 'org admin', 'signed-in nav', 'already signed in', 'existing, admin', 'scenario card', 'SNAPSHOT', 'a one-off read with no second session', 'none', 'many', 'shared report'),
  j(96, 'org admin', 'signed-in nav', 'already signed in', 'existing, admin', 'scenario card', 'CONTRACT_REVIEW', 'the two sides read a clause differently', 'one, up front', 'one external', 'both'),
  j(97, 'org admin', 'signed-in nav', 'already signed in', 'existing, admin', 'scenario card', 'IMPLEMENTATION_TRACKING', 'the numbers do not reconcile', 'two, overlapping', 'one external', 'both'),
  j(98, 'org admin', 'signed-in nav', 'already signed in', 'existing, admin', 'API', 'NEW_PROJECT', 'set up through the public API', 'none', 'mixed', 'both'),
  j(99, 'registered participant', 'signed-in nav', 'already signed in', 'existing, member', 'API', 'NEW_PROJECT', 'answers through the embedded panel', 'none', 'one registered', 'individual report'),
  j(100,'org admin', 'signed-in nav', 'already signed in', 'existing, admin', 'scenario card', 'NEW_HIRE', 'the whole thing on a phone-sized screen', 'none', 'one registered', 'both'),
];

export const HOW_MANY = JOURNEYS.length;
