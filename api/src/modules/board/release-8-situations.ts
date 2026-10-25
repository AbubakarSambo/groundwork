/**
 * RELEASE 8: THE REMAINING SITUATIONS (docs/release-plan.md, Release 8; Hafsah, 24 October 2026).
 *
 * Every situation a lead brings has a board built for it. The prototype's switchboard
 * (docs/prototype/screens/B1-starting-a-check-in/switchboard.txt) says it in one line: "pick a situation and
 * its board shows what's on, and nothing that's off." This file is that line for the situations no kit picture
 * draws on its own: which sections each one switches on, which it may show, and why each is there, in the order
 * and the groups the scenario picker uses.
 *
 * WHAT IT DOES NOT DO. It builds nothing new from the record. Every section here is one the board already serves
 * (the starting agreement, each account side by side, the timeline, the obligations, the risks and the rest),
 * already under every wall for this reader. This only says which of them this situation's board draws, and in
 * which order. A section the board holds nothing for is not drawn; a section the situation switches on and the
 * record has not filled yet is named once, in one sentence, so the lead knows it is coming.
 *
 * OPEN_READ STARTS EMPTY. "Work through something else" is the situation nobody could name yet, so its board
 * starts with nothing on it, and each section switches on as it becomes clear: as soon as the record holds
 * something for it. Until then the board says so plainly.
 *
 * Off for every organisation until `release8SituationsOn` is set; off, nothing is served and every board is
 * as before.
 */

export type ASituationSection =
  | 'targets' | 'plan' | 'grid' | 'start' | 'accounts' | 'picture' | 'timeline' | 'themes' | 'oblig'
  | 'change' | 'blockers' | 'risks' | 'patterns' | 'lead' | 'grades';

/** Each section: its heading on the board, and the one reason a situation turns it on, in a full sentence. */
export const THE_SECTIONS: Record<ASituationSection, { heading: string; why: string }> = {
  targets: { heading: 'Targets', why: 'It shows the numbers this is aiming for, and how far along each one is.' },
  plan: { heading: 'Work plan', why: 'It shows what each person said they would do, and by when.' },
  grid: { heading: 'Every piece of work', why: 'It shows each piece of work, where it stands, and what shows it.' },
  start: { heading: 'What was agreed at the start', why: 'It keeps what everyone agreed on the first day, so later changes can be read against it.' },
  accounts: { heading: 'What each person said', why: 'It puts what each person said next to the others, so you can see where they agree and where they do not.' },
  picture: { heading: 'What is known, what is believed, and what nobody knows yet', why: 'It separates what is proven from what someone said, and lists what nobody has answered.' },
  timeline: { heading: 'What happened, day by day', why: 'It puts what happened in order, so nobody argues about when.' },
  themes: { heading: 'What keeps being raised', why: 'It shows the things people raise most, in their own words.' },
  oblig: { heading: 'What each side promised', why: 'It shows what each side committed to, and what others are waiting on them for.' },
  change: { heading: 'Change since last check-in', why: 'It shows what moved, what held, and what is late since the last check-in.' },
  blockers: { heading: 'Blockers', why: 'It shows who is waiting on whom, and since when.' },
  risks: { heading: 'Risks', why: 'It shows what could go wrong next, and the facts each risk rests on.' },
  patterns: { heading: 'What keeps coming up', why: 'It shows what has come up in three check-ins or more.' },
  lead: { heading: 'What needs you', why: 'It shows what only you can do, and what happens if you do not.' },
  grades: { heading: 'Who checked in', why: 'It shows who checked in each time, and who did not.' },
};

export interface ASituation {
  scenario: string;
  /** The situation as the scenario picker names it. */
  situation: string;
  /** The picker's heading it sits under. */
  group: string;
  on: ASituationSection[];
  optional: ASituationSection[];
}

/**
 * The situations Release 8 draws, from the switchboard's own rows (client/src/pages/board/the-switchboard-g2-table.ts),
 * each section mapped to one the board serves. Sections only the switchboard's purple columns carry (new hire, drift,
 * a plan to get back on track and contract renewal) do not appear here: none of these situations switch them on.
 */
export const THE_SITUATIONS: ASituation[] = [
  { scenario: 'ROLE_HANDOVER', situation: 'Hand over a role smoothly', group: 'Something is starting', on: ['start', 'oblig', 'change', 'blockers', 'risks', 'lead'], optional: ['plan', 'accounts'] },
  { scenario: 'NEW_COFOUNDER', situation: 'Start a new partnership well', group: 'Something is starting', on: ['start', 'accounts', 'change', 'patterns'], optional: ['targets', 'plan', 'oblig', 'blockers', 'risks'] },
  { scenario: 'NEW_ADVISOR', situation: 'Start an advisor or board relationship', group: 'Something is starting', on: ['start', 'oblig'], optional: ['accounts', 'change', 'patterns', 'lead'] },
  { scenario: 'CONTRACT_REVIEW', situation: 'Check an agreement before signing', group: 'Something is starting', on: ['start', 'accounts', 'oblig', 'risks', 'lead'], optional: ['picture', 'blockers'] },
  { scenario: 'CRISIS_ALIGNMENT', situation: 'Work through a big decision', group: 'Planning and goals', on: ['accounts', 'picture', 'timeline', 'change', 'blockers', 'risks', 'lead'], optional: ['themes'] },
  { scenario: 'PULSE_CHECK', situation: 'Keep a read on live work', group: 'Keeping a read', on: ['change', 'blockers', 'patterns'], optional: ['targets', 'plan', 'grid', 'start', 'risks', 'lead', 'grades'] },
  { scenario: 'TEAM_UPDATES', situation: 'Get updates from your team', group: 'Keeping a read', on: ['grid', 'change', 'blockers', 'patterns', 'lead', 'grades'], optional: ['targets', 'plan', 'themes', 'risks'] },
  { scenario: 'DISCOVERY', situation: 'Work out where to focus', group: 'Keeping a read', on: ['themes'], optional: ['accounts', 'picture', 'patterns', 'lead'] },
  { scenario: 'SNAPSHOT', situation: 'Take the pulse of the team', group: 'Keeping a read', on: ['themes'], optional: ['accounts'] },
  { scenario: 'COHORT_CHECK', situation: 'Check how the same role is going', group: 'Keeping a read', on: ['targets', 'themes', 'blockers', 'patterns'], optional: ['grid', 'change', 'lead', 'grades'] },
  { scenario: 'IMPLEMENTATION_TRACKING', situation: 'Check how an agreement is going', group: 'Keeping a read', on: ['start', 'oblig', 'change', 'blockers', 'risks', 'lead'], optional: ['plan', 'accounts', 'patterns'] },
  { scenario: 'REALIGN_TEAM', situation: 'See where people see things differently', group: 'Something has gone off', on: ['start', 'accounts', 'themes', 'lead'], optional: ['targets', 'plan', 'picture', 'blockers', 'risks', 'patterns'] },
  { scenario: 'ACUTE_SHOCK', situation: 'Make sense of something serious', group: 'Something has gone off', on: ['accounts', 'picture', 'timeline', 'change', 'blockers', 'risks', 'lead'], optional: [] },
  { scenario: 'OPEN_READ', situation: 'Work through something else', group: 'Open', on: ['accounts', 'picture', 'themes'], optional: ['timeline', 'change', 'blockers', 'risks', 'patterns', 'lead'] },
];

/** The board's order for every situation: what was agreed and what was said first, then what moved, then what to do. */
const THE_ORDER: ASituationSection[] = ['lead', 'targets', 'start', 'accounts', 'picture', 'themes', 'oblig', 'timeline', 'change', 'grid', 'plan', 'blockers', 'risks', 'patterns', 'grades'];

export const theSituation = (scenario: string | null | undefined): ASituation | null => THE_SITUATIONS.find((s) => s.scenario === scenario) ?? null;

const filled = (x: unknown): boolean => {
  if (x == null) return false;
  if (typeof x === 'string') return x.trim().length > 0;
  if (Array.isArray(x)) return x.length > 0;
  if (typeof x === 'object') {
    const o = x as Record<string, unknown>;
    for (const k of ['rows', 'items', 'sessions', 'aims', 'places', 'things', 'areas']) if (Array.isArray(o[k]) && (o[k] as unknown[]).length) return true;
    return typeof o.says === 'string' && o.says.trim().length > 0 && !Array.isArray(o.rows);
  }
  return false;
};

/** Whether the board this reader is served holds anything for a section. Read only from what is already served. */
export function theBoardHolds(section: ASituationSection, b: Record<string, any>): boolean {
  switch (section) {
    case 'targets': return filled(b.objectives);
    case 'plan': return filled(b.workPlan);
    case 'grid': return ((b.workRecords ?? []) as any[]).some((s) => s?.section === 'Deal grid' && filled(s.rows));
    case 'start': return filled(b.startingState);
    case 'accounts': case 'picture': return filled(b.whoOwnsWhat);
    case 'timeline': return filled(b.timeline);
    case 'themes': return filled(b.whatTheRoomIsAbout) || filled(b.divergence);
    case 'oblig': return filled(b.obligations);
    case 'change': return filled(b.changeSinceLast);
    case 'blockers': return filled(b.blockers);
    case 'risks': return filled(b.risks);
    case 'patterns': return filled(b.patterns) || filled(b.keepsComingUp);
    case 'lead': return filled(b.leadActions);
    case 'grades': return filled(b.checkInGrid);
  }
}

export interface ASituationBoard {
  scenario: string;
  situation: string;
  group: string;
  /** The sections drawn, in order: each one the situation switches on or may show, and the record holds something for. */
  sections: { key: ASituationSection; heading: string; why: string }[];
  /** One sentence naming what this situation switches on and the record has not filled yet; null when nothing is waiting. */
  stillToCome: string | null;
  /** Only while nothing at all is on the board: what the board is, and when it fills. */
  empty: string | null;
}

const lowerFirst = (s: string) => s.charAt(0).toLowerCase() + s.slice(1);
const inAList = (xs: string[]) => (xs.length <= 1 ? xs.join('') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`);

/**
 * This situation's board for this reader, from the board already served to them. `runsIt` decides whether
 * "What needs you" is drawn: it is the lead's, never a participant's.
 */
export function theSituationBoard(scenario: string, b: Record<string, any>, opts: { runsIt: boolean }): ASituationBoard | null {
  const s = theSituation(scenario);
  if (!s) return null;
  const wanted = new Set<ASituationSection>([...s.on, ...s.optional]);
  if (!opts.runsIt) wanted.delete('lead');
  const sections = THE_ORDER.filter((k) => wanted.has(k) && theBoardHolds(k, b)).map((k) => ({ key: k, ...THE_SECTIONS[k] }));
  const waiting = s.on.filter((k) => (opts.runsIt || k !== 'lead') && !theBoardHolds(k, b)).map((k) => lowerFirst(THE_SECTIONS[k].heading));
  const open = scenario === 'OPEN_READ';
  const empty = sections.length
    ? null
    : open
      ? 'Nothing is clear yet, so this board is empty. Each part appears here as soon as people’s check-ins give it something to show.'
      : `Nothing is on this board yet. It fills in after the first check-in.`;
  /* An open read names nothing in advance: nobody knows yet what it will need. */
  const stillToCome = open || !sections.length || !waiting.length ? null : `${inAList(waiting).replace(/^./, (c) => c.toUpperCase())} ${waiting.length === 1 ? 'appears' : 'appear'} here once a check-in gives ${waiting.length === 1 ? 'it' : 'them'} something to show.`;
  return { scenario: s.scenario, situation: s.situation, group: s.group, sections, stillToCome, empty };
}

/** Whether Release 8 is switched on for this organisation. Off for every organisation by default. */
export async function theRelease8SituationsIsOn(prisma: any, organizationId: string | null | undefined): Promise<boolean> {
  if (!organizationId) return false;
  const o = await Promise.resolve(prisma?.organization?.findUnique?.({ where: { id: organizationId }, select: { release8SituationsOn: true } })).catch(() => null);
  return o?.release8SituationsOn === true;
}
