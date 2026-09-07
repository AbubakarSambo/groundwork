
/**
 * WHAT THE RUNS LEFT BEHIND, READ AS A PERSON WOULD READ IT.
 *
 * The journeys recorded what happened. This reads the artefacts they produced — every distinct
 * email, every chat transcript, every report — against the questions somebody actually has in
 * front of them: why am I getting this, what am I meant to do, who sees it, am I finished.
 */
import * as fs from 'fs';
import { PrismaClient } from '@prisma/client';

const ANSI = new RegExp(String.fromCharCode(27) + '\\[[0-9;]*m', 'g');
const found: { group: string; issue: string; evidence: string }[] = [];
const note = (group: string, issue: string, evidence: string) => found.push({ group, issue, evidence: evidence.slice(0, 200) });

function everyEmail() {
  const text = fs.readFileSync('/tmp/gw-api.log', 'utf8').replace(ANSI, '');
  const out: { subject: string; body: string; links: string[] }[] = [];
  const lines = text.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const head = lines[i].match(/\[DEV EMAIL\] To: (\S+) \| Subject: (.+)$/);
    if (!head) continue;
    const near = lines.slice(i + 1, i + 8);
    const body = (near.find((l) => l.includes('Body:')) ?? '').replace(/.*Body:\s*/, '');
    const links = (near.find((l) => l.includes('Links:')) ?? '').replace(/.*Links:\s*/, '').split(' ').filter(Boolean);
    out.push({ subject: head[2].trim(), body, links });
  }
  return out;
}

async function main() {
  const p = new PrismaClient();

  // ── every distinct email a journey caused ────────────────────────────────────────────────
  const mails = everyEmail();
  const bySubject = new Map<string, { subject: string; body: string; links: string[] }>();
  /* One row per KIND of email. Addresses and labels vary per journey; the letter does not. */
  const shape = (t: string) => t
    .replace(/[\w.+-]+@[\w.-]+/g, 'somebody')
    .replace(/J\d+ [A-Z_]+/g, 'a check-in')
    .replace(/"[^"]*"/g, '"a check-in"')
    .replace(/\s+/g, ' ')
    .trim();
  for (const m of mails) bySubject.set(shape(m.subject), m);
  console.log(`distinct emails seen: ${bySubject.size} (from ${mails.length} sent)`);

  for (const [, m] of bySubject) {
    const body = m.body.toLowerCase();
    if (!m.links.length) note('email UX', 'An email carries no link at all', `"${m.subject}"`);
    if (!/groundwork/.test(body)) note('email UX', 'An email never says what Groundwork is', `"${m.subject}": ${m.body.slice(0, 90)}`);
    if (/check in on|invited you/i.test(m.subject) && !/invited|asked/.test(body)) {
      note('email UX', 'An invitation does not say who invited them in the body', `"${m.subject}"`);
    }
    if (m.body.length < 60) note('email UX', 'An email is too short to explain itself', `"${m.subject}": ${m.body}`);
    if (/\bwe\b.*\bwe\b.*\bwe\b/.test(body) === false && /unsubscribe/.test(body) === false && /invited|check in|report/i.test(m.subject)) {
      note('email UX', 'A journey email offers no way to stop receiving them', `"${m.subject}"`);
    }
  }

  // ── what the chat actually said, across every check-in the runs produced ─────────────────
  const grounds = await p.ground.findMany({
    where: { label: { startsWith: 'J' } },
    include: { participants: { include: { checkIns: { include: { turns: true } } } }, report: true },
    orderBy: { createdAt: 'desc' },
    take: 120,
  });
  console.log(`check-ins examined: ${grounds.reduce((n, g) => n + g.participants.reduce((m, x) => m + x.checkIns.length, 0), 0)}`);

  let longest = 0; let mostTurns = 0; let repeats = 0; let robotic = 0; let jargon = 0; let noPrivacy = 0; let examined = 0;
  for (const g of grounds) {
    for (const party of g.participants) {
      for (const c of party.checkIns) {
        const assistant = c.turns.filter((t) => t.role === 'AI').map((t) => t.content ?? '');
        const person = c.turns.filter((t) => t.role === 'PERSON');
        if (!assistant.length) continue;
        examined++;

        const longestReply = Math.max(...assistant.map((a) => a.length));
        longest = Math.max(longest, longestReply);
        mostTurns = Math.max(mostTurns, assistant.length);

        const questions = assistant.map((a) => (a.match(/[^.?!]*\?/g) ?? []).map((q) => q.trim().toLowerCase())).flat();
        const seen = new Set<string>();
        for (const q of questions) { if (seen.has(q) && q.length > 25) repeats++; seen.add(q); }

        const all = assistant.join(' ').toLowerCase();
        if (/as an ai|i am an ai|language model|i cannot help with that/.test(all)) robotic++;
        if (/\bground\b/.test(all)) jargon++;
        /* Does anything in their own check-in tell them who reads this? */
        if (!/private|only you|nobody else|until both|shared with/.test(all)) noPrivacy++;
      }
    }
  }
  if (longest > 1200) note('setup chat', 'A single assistant reply runs to over a thousand characters', `longest seen: ${longest} characters`);
  if (mostTurns > 12) note('participant check-in chat', 'A check-in runs to a dozen or more assistant turns', `most seen: ${mostTurns} turns`);
  if (repeats > 0) note('participant check-in chat', 'The same question is asked twice in one check-in', `${repeats} repeats across ${examined} check-ins`);
  if (robotic > 0) note('participant check-in chat', 'The assistant talks like a chatbot', `${robotic} of ${examined}`);
  if (jargon > 0) note('trust/privacy UX', 'The word "ground" reaches somebody reading their own check-in', `${jargon} of ${examined} check-ins`);
  if (noPrivacy > 0) note('trust/privacy UX', 'A check-in never says who will read what somebody writes', `${noPrivacy} of ${examined} check-ins said nothing about it`);

  // ── the report, read as the first thing somebody has ever seen ───────────────────────────
  const reports = grounds.filter((g) => g.report?.releasedAt).map((g) => g.report!);
  console.log(`reports examined: ${reports.length}`);
  let noAlignment = 0; let noNext = 0; let noWhoSees = 0; let short = 0;
  for (const r of reports) {
    const text = JSON.stringify(r).toLowerCase();
    if (!/align/.test(text)) noAlignment++;
    if (!/next|what happens|from here|action/.test(text)) noNext++;
    if (!/who can see|visible|private|both parties|shared/.test(text)) noWhoSees++;
    if ((r.sharedPicture ?? '').length < 200) short++;
  }
  if (noAlignment) note('shared report', 'A report never uses the word alignment, which the product is about', `${noAlignment} of ${reports.length}`);
  if (noNext) note('shared report', 'A report does not say what happens next', `${noNext} of ${reports.length}`);
  if (noWhoSees) note('shared report', 'A report does not say who can see it', `${noWhoSees} of ${reports.length}`);
  if (short) note('shared report', 'A report is a few sentences long', `${short} of ${reports.length} under 200 characters`);

  // ── duplicate turns, which the double-press probe created ────────────────────────────────
  let dupes = 0;
  for (const g of grounds) for (const party of g.participants) for (const c of party.checkIns) {
    const said = c.turns.filter((t) => t.role === 'PERSON').map((t) => (t.content ?? '').trim());
    if (new Set(said).size < said.length) dupes++;
  }
  if (dupes) note('completion', 'The record holds the same answer twice where somebody pressed send again', `${dupes} check-ins`);

  for (const line of await whatTheRecordSays(p)) note('shared report', line, 'read from the reports the run produced');

  fs.writeFileSync('journey/hundred/examined.json', JSON.stringify(found, null, 1));
  console.log(`\nfound ${found.length} things worth reporting:`);
  for (const f of found) console.log(`  [${f.group}] ${f.issue}\n       ${f.evidence}`);
  await p.$disconnect();
}
main();

/**
 * WHAT THE RECORD ACTUALLY SAYS.
 *
 * The funnel says people reached a report. This asks whether the report was worth reaching: a
 * record that does not distinguish what was agreed from what was not, or say what happens next,
 * has taken somebody's ten minutes and given them prose.
 */
export async function whatTheRecordSays(prisma: any) {
  const findings: string[] = [];
  const reports = await prisma.report.findMany({
    select: {
      id: true, groundId: true, sharedPicture: true, agreements: true, divergences: true,
      centralQuestion: true, finalSynthesis: true, leadershipGaps: true, releasedAt: true,
    },
    take: 400,
  });
  const n = reports.length;
  const empty = (v: any) =>
    v === null || v === undefined || (typeof v === 'string' && !v.trim()) ||
    (Array.isArray(v) && v.length === 0) || (typeof v === 'object' && !Array.isArray(v) && Object.keys(v).length === 0);

  /*
   * THE REPORT IS STRUCTURED, so this asks the useful question rather than grepping prose: which
   * of its named parts came back empty. An empty `divergences` is the sharpest of them — it is the
   * one thing two people cannot get from talking to each other.
   */
  for (const [field, why] of [
    ['agreements', 'what the parties agreed'],
    ['divergences', 'where they differ — the one thing the product exists to surface'],
    ['centralQuestion', 'the question the check-in was about'],
    ['finalSynthesis', 'the closing read'],
    ['sharedPicture', 'the shared picture'],
  ] as [string, string][]) {
    const blank = reports.filter((r: any) => empty(r[field])).length;
    if (blank) findings.push(`${blank} of ${n} reports have no ${field}: no ${why}.`);
  }

  const unreleased = reports.filter((r: any) => !r.releasedAt).length;
  if (unreleased) findings.push(`${unreleased} of ${n} reports exist but were never released, so they were written and shown to nobody.`);

  const docs = await prisma.groundDocument.count().catch(() => 0);
  if (docs > 0) {
    const mention = reports.filter((r: any) =>
      /document|attach|contract|uploaded/i.test(JSON.stringify([r.sharedPicture, r.finalSynthesis, r.agreements]))).length;
    findings.push(`${docs} documents were attached across the run and ${mention} of ${n} reports mention one, so somebody who attached a contract cannot tell from the record that it was read.`);
  }

  const grounds = await prisma.ground.findMany({ select: { status: true, cadence: true }, take: 400 });
  const noCadence = grounds.filter((g: any) => !g.cadence).length;
  if (noCadence) findings.push(`${noCadence} of ${grounds.length} check-ins have no cadence, so nothing schedules a second round and nobody is told there will not be one.`);
  const stuck = grounds.filter((g: any) => g.status === 'AWAITING_PARTIES').length;
  if (stuck) findings.push(`${stuck} check-ins are still waiting on somebody with no deadline visible anywhere on them.`);

  return findings;
}
