/**
 * THE BOARD AT A GLANCE: ONE FACT FOR EACH FOLDED LINE, TWO FOR EACH BOX (the light prototype, 13
 * October 2026; docs/light-rebuild/sales-first.md, section 1 and rule 3).
 *
 * The light board folds every section to one line: its name, one fact, a chevron. The sections sit
 * in five boxes, each showing its two most useful facts. Rule 3 says those facts come from the
 * record, served as data, never read off the screen; rule 4 says they state only what the record
 * holds. So they are built here, from the board this reader is already served, after every wall:
 * nothing in a fact can say more than the sections it sums up, and a reader who is not served a
 * section gets no fact for it.
 *
 * A fact is left out (not made up) when the board holds nothing to say it from.
 */

export type GlanceLine =
  | 'deals' | 'targetAssumes' | 'reported' | 'targetsOverTime' | 'whereHeading' | 'forecast' | 'likelyEnd' | 'byArea' | 'sitsUnder' | 'landing'
  | 'whatToAsk' | 'teamToday' | 'patterns' | 'whoCheckedIn' | 'helpNobodyMentioned'
  | 'yourNextStep' | 'commitments' | 'workPlan'
  | 'blockers' | 'risks' | 'waitingOnOtherTeams' | 'openIssues'
  | 'reports';

export type GlanceBox = 'work' | 'team' | 'plan' | 'risk' | 'rest';

export interface TheBoardAtAGlance {
  lines: Partial<Record<GlanceLine, string>>;
  /** Up to two facts for each box, the most useful first. */
  boxes: Record<GlanceBox, string[]>;
  /** For an admin or the chief executive: what is waiting on the lead, in one line ("3 things: …"). */
  needsTheLead: string | null;
  /**
   * One fact for each "What the target of 25 assumes" line, by the target's id: how many assumptions are
   * written down, or the engine's own sentence when none is (`assumesSays`). A target with neither gets none.
   */
  assumesEach: Record<string, string>;
}

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
const times = (n: number) => (n === 1 ? 'once' : n === 2 ? 'twice' : `${n} times`);
const first = <T,>(xs: T[] | null | undefined): T | undefined => (Array.isArray(xs) && xs.length ? xs[0] : undefined);

function dealRows(b: any): any[] {
  const grid = (Array.isArray(b.workRecords) ? b.workRecords : []).find((s: any) => /deal/i.test(String(s.section ?? '')) && Array.isArray(s.rows));
  return grid ? grid.rows : [];
}

/** The team's own aims with a number, as the headline reads them: not a person's own share. */
function teamAims(b: any): any[] {
  return (Array.isArray(b.objectives) ? b.objectives : []).filter((o: any) => !o.ownerParticipantId && typeof o.target === 'number');
}

export function theBoardAtAGlance(b: any, opts: { readerCheckedInThisRound: boolean | null; readerIsTheLead?: boolean }): TheBoardAtAGlance {
  const lines: Partial<Record<GlanceLine, string>> = {};

  /* Deals and targets */
  const deals = dealRows(b);
  if (deals.length) lines.deals = `${plural(deals.length, 'deal')}, each with what shows it`;
  const assumptions = (Array.isArray(b.objectives) ? b.objectives : []).reduce((n: number, o: any) => n + (Array.isArray(o.assumes) ? o.assumes.length : 0), 0);
  if (assumptions) lines.targetAssumes = `${plural(assumptions, 'assumption')} behind the target`;
  const assumesEach: Record<string, string> = {};
  for (const o of Array.isArray(b.objectives) ? b.objectives : []) {
    if (!o?.id) continue;
    const n = Array.isArray(o.assumes) ? o.assumes.length : 0;
    if (n) assumesEach[o.id] = `${plural(n, 'assumption')} behind the target`;
    else if (typeof o.assumesSays === 'string' && o.assumesSays.trim()) assumesEach[o.id] = o.assumesSays.trim().replace(/\.$/, '');
  }
  const stages = Array.isArray(b.reportedAgainstCriteria?.stages) ? b.reportedAgainstCriteria.stages : [];
  /* The furthest stage a deal moves forward to: Lost is where a deal left, not how far the work got (found reading Grace's board, 18 October). */
  const lastStage = [...stages].reverse().find((s: any) => typeof s.reported === 'number' && s.reported > 0 && !/^lost$/i.test(String(s.stage ?? '').trim()));
  /* With the stage rules on record (Release 1), said and met, as "Reported vs criteria met" counts them: Won is met with a signed
     order or a payment record (Hafsah, 18 October, answer 2), so a won said in words alone is never counted here as met. Proof of
     payment is counted apart, on the aim ("71 sold, 40 with proof of payment."). */
  if (lastStage) lines.reported = typeof lastStage.met === 'number'
    ? `${lastStage.stage}: ${lastStage.reported} said, ${lastStage.met} met`
    : `${lastStage.stage}: ${lastStage.reported} said, ${lastStage.withProof ?? 0} with proof`;
  const aims = teamAims(b).slice(0, 2);
  /* The served name is already a sentence ("The team is aiming for 25 freezers sold."), so the fact is the numbers and the word the record gives it. */
  if (aims.length) lines.targetsOverTime = aims.map((o: any) => `${o.journey?.now ?? o.count ?? 0} of ${o.target}${o.stands?.word ? `, ${String(o.stands.word).toLowerCase()}` : ''}`).join('; ');
  if (b.whereThisIsHeading && Array.isArray(b.whereThisIsHeading.outcomes)) {
    lines.whereHeading = `${plural(b.whereThisIsHeading.outcomes.length, 'possible outcome')}. ${b.whereThisIsHeading.whoDecides ?? ''}`.trim();
  }
  if (Array.isArray(b.forecast) && b.forecast.length) lines.forecast = `${plural(b.forecast.length, 'target')} carried forward at the pace so far`;
  if (b.cascade) lines.sitsUnder = b.cascade.parentNamed ? String(b.cascade.parentNamed) : 'Nothing above this has been named yet';
  /* A sales section the record cannot fill yet ("Groundwork does not keep this yet."), and work by area. */
  const numbers = (Array.isArray(b.workRecords) ? b.workRecords : []).find((x: any) => /forecast/i.test(String(x.section ?? '')));
  if (numbers?.state === 'not-known') lines.likelyEnd = 'Groundwork does not keep this yet';
  else if (Array.isArray(numbers?.rows) && numbers.rows.length) lines.likelyEnd = plural(numbers.rows.length, 'line');
  if (b.byArea?.state === 'not-known') lines.byArea = 'Nothing on record says where each piece of work belongs yet';
  else if (Array.isArray(b.byArea?.areas) && b.byArea.areas.length) lines.byArea = plural(b.byArea.areas.length, 'area');
  /* Where the work is landing: whose work is moving to other people, counted, never a label on anybody. */
  const reads = Array.isArray(b.coverage?.reads) ? b.coverage.reads : [];
  if (reads.length) {
    const leaking = reads.filter((r: any) => r.kind === 'LEAKING').length;
    const absorbing = reads.filter((r: any) => r.kind === 'ABSORBING').length;
    lines.landing = leaking || absorbing
      ? [leaking ? `${plural(leaking, 'person', 'people')} whose work is landing with others` : '', absorbing ? `${plural(absorbing, 'person', 'people')} taking on others’ work` : ''].filter(Boolean).join(', ')
      : 'Nothing is leaking out or piling in';
  }

  /* The team */
  const asks = Array.isArray(b.coaching?.eachPerson) ? b.coaching.eachPerson : [];
  if (asks.length) lines.whatToAsk = `Something worth recognising, and what’s in the way, for each of ${plural(asks.length, 'person', 'people')}`;
  const each = Array.isArray(b.eachPerson) ? b.eachPerson : [];
  if (each.length) {
    const counts = new Map<string, number>();
    for (const p of each) if (p.reason) counts.set(String(p.reason), (counts.get(String(p.reason)) ?? 0) + 1);
    const top = [...counts.entries()].sort((x, y) => y[1] - x[1]).slice(0, 2).map(([r, n]) => `${n} ${r}`);
    lines.teamToday = top.length ? top.join('; ') : `${plural(each.length, 'person', 'people')}`;
  }
  const patterns = Array.isArray(b.patterns) ? b.patterns : [];
  if (patterns.length) lines.patterns = `${plural(patterns.length, 'pattern')} about how the work is going`;
  const progress = b.howItIsGoing?.glance?.progress;
  if (progress && typeof progress.answeredThisRound === 'number' && typeof progress.ofPeople === 'number') {
    lines.whoCheckedIn = `Today: ${progress.answeredThisRound} of ${progress.ofPeople} checked in`;
  }
  const help = first<string>(b.helpNobodyMentioned?.lines);
  if (help) lines.helpNobodyMentioned = help;

  /* Plan and commitments */
  if (b.coaching?.yours) {
    lines.yourNextStep = opts.readerCheckedInThisRound === false
      ? 'Only you. You haven’t checked in this session'
      : 'Only you. Written for you, not part of the shared report';
  }
  const plan = Array.isArray(b.workPlan) ? b.workPlan : [];
  if (plan.length) {
    const open = plan.filter((w: any) => w.state === 'open').length;
    const notDone = plan.filter((w: any) => w.state === 'not done').length;
    const done = plan.filter((w: any) => w.state === 'done').length;
    lines.commitments = 'What each person agreed, and how it’s going';
    lines.workPlan = [open ? `${open} open` : '', done ? `${done} done` : '', notDone ? `${notDone} not done` : ''].filter(Boolean).join(', ');
  }

  /* Risks and open issues */
  const blockers = Array.isArray(b.blockers) ? b.blockers : [];
  const blocking = blockers.filter((x: any) => x.state === 'blocking');
  if (blockers.length) {
    const biggest = [...(blocking.length ? blocking : blockers)].sort((x: any, y: any) => (y.raised?.times ?? 0) - (x.raised?.times ?? 0))[0];
    const head = blocking.length ? `${blocking.length} blocking` : `${plural(blockers.length, 'thing')} waiting`;
    lines.blockers = biggest?.name ? `${head}. The biggest: ${biggest.name}, raised ${times(biggest.raised?.times ?? 1)}` : head;
  }
  const risks = Array.isArray(b.risks) ? b.risks : [];
  if (risks.length) lines.risks = `${plural(risks.length, 'thing')} that could stop the goal`;
  const outside = (Array.isArray(b.dependencies) ? b.dependencies : []).filter((d: any) => !d.onParticipantId && d.on && d.status !== 'CLEARED');
  if (outside.length) {
    const names = [...new Set(outside.map((d: any) => String(d.on)))];
    lines.waitingOnOtherTeams = `${names.length}: ${names.join(', ')}`;
  }
  const differ = Array.isArray(b.divergence?.items) ? b.divergence.items.length : 0;
  /* The lead reads every decision under "What needs you", not under "Open issues", so it is not counted there for her. */
  const decisions = !opts.readerIsTheLead && Array.isArray(b.decisions) ? b.decisions.length : 0;
  if (differ || decisions) {
    lines.openIssues = [differ ? `${plural(differ, 'thing')} people see differently` : '', decisions ? `${plural(decisions, 'decision')} needed` : ''].filter(Boolean).join(', ');
  } else if (b.openIssues) {
    lines.openIssues = 'Nothing on record follows an issue yet';
  }

  /* Reports and other boards */
  const sessions = Array.isArray(b.phaseSpine?.sessions) ? b.phaseSpine.sessions : [];
  const done = sessions.filter((s: any) => s.state === 'done').length;
  if (done) lines.reports = `${plural(done, 'session')} so far, each with its reports`;

  const pick = (...keys: GlanceLine[]) => keys.map((k) => lines[k]).filter((x): x is string => !!x).slice(0, 2);
  const boxes: Record<GlanceBox, string[]> = {
    work: pick('deals', 'targetAssumes', 'reported', 'targetsOverTime'),
    team: pick('teamToday', 'patterns', 'whoCheckedIn', 'whatToAsk'),
    plan: pick('workPlan', 'commitments', 'yourNextStep'),
    risk: pick('blockers', 'risks', 'waitingOnOtherTeams', 'openIssues'),
    rest: pick('reports'),
  };

  const waiting: string[] = [
    ...(Array.isArray(b.leadActions) ? b.leadActions.map((a: any) => String(a.says ?? '')) : []),
    ...(Array.isArray(b.decisions) ? b.decisions.map((d: any) => String(d.question ?? '')) : []),
  ].filter(Boolean);
  const needsTheLead = waiting.length
    ? `${plural(waiting.length, 'thing')}: ${waiting.slice(0, 2).join(' · ')}${waiting.length > 2 ? ' · and more' : ''}`
    : null;

  return { lines, boxes, needsTheLead, assumesEach };
}
