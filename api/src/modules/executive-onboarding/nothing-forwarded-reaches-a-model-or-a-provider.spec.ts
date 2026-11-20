import { readdirSync, readFileSync, statSync } from 'fs';
import { join } from 'path';

/**
 * WHAT A SENIOR PERSON FORWARDS IS UNTRUSTED, AND IT IS HERS (plan sections 7 and 19). Three things are held by reading the source, because a test that
 * only runs the code can pass while a path nobody ran does the opposite:
 *   1. nothing in the onboarding code runs a model, so no forwarded word can be read as an instruction by one;
 *   2. every message goes out through the one mail door or the one WhatsApp gate, never to a provider by another way;
 *   3. her material (and the replies of the people she named) is read by nothing outside this folder, so no route, board, report or Ask can serve it.
 */
const strip = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
const here = __dirname;
const SRC = join(here, '..', '..');
const own = readdirSync(here).filter((f) => f.endsWith('.ts') && !f.endsWith('.spec.ts') && f !== 'a-world-for-onboarding.ts');
const read = (f: string) => strip(readFileSync(join(here, f), 'utf8'));

function everySourceFile(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) { if (name !== 'node_modules') everySourceFile(p, out); } else if (name.endsWith('.ts') && !name.endsWith('.spec.ts')) out.push(p);
  }
  return out;
}

describe('what is forwarded to a senior person\'s assistant', () => {
  it('is never put in front of a model by the onboarding code', () => {
    for (const f of own.filter((x) => x !== 'executive-onboarding.service.ts')) expect(read(f)).not.toMatch(/anthropic|\.respond\(|respondWith|extract</i);
    /* the service's only model is the voice transcriber, which writes down what was said and is never asked to act on it */
    expect(read('executive-onboarding.service.ts')).not.toMatch(/anthropic\??\.\w+\(/i);
    expect(read('executive-onboarding.service.ts')).not.toMatch(/\.respond\(|respondWith|\.extract</);
  });

  it('goes out only through the one mail door and the one WhatsApp gate', () => {
    for (const f of own) expect(read(f)).not.toMatch(/\bresend\b|nodemailer|graph\.facebook|fetch\(|axios|createTransport/i);
    const service = read('executive-onboarding.service.ts');
    expect(service).toMatch(/this\.email\.sendTheIntroduction/);
    expect(service).toMatch(/this\.email\.sendTheAssistantsReply/);
    expect(service).toMatch(/this\.whatsapp\.sendFor/);
  });

  /**
   * THE ONE ALLOWANCE (Fatima round 2, E1; Hafsah, 11 November 2026). The year-end report may be written as prose by a model from the notes she forwarded,
   * because a report of clipped sentences under months was not one she would be glad to receive. It is allowed for ONE module and held by reading its source:
   * the notes go in as data inside a fixed prompt that says so; the model has no tool but a record to fill in, and the module has no way to send, mail, write a
   * row or call anything else; and what comes back is kept only where code finds the sentence's quotation in the note and every number, date, amount and name in
   * the note or the record (the same pattern the National Assembly report uses). Nothing else in the product may show a forwarded note to a model.
   */
  it('is shown to a model by ONE year-end module only, which can do nothing but return a record that code then checks', () => {
    const narrators = everySourceFile(SRC).filter((f) => /[\\/]year-end[\\/]the-year-end-narrat(?:ive|or\.service)\.ts$/.test(f));
    expect(narrators.map((f) => f.slice(SRC.length + 1)).sort()).toEqual(['modules/year-end/the-year-end-narrative.ts', 'modules/year-end/the-year-end-narrator.service.ts']);
    const logic = strip(readFileSync(join(SRC, 'modules', 'year-end', 'the-year-end-narrative.ts'), 'utf8'));
    const service = strip(readFileSync(join(SRC, 'modules', 'year-end', 'the-year-end-narrator.service.ts'), 'utf8'));
    /* The checking and laying out has no model, no database, no mail and no network at all. */
    expect(logic).not.toMatch(/anthropic|\.respond\(|\.extract\(|prisma|resend|nodemailer|fetch\(|axios|whatsapp|\bemail\b\./i);
    /* The service asks for a structured record and nothing else: no free reply, no tool of its own, no write. */
    expect(service).toMatch(/\.extract\(system, \[\{ role: 'user', content: user \}\], YEAR_END_NARRATIVE_SCHEMA/);
    expect(service).not.toMatch(/\.respond\(|respondWith|prisma|resend|nodemailer|fetch\(|axios|whatsapp|\bemail\b|\.create\(|\.update\(|\.send/i);
    /* And no other file that builds a year-end draft asks a model itself. (the-draft-request.ts reads her OWN words to a model, never a forwarded note.) */
    const others = everySourceFile(join(SRC, 'modules', 'year-end')).filter((f) => !/the-year-end-narrat|the-draft-request|[\\/]year-end\.service\.ts$/.test(f)).map((f) => strip(readFileSync(f, 'utf8')));
    for (const text of others) expect(text).not.toMatch(/anthropic|\.respond\(|\.extract\(/i);
    /* year-end.service.ts only hands the draft-request reader its extractor (one adapter line, for her own words); it makes no other model call. */
    const wiring = strip(readFileSync(join(SRC, 'modules', 'year-end', 'year-end.service.ts'), 'utf8'));
    expect(wiring.match(/\.extract\(/g)).toHaveLength(1);
    expect(wiring).not.toMatch(/\.respond\(/);
  });

  it('is read by nothing outside the onboarding folder, so nothing can serve it', () => {
    /* A world a test builds (a-world-for-*.ts) sets up her tables with fakes, and is not product code that could serve them. */
    const outside = everySourceFile(SRC).filter((f) => !f.startsWith(here) && !/[\\/]a-world-for-[^\\/]+\.ts$/.test(f) && /\.(principalMaterial|intakeBatch|outreachContact|introductionDelivery|informationGap)\b|\b(principalMaterial|intakeBatch)\./.test(strip(readFileSync(f, 'utf8'))));
    /* The year-end owner records and reads the gaps it asks about, and nothing else. The outstanding register reads only WHO she introduced Groundwork to (their names and the roster row), to show their own promises beside everyone else's. The team loop (modules/team-loop, increment 6a) reads what her team sent, to turn it into their check-in; it is held to its own limits in team-loop/the-team-loop-keeps-to-its-limits.spec.ts. */
    expect(outside.map((f) => f.slice(SRC.length + 1)).filter((f) => !f.startsWith('modules/team-loop/'))).toEqual(['modules/outstanding/the-outstanding-register.ts', 'modules/year-end/the-year-end-owner.ts']);
    expect(strip(readFileSync(join(SRC, 'modules', 'outstanding', 'the-outstanding-register.ts'), 'utf8'))).not.toMatch(/principalMaterial|intakeBatch|introductionDelivery|informationGap/);
    expect(strip(readFileSync(join(SRC, 'modules', 'year-end', 'the-year-end-owner.ts'), 'utf8'))).not.toMatch(/principalMaterial|intakeBatch|introductionDelivery/);
  });
});
