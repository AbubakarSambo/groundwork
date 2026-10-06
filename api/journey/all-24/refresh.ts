/**
 * READ EVERY REPORT AND BOARD AGAIN, ONCE EVERYBODY HAS ANSWERED.
 *
 * The runner reads the report as soon as the round releases, which on a two-person check-in can be
 * the moment the FIRST person finishes - synthesis runs on every completion and the picture forms
 * progressively. So the captured report often says "1 of 2 people have given an account" about a
 * check-in where both have now answered.
 *
 * That is the product behaving correctly and it is the wrong thing to show as the finished article.
 * This re-reads each ground after the whole run, having first nudged the catch-up sweep, so what
 * goes in front of somebody is the report as it stands with every answer in it.
 *
 * `builtFromAnswers` and `behindTheAnswers` are kept either way, so if a report is STILL behind
 * after this, that shows rather than hides.
 */
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/modules/prisma/prisma.service';
import { ReportsService } from '../../src/modules/reports/reports.service';
import * as fs from 'fs';

const API = 'http://localhost:3000/api/v1';
const PW = 'SuiteRun123!';
const OUT = process.env.OUT ?? 'journey/all-24/out';

async function http(path: string, o: { method?: string; body?: any; token?: string } = {}): Promise<any> {
  const res = await fetch(`${API}${path}`, {
    method: o.method ?? (o.body !== undefined ? 'POST' : 'GET'),
    headers: { 'content-type': 'application/json', ...(o.token ? { authorization: `Bearer ${o.token}` } : {}) },
    ...(o.body !== undefined ? { body: JSON.stringify(o.body) } : {}),
  });
  const text = await res.text();
  let json: any = null;
  try { json = text ? JSON.parse(text) : null; } catch { json = { raw: text }; }
  if (!res.ok) throw new Error(`${res.status} ${path} :: ${String(JSON.stringify(json)).slice(0, 200)}`);
  return json && typeof json === 'object' && 'success' in json && 'data' in json ? json.data : json;
}

async function main() {
  const app = await NestFactory.createApplicationContext(AppModule, { logger: ['error'] });
  const prisma = app.get(PrismaService);
  const reports = app.get(ReportsService);

  const files = fs.readdirSync(OUT).filter((f) => f.endsWith('.json'));
  console.log(`refreshing ${files.length} scenario(s)`);

  for (const f of files) {
    const rec = JSON.parse(fs.readFileSync(`${OUT}/${f}`, 'utf8'));
    const gid = rec.groundId;
    if (!gid) continue;
    try {
      /* Synthesise once more with everything on record, rather than waiting an hour for the sweep. */
      await reports.synthesize(gid);
    } catch (e: any) {
      console.log(`  ${f}: re-synthesis failed: ${e?.message?.slice(0, 120)}`);
    }

    const leadKey = (rec.scenario?.people ?? []).find((p: any) => p.isLead)?.key;
    const others = (rec.scenario?.people ?? []).filter((p: any) => !p.isLead);
    const leadEmail = rec.emails?.[leadKey];
    if (!leadEmail) { console.log(`  ${f}: no lead email`); continue; }

    let token: string;
    try { token = (await http('/auth/login', { body: { email: leadEmail, password: PW } })).accessToken; }
    catch (e: any) { console.log(`  ${f}: lead sign-in failed: ${e?.message?.slice(0, 90)}`); continue; }

    const last = rec.sessions[rec.sessions.length - 1];
    try { last.leadReport = await http(`/grounds/${gid}/report`, { token }); } catch { /* keep the old one */ }
    try { last.board = await http(`/grounds/${gid}/board`, { token }); } catch { /* keep the old one */ }

    const firstOther = others[0];
    const otherEmail = firstOther ? rec.emails?.[firstOther.key] : null;
    if (otherEmail) {
      try {
        const t2 = (await http('/auth/login', { body: { email: otherEmail, password: PW } })).accessToken;
        last.participantReport = await http(`/grounds/${gid}/report`, { token: t2 });
        last.participantBoard = await http(`/grounds/${gid}/board`, { token: t2 });
        last.participantSeen = firstOther.key;
      } catch { /* the lead's half is the important half */ }
    }

    last.patterns = await prisma.patternDetection.findMany({
      where: { groundId: gid },
      select: { code: true, status: true, seenInSessions: true, observationText: true },
    }).catch(() => []);
    last.commitments = await prisma.groundCommitment.findMany({
      where: { groundId: gid },
      select: { text: true, whenSaid: true, status: true, statedInSession: true, participant: { select: { email: true } } },
    }).catch(() => []);
    last.refreshedAt = new Date().toISOString();

    fs.writeFileSync(`${OUT}/${f}`, JSON.stringify(rec, null, 1));
    const built = last.leadReport?.builtFromAnswers;
    const behind = last.leadReport?.behindTheAnswers?.behindBy;
    console.log(`  ${f.padEnd(24)} built from ${built ?? '?'} answer(s)${behind ? `, still ${behind} behind` : ''}`);
  }

  await app.close();
  process.exit(0);
}
main().catch((e) => { console.error('REFRESH FAILED:', e?.message ?? e); process.exit(1); });
