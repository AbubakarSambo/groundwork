import type { AnItem, TheAssessment } from '../conversation/the-assessment';
import { THE_LEAD_AND_WHOM_IT_IS_ABOUT } from '../conversation/the-assessment';
import type { TheRecordAcrossTime } from '../patterns/patterns-across-the-assessments';
import { NOW_PARTS, WHAT_CHANGED_PARTS, type ADirectionNow, type AWhatChanged } from '../direction/the-direction';
import { pathOf, theDay, type AFileToWrite, type ASection, type AStatement, type Cite } from './the-memory-format';

/**
 * THE BUILDERS: what each memory file says, made from the assessments and the record, and nothing else (docs/groundwork-memory-system.md,
 * section 3). Pure. Every statement cites what it rests on; which section it is in decides who reads it, and that is decided here from what
 * the item is and whom it is about, never by a model.
 *
 * WHAT NEVER GOES IN A FILE, so no reader can be served it from one: a person's wellbeing (`the person only`), what a team member said
 * against the person who runs the check-in (`the person and who hears a complaint`), and the part of an assessment kept from the lead. Those
 * stay where they are, and the one rule that serves them (whoMaySee) is not copied into a second place.
 *
 * Files stay short: the newest few statements of each kind, not everything ever said. The detail lives in the assessments.
 */

export const MOST_STATEMENTS_IN_A_SECTION = 6;

const sentence = (s: string) => { const t = s.replace(/\s+/g, ' ').trim(); return /[.!?]$/.test(t) ? t : `${t}.`; };
const lower = (s: string) => (s ? s.charAt(0).toLowerCase() + s.slice(1) : s);
const str = (v: unknown) => (typeof v === 'string' ? v.trim() : '');

/** One person's newest assessments, newest first. */
export interface AnAssessmentOf { checkInId: string; groundId: string; participantId: string; sessionNumber: number; on: string; assessment: TheAssessment }

export interface AboutAPerson { participantId: string; groundId: string; userId: string | null; name: string; leftAt: Date | null }

const mine = (a: AnAssessmentOf): Cite => `a:${a.checkInId}`;

function section(key: string, title: string, readers: ASection['readers'], statements: AStatement[]): ASection {
  return { key, title, readers, statements: statements.slice(0, MOST_STATEMENTS_IN_A_SECTION) };
}

/** Items a person said in their own check-in, which the people in it may read. The one rule that says so is the assessment's (whoMaySee), stored on the item. */
const inTheCheckIn = (items: AnItem[] | undefined) => (items ?? []).filter((i) => i.whoMaySee === 'the people in this check-in');

export interface PersonInput {
  person: AboutAPerson;
  /** Their own assessments, newest first. */
  theirs: AnAssessmentOf[];
  /** What whoever runs their check-in said about their work in her own check-ins (the lead's newest assessments), newest first. */
  saidAboutThem: AnAssessmentOf[];
  /** Layer 2 for them: patterns, the role they play, where their effort goes. Null when the organisation keeps judgements of a person off. */
  record: TheRecordAcrossTime | null;
  /** The newest assessment the record sits on. */
  recordFrom: AnAssessmentOf | null;
  /** The coaching step given and what became of the earlier ones. Null when judgements are off. */
  coaching: { currentStep: string | null; history: { step: string; outcome: string | null }[] } | null;
  /** The lead's private notes about them. */
  leadNotes: { id: string; text: string; createdAt: Date }[];
  now: Date;
}

export function buildPersonFile(i: PersonInput): AFileToWrite {
  const day = theDay(i.now);
  const name = i.person.name;
  const newest = i.theirs[0] ?? null;
  const used: Cite[] = [];
  const cited = (c: Cite[]) => { for (const x of c) if (!used.includes(x)) used.push(x); return [...new Set(c)]; };

  const work: AStatement[] = [];
  if (newest) {
    const a = newest.assessment;
    const asOf = newest.on;
    for (const w of inTheCheckIn(a.workUpdates)) {
      const what = str(w.work) || str(w.words);
      if (!what) continue;
      work.push({ text: sentence(`Work on ${what}${str(w.stage) ? ` is at ${str(w.stage)}` : ' was mentioned'}${str(w.nextStep) ? `, and the next step is ${str(w.nextStep)}` : ''}`), cites: cited([mine(newest)]), asOf });
    }
    for (const b of inTheCheckIn(a.blockers)) {
      if (str(b.state) === 'cleared' || str(b.status).toLowerCase() === 'cleared') continue;
      const what = str(b.what) || str(b.words);
      if (what) work.push({ text: sentence(`${name} is waiting for ${what}${str(b.onName) ? ` from ${str(b.onName)}` : ''}${str(b.since) ? `, since ${str(b.since)}` : ''}`), cites: cited([mine(newest)]), asOf });
    }
    for (const p of inTheCheckIn(a.promises).filter((x) => x.byThePerson === true)) {
      const what = str(p.clear) || str(p.action) || str(p.words);
      if (what) work.push({ text: sentence(`${name} promised to ${lower(what).replace(/^(i will |i'll |will |to )/i, '')}${str(p.when) ? `, ${str(p.when)}` : ''}`), cites: cited([mine(newest)]), asOf });
    }
    for (const c of inTheCheckIn(a.claims)) {
      const what = str(c.claim) || str(c.words);
      if (what) work.push({ text: sentence(`${name} said ${lower(what)}, and it is ${c.proof === 'proved' ? 'proved' : 'not yet proved'}`), cites: cited([mine(newest)]), asOf });
    }
  }
  if (i.theirs.length) work.push({ text: `${name} has ${i.theirs.length === 1 ? 'one check-in' : `${i.theirs.length} check-ins`} on the record here.`, cites: cited(i.theirs.map(mine)), asOf: i.theirs[0].on });

  /* What the lead said about this person's work: the lead and that person read it, exactly as the assessment already decided. Only what she said word for word. */
  const leadSaid: AStatement[] = [];
  for (const l of i.saidAboutThem) {
    const items = [...(l.assessment.workUpdates ?? []), ...(l.assessment.claims ?? []), ...(l.assessment.numbers ?? []), ...(l.assessment.everythingElse ?? []), ...(l.assessment.observations ?? [])]
      .filter((x) => x.whoMaySee === THE_LEAD_AND_WHOM_IT_IS_ABOUT && x.aboutParticipantId === i.person.participantId && x.saidWordForWord === true && str(x.words));
    for (const x of items) leadSaid.push({ text: `The lead said about ${name}'s work, "${str(x.words)}"`, cites: cited([mine(l)]), asOf: l.on });
  }

  const lead: AStatement[] = [];
  const rec = i.record, from = i.recordFrom;
  if (rec && from) {
    if (rec.role) lead.push({ text: sentence(rec.role.saying), cites: cited([mine(from), ...rec.role.playing.map((p) => `a:${p.checkInId}` as Cite)]), asOf: from.on });
    if (rec.focus) lead.push({ text: sentence(rec.focus.saying), cites: cited([mine(from)]), asOf: from.on });
    for (const p of rec.patterns.filter((x) => x.state === 'holds')) {
      const checkIns = [...new Set(p.instances.map((x) => x.checkInId))];
      lead.push({
        text: `${sentence(p.saying)} This rests on ${p.instances.length === 1 ? 'one thing' : `${p.instances.length} separate things`} from ${checkIns.length === 1 ? 'one check-in' : `${checkIns.length} check-ins`}.`,
        cites: cited(checkIns.map((c) => `a:${c}` as Cite)), asOf: from.on,
      });
    }
  }

  const coaching: AStatement[] = [];
  if (i.coaching) {
    if (i.coaching.currentStep) coaching.push({ text: sentence(`The step ${name} was last given is ${lower(i.coaching.currentStep)}`), cites: cited([`r:coaching:${i.person.participantId}`]), asOf: day });
    for (const h of i.coaching.history.filter((x) => x.step && x.outcome).slice(-3)) coaching.push({ text: sentence(`An earlier step, ${lower(h.step)}, came to this: ${h.outcome}`), cites: cited([`r:coaching:${i.person.participantId}`]), asOf: day });
  }

  const notes: AStatement[] = i.leadNotes.map((n) => ({ text: sentence(n.text), cites: cited([`r:note:${n.id}`]), asOf: theDay(n.createdAt) }));

  return {
    path: pathOf('person', i.person.participantId), kind: 'person',
    header: { subject: { kind: 'person', id: i.person.participantId, label: name }, scope: { groundId: i.person.groundId, participantId: i.person.participantId }, writer: 'the memory writer', builtFrom: used },
    sections: [
      section('their-work', 'Their work', ['person', 'lead'], work),
      section('what-the-lead-said', 'What the lead has said about their work', ['person', 'lead'], leadSaid),
      section('how-they-work', 'The role they play and how they tend to work', ['lead'], lead),
      section('coaching', 'Coaching given', ['person', 'lead'], coaching),
      section('private-notes', "The lead's private notes", ['lead'], notes),
    ],
  };
}

/** What a person who has left keeps in memory: the header and nothing else. */
export function retiredPersonFile(p: AboutAPerson): AFileToWrite {
  return { path: pathOf('person', p.participantId), kind: 'person', header: { subject: { kind: 'person', id: p.participantId, label: p.name }, scope: { groundId: p.groundId, participantId: p.participantId }, writer: 'the memory writer', builtFrom: [], retired: true }, sections: [] };
}

export interface TeamInput {
  ground: { id: string; label: string; toldToParticipants: string | null; brief: string | null; kindOfWork: string | null; workStages: unknown };
  objectives: { id: string; name: string; target: number | null }[];
  /** The lead's own newest assessment that holds her setup, when there is one. */
  setup: AnAssessmentOf | null;
  /** Each current person's newest assessment, for the waits the lead should know about. */
  newest: (AnAssessmentOf & { name: string })[];
  now: Date;
}

export function buildTeamFile(i: TeamInput): AFileToWrite {
  const day = theDay(i.now);
  const used: Cite[] = [];
  const cited = (c: Cite[]) => { for (const x of c) if (!used.includes(x)) used.push(x); return [...new Set(c)]; };
  const g = i.ground;
  const purpose: AStatement[] = [];
  if (str(g.toldToParticipants)) purpose.push({ text: sentence(str(g.toldToParticipants)), cites: cited([`r:ground:${g.id}`]), asOf: day });
  if (str(g.kindOfWork)) purpose.push({ text: sentence(`This check-in is about ${lower(str(g.kindOfWork))}`), cites: cited([`r:ground:${g.id}`]), asOf: day });
  for (const o of i.objectives) purpose.push({ text: o.target == null ? sentence(`A target of the team is ${o.name}`) : sentence(`A target of the team is ${o.name}, at ${o.target}`), cites: cited([`r:objective:${o.id}`]), asOf: day });
  const stages = Array.isArray(g.workStages) ? (g.workStages as unknown[]).map((s) => (typeof s === 'string' ? s : str((s as any)?.name))).filter(Boolean) : [];
  const moves: AStatement[] = stages.length ? [{ text: sentence(`Work here moves through these stages, in order: ${stages.join(', ')}`), cites: cited([`r:ground:${g.id}`]), asOf: day }] : [];

  const leads: AStatement[] = [];
  if (str(g.brief)) leads.push({ text: sentence(`The lead's brief for this check-in is ${lower(str(g.brief))}`), cites: cited([`r:ground:${g.id}`]), asOf: day });
  if (i.setup) {
    const s = i.setup.assessment.setup;
    for (const [k, said] of [['rules', 'A rule the lead set is'], ['risks', 'A risk the lead named is'], ['strategy', 'The lead means to get there by']] as const) {
      for (const it of (s?.[k] ?? []).slice(0, 3)) if (str(it.words)) leads.push({ text: sentence(`${said} ${lower(str(it.words))}`), cites: cited([mine(i.setup)]), asOf: i.setup.on });
    }
  }
  const waits: AStatement[] = [];
  for (const n of i.newest) {
    for (const b of inTheCheckIn(n.assessment.blockers)) {
      if (str(b.state) === 'cleared' || str(b.status).toLowerCase() === 'cleared') continue;
      const what = str(b.what) || str(b.words);
      if (what) waits.push({ text: sentence(`${n.name} is waiting for ${what}${str(b.onName) ? ` from ${str(b.onName)}` : ''}`), cites: cited([mine(n)]), asOf: n.on });
    }
  }
  return {
    path: pathOf('team', g.id), kind: 'team',
    header: { subject: { kind: 'team', id: g.id, label: g.label }, scope: { groundId: g.id }, writer: 'the memory writer', builtFrom: used },
    sections: [
      section('purpose-and-targets', 'What the team is for and aims at', ['team', 'lead'], purpose),
      section('how-the-work-moves', 'How the work moves', ['team', 'lead'], moves),
      section('what-the-lead-expects', 'What the lead expects and the risks she named', ['lead'], leads),
      section('open-waits', 'What people on the team are waiting for', ['lead'], waits),
    ],
  };
}

export interface OrgInput {
  organization: { id: string; name: string };
  direction: { id: string; version: number; setAt: Date; now: ADirectionNow; whatChanged: AWhatChanged } | null;
  kept: { id: string; kind: string; text: string; keptAt: Date | null }[];
  roles: { id: string; name: string; description: string | null }[];
  policies: { id: string; name: string }[];
  teams: { id: string; label: string }[];
  /** What this organisation's own record has shown about what works here (learning, stage 1), never anything from another organisation. */
  learned?: { id: string; text: string }[];
  now: Date;
}

const KEPT_AS: Record<string, string> = { rule: 'A rule here is', definition: 'A definition here is', principle: 'A principle here is', owner: 'An owner here is', client: 'A client here is' };

export function buildOrgFile(i: OrgInput): AFileToWrite {
  const day = theDay(i.now);
  const used: Cite[] = [];
  const cited = (c: Cite[]) => { for (const x of c) if (!used.includes(x)) used.push(x); return [...new Set(c)]; };
  const everyone: AStatement[] = [{ text: sentence(`${i.organization.name} uses Groundwork for ${i.teams.length === 1 ? 'one team check-in' : `${i.teams.length} team check-ins`}`), cites: cited([`r:organization:${i.organization.id}`]), asOf: day }];
  const d = i.direction;
  const direction: AStatement[] = [];
  const changed: AStatement[] = [];
  if (d) {
    const asOf = theDay(d.setAt);
    for (const [k, label] of NOW_PARTS) if (str(d.now[k])) direction.push({ text: sentence(`${label.replace(/’/g, "'")} is ${lower(str(d.now[k]))}`), cites: cited([`r:direction:${d.id}`]), asOf });
    for (const [k, label] of WHAT_CHANGED_PARTS) if (str(d.whatChanged[k])) changed.push({ text: sentence(`${label.replace(/[.]$/, '').replace(/’/g, "'")} was ${lower(str(d.whatChanged[k]))}`), cites: cited([`r:direction:${d.id}`]), asOf });
  }
  const kept: AStatement[] = i.kept.map((k) => ({ text: sentence(`${KEPT_AS[k.kind] ?? 'Something kept here is'} ${lower(k.text.replace(/[.!?]+$/, ''))}`), cites: cited([`r:memory:${k.id}`]), asOf: theDay(k.keptAt ?? i.now) }));
  const roles: AStatement[] = i.roles.map((r) => ({ text: sentence(`The role ${r.name} exists here${r.description ? `, and it means ${lower(r.description.replace(/[.!?]+$/, ''))}` : ''}`), cites: cited([`r:role:${r.id}`]), asOf: day }));
  const policies: AStatement[] = i.policies.map((p) => ({ text: sentence(`The policy "${p.name}" is on the Desk`), cites: cited([`r:policy:${p.id}`]), asOf: day }));
  const teams: AStatement[] = i.teams.map((t) => ({ text: sentence(`There is a team check-in called ${t.label}`), cites: cited([`r:ground:${t.id}`]), asOf: day }));
  const learned: AStatement[] = (i.learned ?? []).map((l) => ({ text: l.text, cites: cited([`r:learning:${l.id}`]), asOf: day }));
  return {
    path: pathOf('org'), kind: 'org',
    header: { subject: { kind: 'org', id: null, label: i.organization.name }, scope: {}, writer: 'the memory writer', builtFrom: used },
    sections: [
      section('the-organisation', 'The organisation', ['everyone'], everyone),
      section('direction', 'Where the organisation is heading', ['everyone'], direction),
      section('what-changed', 'What has changed and why', ['everyone'], changed),
      section('kept', 'What a lead has confirmed about how things work', ['leaders'], kept),
      section('roles', 'Roles', ['leaders'], roles),
      section('policies', 'Policies on the Desk', ['leaders'], policies),
      section('teams', 'Teams', ['leaders'], teams),
      section('what-we-have-learned-here', 'What has worked here, from this organisation\'s own record', ['admin'], learned),
    ],
  };
}

export interface ProjectInput {
  subject: { id: string; title: string; measure: string | null; target: string | null; justification: string | null; approach: string | null; ownerName: string | null };
  /** The sign-in ids of the owner and the contributors, where they have one. */
  userIds: string[];
  now: Date;
}

export function buildProjectFile(i: ProjectInput): AFileToWrite {
  const day = theDay(i.now);
  const s = i.subject;
  const cite = [`r:subject:${s.id}`];
  const st: AStatement[] = [{ text: sentence(`The project is ${s.title}`), cites: cite, asOf: day }];
  if (s.ownerName) st.push({ text: sentence(`${s.ownerName} owns it`), cites: cite, asOf: day });
  if (str(s.measure)) st.push({ text: sentence(`It is measured by ${lower(str(s.measure))}`), cites: cite, asOf: day });
  if (str(s.target)) st.push({ text: sentence(`Its target is ${lower(str(s.target))}`), cites: cite, asOf: day });
  if (str(s.justification)) st.push({ text: sentence(`It matters because ${lower(str(s.justification))}`), cites: cite, asOf: day });
  if (str(s.approach)) st.push({ text: sentence(`The plan is to ${lower(str(s.approach))}`), cites: cite, asOf: day });
  return {
    path: pathOf('project', s.id), kind: 'project',
    header: { subject: { kind: 'project', id: s.id, label: s.title }, scope: { userIds: i.userIds }, writer: 'the memory writer', builtFrom: cite },
    sections: [section('the-project', 'The project', ['admin', 'project-people'], st)],
  };
}
