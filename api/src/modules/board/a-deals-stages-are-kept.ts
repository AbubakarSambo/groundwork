/**
 * EACH STAGE A DEAL IS PUT AT IS KEPT, WITH ITS DAY (Drop Access, 17 October 2026; Hafsah's answer: "the weekly report gives
 * check-ins made, deals that moved stage, deals won (proven and said), value won, new leads and deals that stalled").
 *
 * A deal kept only its stage now. When Kevin's Savannah Cafe went from Contacted to Quoted, the old stage was written over, so
 * nothing on record could say a deal moved stage this week. From now on, each time a check-in or the lead on the board puts a
 * deal at a stage it was not at, the stage and the day are added to the deal's own list of stages.
 *
 * KEPT ON THE DEAL'S OWN `fields`, under a key that is never served, like a claim on a record (a-claim-on-a-record-is-checked-
 * first): `plainFields` serves only text values, and this list is not text. No new column, and the details a reader sees are
 * unchanged.
 *
 * NEVER INVENTED. A deal that came onto the record before its stages were kept has no list. It is read as being at its stage
 * as of the day of the line its stage came from, and that is never counted as a move, because nothing on record says where it
 * was before.
 */
export const STAGES_KEPT = '_stages';

export interface AStageOnRecord {
  stage: string;
  /** The day it was put at this stage, as an ISO time. */
  on: string;
  /** Who put it there: a line said in a check-in, or the lead on the board. */
  by: 'check-in' | 'board';
  /** The first entry of a deal kept before its stages were: where it stood then, not a move to it. */
  asOf?: boolean;
}

const asObject = (fields: unknown): Record<string, unknown> =>
  fields && typeof fields === 'object' && !Array.isArray(fields) ? { ...(fields as Record<string, unknown>) } : {};

/** The stages kept on a deal, oldest first. Empty for a deal kept before its stages were. */
export function theStagesKept(fields: unknown): AStageOnRecord[] {
  const list = asObject(fields)[STAGES_KEPT];
  if (!Array.isArray(list)) return [];
  return list
    .filter((s: any) => s && typeof s.stage === 'string' && s.stage.trim() && typeof s.on === 'string' && !Number.isNaN(new Date(s.on).getTime()))
    .map((s: any) => ({ stage: s.stage, on: s.on, by: s.by === 'board' ? 'board' : 'check-in', ...(s.asOf ? { asOf: true } : {}) }));
}

const same = (a: string | null | undefined, b: string | null | undefined) => String(a ?? '').trim().toLowerCase() === String(b ?? '').trim().toLowerCase();

/**
 * The fields with this stage kept, where the deal was not already at it. `before` is where a deal kept before its stages were
 * stood, and since when: it is kept first, as where it stood, so the move from it is a move.
 */
export function withTheStageKept(
  fields: unknown,
  stage: string | null | undefined,
  at: Date,
  by: 'check-in' | 'board',
  before?: { stage: string | null | undefined; since: Date | null } | null,
): Record<string, unknown> {
  const out = asObject(fields);
  if (!stage || !String(stage).trim()) return out;
  const kept = theStagesKept(out);
  if (!kept.length && before?.stage && String(before.stage).trim()) {
    kept.push({ stage: String(before.stage).trim(), on: (before.since ?? at).toISOString(), by: 'check-in', asOf: true });
  }
  const last = kept[kept.length - 1];
  if (last && same(last.stage, stage)) return { ...out, [STAGES_KEPT]: kept };
  kept.push({ stage: String(stage).trim(), on: at.toISOString(), by });
  return { ...out, [STAGES_KEPT]: kept };
}

/** What the deal holds that is not one of its details, kept when its details are written again. */
export function theStagesToKeep(fields: unknown): Record<string, unknown> {
  const f = asObject(fields);
  const list = f[STAGES_KEPT];
  /* Which check-in said each of a deal's four criteria (a-deals-four-criteria) is kept the same way. */
  const said = f._criteriaSaid;
  return { ...(Array.isArray(list) ? { [STAGES_KEPT]: list } : {}), ...(said && typeof said === 'object' && !Array.isArray(said) ? { _criteriaSaid: said } : {}) };
}

/**
 * A deal's stages as the record shows them: the kept list, or, for a deal kept before its stages were, its stage as of the
 * day of the line it came from (or the day it came onto the record).
 */
export function theStagesOnRecord(d: { stage: string | null; stagesKept?: AStageOnRecord[]; stageSaidOn?: Date | null; firstOnRecordAt: Date }): AStageOnRecord[] {
  if (d.stagesKept && d.stagesKept.length) return d.stagesKept;
  if (!d.stage) return [];
  return [{ stage: d.stage, on: (d.stageSaidOn ?? d.firstOnRecordAt).toISOString(), by: 'check-in', asOf: true }];
}

/** The days, inside [from, to], on which the deal moved from one stage to another. A deal's first stage on record is not a move. */
export function theMovesBetween(stages: AStageOnRecord[], from: Date, to: Date): AStageOnRecord[] {
  const out: AStageOnRecord[] = [];
  for (let i = 1; i < stages.length; i += 1) {
    const t = new Date(stages[i].on).getTime();
    if (!same(stages[i].stage, stages[i - 1].stage) && t >= from.getTime() && t <= to.getTime()) out.push(stages[i]);
  }
  return out;
}

/** The day the record first shows the deal at the last stage, since it was last somewhere else. Null where it is not there now. */
export function theDayItWasWon(stages: AStageOnRecord[], lastStage: string): Date | null {
  if (!stages.length || !same(stages[stages.length - 1].stage, lastStage)) return null;
  let i = stages.length - 1;
  while (i > 0 && same(stages[i - 1].stage, lastStage)) i -= 1;
  return new Date(stages[i].on);
}
