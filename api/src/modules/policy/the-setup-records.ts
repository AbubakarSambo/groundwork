/**
 * RELEASE 9: THE OTHER SETUP AREAS (the prototype's "Set up from your documents": People and sign-in, Teams and who approves what,
 * Clients, Direction, The role map). The same reading of a document that finds its rules also finds these records. Each is kept as
 * proposed with where it came from, and approving its area writes it into the product's own store: the staff directory, the clients
 * list, the direction (as what the organisation currently believes until a person confirms it), and the role map. Nobody is invited
 * or written to: "Each person is invited when their team starts using Groundwork."
 *
 * THIS FILE IS THE PURE PART: what the model is asked for, what of its answer is kept, and how each area reads.
 */

export type ARecordArea = 'people' | 'teams' | 'clients' | 'direction' | 'roles';
export const RECORD_AREAS: ARecordArea[] = ['people', 'teams', 'clients', 'direction', 'roles'];
export const RECORD_AREA_HEADING: Record<ARecordArea, string> = {
  people: 'People and sign-in', teams: 'Teams and who approves what', clients: 'Clients', direction: 'Direction', roles: 'The role map',
};

export interface APersonRead { name: string; email: string | null; title: string | null; team: string | null; manager: string | null }
export interface ATeamRead { team: string; manager: string | null }
export interface AClientRead { name: string; owner: string | null }
export interface AGoalRead { goal: string }
export interface ARoleRead { role: string; owns: string | null }
export type ARecordRead =
  | { area: 'people'; data: APersonRead } | { area: 'teams'; data: ATeamRead } | { area: 'clients'; data: AClientRead }
  | { area: 'direction'; data: AGoalRead } | { area: 'roles'; data: ARoleRead };

/** Added to what the model is asked for each document, beside its rules. */
export const RECORDS_FROM_A_DOCUMENT_PROMPT = [
  'Also list the records the document holds, where it holds them, and never invent one:',
  'people (a staff list: each person\'s name, email, job title, team and manager), teams (an org chart: each team and its manager),',
  'clients (a client list: each client and the person who owns it), goals (a strategy: each goal the organisation sets itself),',
  'and roles (job descriptions: each role and, in one sentence, what it owns).',
].join(' ');

export const RECORDS_SCHEMA_PROPERTIES = {
  people: { type: 'array', items: { type: 'object', properties: { name: { type: 'string' }, email: { type: 'string' }, title: { type: 'string' }, team: { type: 'string' }, manager: { type: 'string' } }, required: ['name'] } },
  teams: { type: 'array', items: { type: 'object', properties: { team: { type: 'string' }, manager: { type: 'string' } }, required: ['team'] } },
  clients: { type: 'array', items: { type: 'object', properties: { name: { type: 'string' }, owner: { type: 'string' } }, required: ['name'] } },
  goals: { type: 'array', items: { type: 'object', properties: { goal: { type: 'string' } }, required: ['goal'] } },
  roles: { type: 'array', items: { type: 'object', properties: { role: { type: 'string' }, owns: { type: 'string' } }, required: ['role'] } },
};

const MOST = 2000;
const text = (x: unknown, max = 160): string | null => {
  if (typeof x !== 'string') return null;
  const t = x.replace(/\s+/g, ' ').trim();
  return t && t.length <= max ? t : null;
};
const anEmail = (x: unknown): string | null => { const t = text(x, 200)?.toLowerCase() ?? null; return t && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(t) ? t : null; };
const asASentence = (t: string) => { const s = t.charAt(0).toUpperCase() + t.slice(1); return /[.!?]$/.test(s) ? s : `${s}.`; };

/** What of the model's answer is kept: each record with the one thing it must have, and nothing twice. */
export function onlyTheRecordsThatHold(answer: unknown): ARecordRead[] {
  const a = (answer && typeof answer === 'object' ? answer : {}) as Record<string, unknown>;
  const list = (k: string) => (Array.isArray(a[k]) ? (a[k] as any[]).slice(0, MOST) : []);
  const out: ARecordRead[] = [];
  const seen = new Set<string>();
  const once = (k: string) => { const key = k.toLowerCase(); if (seen.has(key)) return false; seen.add(key); return true; };
  for (const p of list('people')) { const name = text(p?.name, 80); if (name && once(`p|${anEmail(p?.email) ?? name}`)) out.push({ area: 'people', data: { name, email: anEmail(p?.email), title: text(p?.title, 80), team: text(p?.team, 80), manager: text(p?.manager, 80) } }); }
  for (const t of list('teams')) { const team = text(t?.team, 80); if (team && once(`t|${team}`)) out.push({ area: 'teams', data: { team, manager: text(t?.manager, 80) } }); }
  for (const c of list('clients')) { const name = text(c?.name, 120); if (name && once(`c|${name}`)) out.push({ area: 'clients', data: { name, owner: text(c?.owner, 80) } }); }
  for (const g of list('goals')) { const goal = text(g?.goal, 200); if (goal && once(`g|${goal}`)) out.push({ area: 'direction', data: { goal: asASentence(goal) } }); }
  for (const r of list('roles')) { const role = text(r?.role, 80); if (role && once(`r|${role}`)) out.push({ area: 'roles', data: { role, owns: text(r?.owns, 240) ? asASentence(text(r?.owns, 240)!) : null } }); }
  return out;
}

export interface ARecordKept { id: string; area: ARecordArea; data: any; document: string; where: string | null; state: 'proposed' | 'applied' }

const inAList = (xs: string[]) => (xs.length <= 1 ? xs.join('') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`);
const theDocument = (name: string) => (/^the\b/i.test(name) ? name.charAt(0).toLowerCase() + name.slice(1) : `the ${name.charAt(0).toLowerCase()}${name.slice(1)}`);
const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/** Each record area as the setup page reads it, in the prototype's words, with where it came from. */
export function theRecordAreas(items: ARecordKept[]): { area: ARecordArea; heading: string; says: string; from: string; approved: boolean; waitsOn: null }[] {
  return RECORD_AREAS.map((area) => {
    const here = items.filter((i) => i.area === area);
    if (!here.length) return null;
    const n = here.length;
    const withManagers = here.filter((i) => i.data?.manager).length;
    const withOwners = here.filter((i) => i.data?.owner).length;
    const says = area === 'people' ? `${plural(n, 'person', 'people')}, from the staff list. Each person is invited when their team starts using Groundwork.`
      : area === 'teams' ? `${plural(n, 'team', 'teams')}${withManagers ? ` and ${withManagers === n ? 'their' : `${withManagers} of their`} managers` : ''}, from the org chart.`
        : area === 'clients' ? `${plural(n, 'client', 'clients')}${withOwners ? `, ${withOwners === n ? 'each with its owner' : `${withOwners} with an owner`}` : ''}, from the client list.`
          : area === 'direction' ? `${plural(n, 'goal', 'goals')}, marked as what you currently believe until you confirm them.`
            : `${plural(n, 'role', 'roles')} and what each owns, from the job descriptions.`;
    const sources = [...new Set(here.map((i) => `${theDocument(i.document)}${i.where ? `, ${i.where}` : ''}`))];
    return { area, heading: RECORD_AREA_HEADING[area], says, from: `From ${inAList(sources.slice(0, 3))}${sources.length > 3 ? ` and ${sources.length - 3} more` : ''}.`, approved: here.every((i) => i.state === 'applied'), waitsOn: null };
  }).filter((x): x is NonNullable<typeof x> => !!x);
}

/** A key for the staff directory from what a staff list gives: the email, else the name. */
export const aDirectoryKey = (p: APersonRead) => `setup:${(p.email ?? p.name).toLowerCase().replace(/\s+/g, '-')}`;
/** A role map key from a role's name. */
export const aRoleKey = (role: string) => role.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60) || 'role';
