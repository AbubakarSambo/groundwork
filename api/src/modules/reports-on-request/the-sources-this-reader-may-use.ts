/**
 * WHAT A REPORT ON REQUEST MAY DRAW ON, FOR THIS READER AND NO WIDER (Batch S, S8).
 *
 * Nothing here decides who may read what. Every read asks the rules that already decide it:
 *   - the check-ins: `checkInsTheyMayRead` (assistant/what-they-said-that-you-may-read.ts), which asks the one rule in
 *     grounds/who-may-read-this-check-in.ts, with the departments resolved. A lead whose department matches the lead who runs a check-in
 *     reads it at `shared` (leadsTheSameDepartment), never an evaluation check-in; a member never reads a department's check-ins.
 *   - each check-in is read at the level that rule gave: `lead` reads the team picture as the lead does; `own` (they take part) and `shared`
 *     (their department) read it only once it is released, as the report itself serves it. The names go through the one wrapper
 *     (reports/no-internal-label-reaches-anyone.ts): the lead reads names, a person in it reads what the check-in lets them read, and a
 *     department head who is not in it reads "a colleague". Only the synthesis is read, never anybody's own words.
 *   - the Desk: `theDeskInOneSentence`, the Company page's own read for this reader.
 *   - References and resources: the lines the lead keeps for the whole team, only on a check-in this reader runs or takes part in. Never a
 *     People note or anything kept about one person.
 *   - what they added: their own material for this one request, and nobody else's.
 */
import { checkInsTheyMayRead } from '../assistant/what-they-said-that-you-may-read';
import { theDeskInOneSentence } from '../assistant/a-quarter-or-a-year-by-asking';
import { whatEachLabelIsCalled, withoutInternalLabelsIn } from '../reports/no-internal-label-reaches-anyone';
import { peersAreNamedOn } from '../reports/peers-are-named';
import { aMaterialLabel, type ASource, type TheChannel } from './the-report-on-request';

/** What the lead keeps for the whole team, by who may read it. The lead reads them all; a person in the check-in reads the rules and decisions. */
const FOR_THE_LEAD = ['STAGE_NEEDS', 'COACHING', 'RISK', 'WAY_OF_WORKING', 'DECISION'];
const FOR_A_PERSON_IN_IT = ['WAY_OF_WORKING', 'DECISION'];

const asText = (x: unknown): string => (Array.isArray(x) ? x.map(asText).filter(Boolean).join(' ') : x && typeof x === 'object' ? Object.values(x as any).map(asText).filter(Boolean).join(' ') : typeof x === 'string' ? x.trim() : '');

export interface TheReader { userId: string; organizationId: string; role: string | null; email: string | null }

export async function theSourcesThisReaderMayUse(prisma: any, grounds: any, reader: TheReader, a: { requestId: string | null; channel: TheChannel }): Promise<ASource[]> {
  const out: ASource[] = [];
  let mayRead = await checkInsTheyMayRead(prisma, reader);
  /*
   * A DEPARTMENT HEAD'S REPORT IS ON HER DEPARTMENT (Batch S round 2, T8). Neema, head of operations, asked for a report for operations and
   * read twelve lines about every department. A lead or an admin with a department on People reads, for this report, the check-ins run by somebody in
   * that department, her own included. This only narrows what the one rule already lets her read; it never widens it.
   */
  const mine: any = await prisma.person.findFirst({ where: { organizationId: reader.organizationId, linkedUserId: reader.userId }, select: { department: true } }).catch(() => null);
  const department = String(mine?.department ?? '').trim();
  if (department && (reader.role === 'LEAD' || reader.role === 'ADMIN') && mayRead.length) {
    const leads = [...new Set(mayRead.map((g: any) => g.initiatorId).filter(Boolean))];
    const theirs: any[] = (await prisma.person.findMany({ where: { organizationId: reader.organizationId, linkedUserId: { in: leads } }, select: { linkedUserId: true, department: true } }).catch(() => [])) ?? [];
    const inIt = new Set(theirs.filter((p) => String(p.department ?? '').trim() === department).map((p) => p.linkedUserId));
    mayRead = mayRead.filter((g: any) => g.initiatorId === reader.userId || inIt.has(g.initiatorId));
  }
  /* A check-in the lead keeps in the app is not read on WhatsApp (a-check-in-kept-in-the-app-is-not-read-on-whatsapp.ts). */
  if (a.channel === 'whatsapp' && mayRead.length) {
    const kept: any[] = (await prisma.ground.findMany({ where: { id: { in: mayRead.map((g: any) => g.id) }, overWhatsApp: false }, select: { id: true } }).catch(() => mayRead)) ?? [];
    const keptIds = new Set(kept.map((g) => g.id));
    mayRead = mayRead.filter((g: any) => !keptIds.has(g.id));
  }
  for (const g of mayRead as any[]) {
    const ground: any = await prisma.ground.findUnique({
      where: { id: g.id },
      select: {
        label: true, scenario: true, peersVisibleToEachOther: true,
        participants: { select: { id: true, userId: true, partyType: true, createdAt: true, email: true, nameGiven: true, organisationGiven: true, user: { select: { firstName: true, lastName: true, email: true } } } },
        report: { select: { theOpening: true, sharedPicture: true, agreements: true, divergences: true, centralQuestion: true, releasedAt: true } },
      },
    }).catch(() => null);
    if (!ground) continue;
    const name = String(ground.label ?? g.label ?? 'a check-in').replace(/[.\s]+$/, '');
    const me = (ground.participants ?? []).find((p: any) => p.userId === reader.userId) ?? null;
    const level = g.level as 'lead' | 'own' | 'shared';
    const r = ground.report;
    /* Before it is released, only the lead reads the team's picture (decision 76, item 4). */
    if (r && (level === 'lead' || r.releasedAt)) {
      const called = whatEachLabelIsCalled(ground.participants ?? [], level === 'lead'
        ? { viewerIsLead: true, viewerParticipantId: me?.id ?? null, peersAreNamed: true, readerIsYou: true }
        : level === 'own'
          ? { viewerIsLead: false, viewerParticipantId: me?.id ?? null, peersAreNamed: peersAreNamedOn(ground, { participantId: me?.id ?? null } as any), readerIsYou: true }
          : { viewerIsLead: false, viewerParticipantId: null, peersAreNamed: false });
      const picture = withoutInternalLabelsIn({
        opening: asText(r.theOpening) || asText(r.sharedPicture),
        agree: asText(r.agreements), differ: asText(r.divergences), question: asText(r.centralQuestion),
      }, called);
      const text = [picture.opening, picture.agree && `Where people agree. ${picture.agree}`, picture.differ && `Where people see it differently. ${picture.differ}`, picture.question && `The open question. ${picture.question}`].filter(Boolean).join('\n');
      if (text.trim()) out.push({ id: `checkin:${g.id}`, kind: 'check_in', name, label: `the report on "${name}"`, text });
    }
    if (level === 'lead' || level === 'own') {
      const lines: any[] = (await prisma.groundContextItem.findMany({
        where: { groundId: g.id, closedAt: null, audience: 'EVERYONE', kind: { in: level === 'lead' ? FOR_THE_LEAD : FOR_A_PERSON_IN_IT } },
        select: { text: true }, orderBy: { createdAt: 'asc' }, take: 40,
      }).catch(() => [])) ?? [];
      const said = lines.map((l) => String(l.text ?? '').trim()).filter(Boolean);
      if (said.length) out.push({ id: `refs:${g.id}`, kind: 'references', name, label: `References and resources for "${name}"`, text: said.map((s) => `- ${s}`).join('\n') });
    }
  }
  const desk = await theDeskInOneSentence(prisma, grounds, { userId: reader.userId, email: reader.email ?? '', organizationId: reader.organizationId, role: reader.role ?? 'MEMBER' }).catch(() => null);
  if (desk) out.push({ id: 'desk', kind: 'desk', name: 'the Desk', label: 'the Desk', text: `On the Desk, ${desk}` });
  if (a.requestId) {
    const added: any[] = (await prisma.reportMaterial.findMany({ where: { requestId: a.requestId, userId: reader.userId }, orderBy: { receivedAt: 'asc' } }).catch(() => [])) ?? [];
    for (const m of added) out.push({ id: `material:${m.id}`, kind: 'material', name: m.name, label: aMaterialLabel(m.via, m.name), text: String(m.text ?? '') });
  }
  return out;
}
