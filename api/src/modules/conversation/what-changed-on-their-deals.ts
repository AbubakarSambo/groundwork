import { RECORDS_FOR_EACH_KIND, stagesFor, type KindOfWork } from '../board/the-kind-of-work';
import { howALineIsKnown } from '../reports/how-a-line-is-known';
import { whatProvedIt, type ALineForTheCard } from './the-end-card';

/**
 * WHAT CHANGED ON YOUR DEALS, AT THE END OF A CHECK-IN (sales-first.md, section 5; the light
 * prototype's done page, docs/prototype/screens/B3-the-check-in/done.txt).
 *
 * The done page has drawn this part since request 7, but nothing ever sent it, so it never showed.
 * It is built here from the record, after the person's own lines are written:
 *
 *   - only their own deals (records they own on this check-in), never anybody else's;
 *   - only the ones a line from THIS check-in names, the way the board ties a record to its line;
 *   - each stage up to the deal's stage carries one mark: proven where one of their own lines about it,
 *     today's or earlier, is backed by their own document, and their word otherwise;
 *   - one sentence says how: "From the photo you added." only when such a document backs it, and
 *     otherwise "You said this. A photo would prove it." (the prototype's own truth fix, s68 and s71).
 *     A photo is never claimed when none was added.
 *
 * A plan ("I will visit Westgate Deli on Friday") is not a change to the deal, so a deal only a
 * commitment names is left out. Nothing here is written: it is read when the check-in completes.
 */

export interface ADealOfTheirs {
  name: string;
  kind: string;
  stage: string | null;
}

export interface ALineFromToday extends ALineForTheCard {}

export interface WhatChangedOnTheirDeals {
  title: string;
  items: { name: string; says: string; stages: { name: string; mark: 'proven' | 'said' | 'none' }[] }[];
}

export const NOT_PROVEN_YET = 'You said this. A photo would prove it.';

const squash = (s: string) => s.toLowerCase().replace(/[‘’“”'"]/g, '').replace(/\s+/g, ' ').trim();

export function whatChangedOnTheirDeals(
  kind: KindOfWork | null,
  leadsStages: unknown,
  deals: readonly ADealOfTheirs[],
  linesFromToday: readonly ALineFromToday[],
  /** Every one of their own lines on this check-in, today's included, for whether a document backs the deal. */
  allTheirLines: readonly ALineFromToday[] = linesFromToday,
): WhatChangedOnTheirDeals | null {
  if (!kind) return null;
  const sections = RECORDS_FOR_EACH_KIND[kind] ?? [];
  const items: WhatChangedOnTheirDeals['items'] = [];
  let holds: string | null = null;
  const lines = (linesFromToday ?? []).filter((l) => !l.disputedAt && l.type !== 'COMMITMENT' && String(l.text ?? '').trim());
  for (const d of deals ?? []) {
    const section = sections.find((s) => s.itemKinds.includes(d.kind) && s.stages);
    if (!section || !d.name?.trim()) continue;
    const about = lines.filter((l) => squash(String(l.text)).includes(squash(d.name)));
    if (!about.length) continue;
    const proof = (allTheirLines ?? []).find((l) => !l.disputedAt && squash(String(l.text ?? '')).includes(squash(d.name)) && howALineIsKnown(l) === 'proven');
    const stages = stagesFor(section, leadsStages) ?? [];
    const at = stages.findIndex((s) => s.toLowerCase() === String(d.stage ?? '').trim().toLowerCase());
    const mark: 'proven' | 'said' = proof ? 'proven' : 'said';
    items.push({
      name: d.name.trim(),
      says: proof ? whatProvedIt(proof) : NOT_PROVEN_YET,
      stages: stages.map((name, i) => ({ name, mark: at >= 0 && i <= at ? mark : 'none' })),
    });
    holds = holds ?? section.holds;
  }
  if (!items.length) return null;
  return { title: `What changed on your ${holds}`, items };
}
