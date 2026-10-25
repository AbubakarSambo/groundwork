import { RECORDS_FROM_A_DOCUMENT_PROMPT, RECORDS_SCHEMA_PROPERTIES } from './the-setup-records';
/**
 * RELEASE 9: POLICY, AND SETTING UP FROM DOCUMENTS (docs/release-plan.md, Release 9; Hafsah, 24 October 2026).
 *
 * An organisation hands over its handbook and its policies, and gets a setup to approve area by area, every rule linked
 * to where it came from (the prototype's "Set up from your documents"). Once approved, the rules sit on one page (the
 * prototype's "The policy board"), Ask answers from them, and the ones a suite can check exactly are written into that
 * suite's own settings, so leave and spending requests follow them.
 *
 * THIS FILE IS THE PURE PART: what the model is asked, what of its answer is kept, where two documents disagree, how each
 * page reads, and what approving an area writes. Nothing here reads or writes the database.
 *
 * WHAT A SUITE IS GIVEN, AND WHAT IT IS NOT. Only a rule that maps exactly onto a setting the suite already has: the leave
 * days a year, the working days of notice, and the amount above which a spending request needs a quote (a proforma). A rule
 * that does not map exactly (who approves above an amount when the steps are named people, hours a day on a project, when a
 * week locks) stays on the policy board and in what Ask answers from, and is not guessed into a setting. Safest choice,
 * noted in docs/release-status.md.
 */

export type APolicyArea = 'leave' | 'spending' | 'timesheets' | 'norms' | 'boundaries';
export const THE_AREAS: APolicyArea[] = ['leave', 'spending', 'timesheets', 'norms', 'boundaries'];
export const AREA_HEADING: Record<APolicyArea, string> = {
  leave: 'Leave', spending: 'Spending', timesheets: 'Timesheets', norms: 'Working norms', boundaries: 'Boundaries',
};

/** What a rule sets, where it sets one number or day. Two documents that set the same one differently disagree. */
export type AMeasure = 'leave.days' | 'leave.noticeDays' | 'spend.quoteAbove' | 'spend.approvalAbove' | 'time.hoursADay' | 'time.locksOn';
const MEASURES: AMeasure[] = ['leave.days', 'leave.noticeDays', 'spend.quoteAbove', 'spend.approvalAbove', 'time.hoursADay', 'time.locksOn'];

/** The question a disagreement asks, and how each side's number is said. */
const MEASURE_SAID: Record<AMeasure, { title: string; value: (v: string) => string }> = {
  'leave.days': { title: 'How many leave days', value: (v) => `${v} days a year` },
  'leave.noticeDays': { title: 'How much notice leave needs', value: (v) => `${v} working days ahead` },
  'spend.quoteAbove': { title: 'When spending needs a proforma', value: (v) => `above ${aNumber(v)}` },
  'spend.approvalAbove': { title: 'Which amount needs a second approval', value: (v) => `above ${aNumber(v)}` },
  'time.hoursADay': { title: 'How many hours a day', value: (v) => `${v} hours a day` },
  'time.locksOn': { title: 'When a week locks', value: (v) => `on ${v}` },
};

const aNumber = (v: string) => (/^\d+$/.test(v) ? Number(v).toLocaleString('en-GB') : v);

/** One rule as read from a document, before anything is kept. */
export interface ARuleRead {
  area: APolicyArea;
  /** The rule, in one full sentence. */
  says: string;
  /** The document's name, "Leave policy". */
  document: string;
  /** Where in it, "section 2", "page 11". */
  where: string | null;
  /** Who may make an exception, as the document names them. */
  exceptionsBy: string | null;
  /** What it applies to, "leave requests". */
  appliesTo: string | null;
  measure: AMeasure | null;
  value: string | null;
}

export const RULES_FROM_A_DOCUMENT_PROMPT = [
  'You read one document an organisation runs on, such as a staff handbook, a leave policy or an expense policy.',
  'List every rule in it that says what people may do, must do, or need approval for. Leave out descriptions, history and anything that is not a rule.',
  'For each rule give its area (leave, spending, timesheets, norms for how people work, boundaries for what people may offer or promise to customers),',
  'the rule as one plain, full sentence in the document\'s own terms, where in the document it is (a section or a page, as the document numbers it),',
  'who may make an exception if the document names them, and what it applies to, such as "leave requests" or "spending requests".',
  'Where the rule sets one number or day, also give which one it sets and the value, as a bare number or a weekday:',
  'leave.days (days of paid leave a year), leave.noticeDays (working days of notice), spend.quoteAbove (the amount above which a quote or proforma is needed),',
  'spend.approvalAbove (the amount above which a second person must approve), time.hoursADay (most hours a day), time.locksOn (the weekday a week locks).',
  'Never invent a rule, a number or a name the document does not say.',
  RECORDS_FROM_A_DOCUMENT_PROMPT,
].join(' ');

export const RULES_FROM_A_DOCUMENT_SCHEMA = {
  name: 'rules_from_a_document',
  description: 'Emit every rule in the document, each with its area, the rule as one sentence, where it is, who may make an exception, what it applies to, and the number or day it sets.',
  input_schema: {
  type: 'object',
  properties: {
    rules: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          area: { type: 'string', enum: THE_AREAS },
          says: { type: 'string' },
          where: { type: 'string' },
          exceptionsBy: { type: 'string' },
          appliesTo: { type: 'string' },
          measure: { type: 'string', enum: MEASURES },
          value: { type: 'string' },
        },
        required: ['area', 'says'],
      },
    },
    ...RECORDS_SCHEMA_PROPERTIES,
  },
  required: ['rules'],
  },
};

const MOST_RULES = 60;
const clean = (x: unknown, max = 300): string | null => {
  if (typeof x !== 'string') return null;
  const t = x.replace(/\s+/g, ' ').trim();
  return t && t.length <= max ? t : null;
};
const asASentence = (t: string) => {
  const s = t.charAt(0).toUpperCase() + t.slice(1);
  return /[.!?]$/.test(s) ? s : `${s}.`;
};

/** What of the model's answer is kept: a known area, a sentence, and a number only where the measure takes one. */
export function onlyTheRulesThatHold(answer: unknown, document: string): ARuleRead[] {
  const rows = Array.isArray((answer as any)?.rules) ? ((answer as any).rules as unknown[]) : [];
  const out: ARuleRead[] = [];
  for (const r of rows.slice(0, MOST_RULES)) {
    const area = (r as any)?.area;
    const says = clean((r as any)?.says);
    if (!THE_AREAS.includes(area) || !says || says.split(' ').length < 3) continue;
    const measure = MEASURES.includes((r as any)?.measure) ? ((r as any).measure as AMeasure) : null;
    const raw = clean((r as any)?.value, 20);
    const value = !measure || !raw ? null
      : measure === 'time.locksOn' ? (/^(monday|tuesday|wednesday|thursday|friday|saturday|sunday)$/i.test(raw) ? raw.charAt(0).toUpperCase() + raw.slice(1).toLowerCase() : null)
      : (/^\d+(\.\d+)?$/.test(raw.replace(/,/g, '')) ? raw.replace(/,/g, '') : null);
    out.push({
      area,
      says: asASentence(says),
      document,
      where: clean((r as any)?.where, 60),
      exceptionsBy: clean((r as any)?.exceptionsBy, 80),
      appliesTo: clean((r as any)?.appliesTo, 120),
      measure: value ? measure : null,
      value,
    });
  }
  return out;
}

/** A rule as kept. */
export interface ARule extends ARuleRead {
  id: string;
  state: 'proposed' | 'applied' | 'set aside';
  /** The day it was last changed, "2026-10-02", or null where it is as the document first said. */
  changedOn: string | null;
}

export interface ADisagreement {
  measure: AMeasure;
  area: APolicyArea;
  title: string;
  /** "The handbook says 20 days a year (page 6). The leave policy says 21 days a year (section 2). Which is right?" */
  says: string;
  /** One choice for each different value, with the rule it keeps. */
  choices: { ruleId: string; value: string; label: string }[];
}

const theDocument = (name: string) => (/^the\b/i.test(name) ? name.charAt(0).toLowerCase() + name.slice(1) : `the ${name.charAt(0).toLowerCase()}${name.slice(1)}`);

/** Where two documents set the same thing differently, among the rules not yet set aside. */
export function whereTheyDisagree(rules: ARule[]): ADisagreement[] {
  const out: ADisagreement[] = [];
  for (const m of MEASURES) {
    const live = rules.filter((r) => r.measure === m && r.value && r.state !== 'set aside');
    const values = [...new Set(live.map((r) => r.value as string))];
    if (values.length < 2) continue;
    const firstOf = values.map((v) => live.find((r) => r.value === v)!);
    const said = firstOf.map((r) => `${theDocument(r.document).replace(/^./, (c) => c.toUpperCase())} says ${MEASURE_SAID[m].value(r.value!)}${r.where ? ` (${r.where})` : ''}.`);
    out.push({
      measure: m,
      area: firstOf[0].area,
      title: MEASURE_SAID[m].title,
      says: `${said.join(' ')} Which is right?`,
      choices: firstOf.map((r) => ({ ruleId: r.id, value: r.value!, label: aNumber(r.value!) })),
    });
  }
  return out;
}

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const dayAndMonth = (iso: string) => `${Number(iso.slice(8, 10))} ${MONTHS[Number(iso.slice(5, 7)) - 1]}`;

/** The one line under a rule: where it came from, who may make an exception, what it applies to, and whether it changed. */
export function theRuleFacts(r: ARule): string {
  return [
    `From ${theDocument(r.document)}${r.where ? `, ${r.where}` : ''}.`,
    r.exceptionsBy ? `${r.exceptionsBy.charAt(0).toUpperCase()}${r.exceptionsBy.slice(1)} can make an exception.` : '',
    r.appliesTo ? `It applies to ${r.appliesTo.charAt(0).toLowerCase()}${r.appliesTo.slice(1).replace(/\.$/, '')}.` : '',
    r.changedOn ? `Changed ${dayAndMonth(r.changedOn)}.` : 'Unchanged.',
  ].filter(Boolean).join(' ');
}

export interface ThePolicyBoard {
  title: string;
  intro: string;
  areas: { area: APolicyArea; heading: string; rules: { id: string; says: string; facts: string }[] }[];
  /** "Not applied until you decide": each disagreement, said as what happens until it is decided. */
  undecided: { title: string; says: string }[];
  /** Only when nothing is on the board yet. */
  empty: string | null;
}

/** The policy board, as everyone in the organisation reads it: the rules applied, by area, and what waits on a decision. */
export function thePolicyBoard(orgName: string, askName: string, rules: ARule[]): ThePolicyBoard {
  const applied = rules.filter((r) => r.state === 'applied');
  const areas = THE_AREAS
    .map((area) => ({ area, heading: AREA_HEADING[area], rules: applied.filter((r) => r.area === area).map((r) => ({ id: r.id, says: r.says, facts: theRuleFacts(r) })) }))
    .filter((a) => a.rules.length);
  const undecided = whereTheyDisagree(rules).map((d) => ({
    title: d.title,
    says: `Two documents disagree. Nothing about ${d.title.charAt(0).toLowerCase()}${d.title.slice(1)} is applied until it is decided.`,
  }));
  return {
    title: 'The policy board',
    intro: `Every rule ${orgName} runs on, in one place. Anyone can ask about them in ${askName}. Leave, spending and time sheets follow the ones approved here.`,
    areas,
    undecided,
    empty: areas.length || undecided.length ? null : `No rules are on the board yet. An admin adds them by setting up from ${orgName}${/s$/i.test(orgName) ? '’' : '’s'} documents.`,
  };
}

export interface TheSetupFromDocuments {
  title: string;
  intro: string;
  /** "Added the staff handbook, the leave policy and the expense policy." Null with no documents yet. */
  added: string | null;
  decideFirst: ADisagreement[];
  areas: { area: APolicyArea; heading: string; says: string; from: string; approved: boolean; waitsOn: string | null }[];
  noDocuments: string;
}

const inAList = (xs: string[]) => (xs.length <= 1 ? xs.join('') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`);

/** The setup page, for an admin: the documents added, what to decide first, and each area with what it will set and where from. */
export function theSetupFromDocuments(askName: string, documents: string[], rules: ARule[]): TheSetupFromDocuments {
  const disagree = whereTheyDisagree(rules);
  const areas = THE_AREAS.map((area) => {
    const here = rules.filter((r) => r.area === area && r.state !== 'set aside');
    if (!here.length) return null;
    const waits = disagree.find((d) => d.area === area) ?? null;
    /* One document named once, with each place in it: "the leave policy, section 2 and section 3". */
    const byDocument = new Map<string, string[]>();
    for (const r of here) { const w = byDocument.get(r.document) ?? []; if (r.where && !w.includes(r.where)) w.push(r.where); byDocument.set(r.document, w); }
    const sources = [...byDocument].map(([d, w]) => `${theDocument(d)}${w.length ? `, ${inAList(w)}` : ''}`);
    const sentences = here.slice(0, 3).map((r) => r.says);
    return {
      area,
      heading: AREA_HEADING[area],
      says: `${sentences.join(' ')}${here.length > 3 ? ` And ${here.length - 3} more.` : ''}`,
      from: `From ${inAList(sources)}.`,
      approved: here.every((r) => r.state === 'applied'),
      waitsOn: waits ? `It can be approved once you decide ${waits.title.charAt(0).toLowerCase()}${waits.title.slice(1)}.` : null,
    };
  }).filter((a): a is NonNullable<typeof a> => !!a);
  return {
    title: 'Set up from your documents',
    intro: 'Drop in what you already have. Groundwork shows what it will set up, area by area, and where each part came from. Nothing is set up until you approve that area.',
    added: documents.length ? `Added ${inAList(documents.map(theDocument))}.` : null,
    decideFirst: disagree,
    areas,
    noDocuments: `No documents? The same setup can be done by talking it through in ${askName}.`,
  };
}

/**
 * What approving these rules writes into the suites (Hafsah's decision, 25 October: approved rules become real settings; nothing
 * becomes a setting without that approval). The leave days, notice and proforma limit; the most hours a day and the day a week locks;
 * and a second approval above an amount, with the people the rule names in order (turned into the roles they hold by the service).
 */
export interface TheSuiteSettings {
  leaveDays?: number; noticeDays?: number; quoteAbove?: number;
  mostHoursADay?: number; weekLocksOn?: string;
  approvalAbove?: { amount: number; names: string[]; says: string };
}

/** The people a rule names, in order: "Spending over KES 50,000 needs Grace’s approval, then Amani’s." gives Grace, then Amani. */
export function theNamesInARule(says: string): string[] {
  const NOT_NAMES = new Set(['Spending', 'Anything', 'Sales', 'Leave', 'Ask', 'No', 'A', 'The', 'KES', 'NGN', 'USD', 'More', 'Customers', 'Staff', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday', 'Your']);
  return [...says.matchAll(/\b([A-Z][a-z]{1,30})(?:’s|'s)?\b/g)].map((m) => m[1]).filter((w, i, all) => !NOT_NAMES.has(w) && all.indexOf(w) === i);
}

export function whatApprovingWrites(rules: ARule[]): TheSuiteSettings {
  const out: TheSuiteSettings = {};
  const n = (r: ARule) => (r.value && /^\d+(\.\d+)?$/.test(r.value) ? Number(r.value) : null);
  for (const r of rules) {
    if (r.state === 'set aside' || !r.measure) continue;
    if (r.measure === 'time.locksOn' && r.value && /^[A-Z][a-z]+day$/.test(r.value)) out.weekLocksOn = r.value.toLowerCase();
    const v = n(r);
    if (v === null) continue;
    if (r.measure === 'leave.days' && Number.isInteger(v) && v >= 0 && v <= 365) out.leaveDays = v;
    if (r.measure === 'leave.noticeDays' && Number.isInteger(v) && v >= 0 && v <= 365) out.noticeDays = v;
    if (r.measure === 'spend.quoteAbove' && v >= 0) out.quoteAbove = v;
    if (r.measure === 'time.hoursADay' && v >= 1 && v <= 24) out.mostHoursADay = v;
    if (r.measure === 'spend.approvalAbove' && v > 0) { const names = theNamesInARule(r.says); if (names.length) out.approvalAbove = { amount: v, names, says: r.says }; }
  }
  return out;
}

/** The applied rules as one document Ask answers from, in the board's own sentences. */
export function thePolicyAsADocument(orgName: string, rules: ARule[]): string {
  const applied = rules.filter((r) => r.state === 'applied');
  return THE_AREAS
    .map((area) => {
      const here = applied.filter((r) => r.area === area);
      return here.length ? `${AREA_HEADING[area]}\n${here.map((r) => `${r.says} ${theRuleFacts(r)}`).join('\n')}` : '';
    })
    .filter(Boolean)
    .join('\n\n')
    .replace(/^/, `The rules ${orgName} runs on, as approved on its policy board.\n\n`);
}
