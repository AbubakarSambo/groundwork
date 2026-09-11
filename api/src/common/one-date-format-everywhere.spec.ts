import { readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';
import { whenItWas, setDisplayTimezone, displayTimezone } from './a-date-reads-the-same-everywhere';

/**
 * ONE DATE FORMAT EVERYWHERE.
 *
 * Three date formats on the report surfaces alone, a chart bucketed in the server's own zone, and a
 * display-timezone setting nothing read (fix plan B10). Two formatter modules - one each side - and
 * this guard, which walks both trees and fails on a date formatted anywhere else. The same shape
 * this repo uses for vocabulary, because it is the only shape that stops it coming back.
 */
const API = join(__dirname, '..');
const CLIENT = join(__dirname, '..', '..', '..', 'client', 'src');
const FORMATTERS = ['common/a-date-reads-the-same-everywhere.ts', 'lib/a-date-reads-the-same-everywhere.ts'];
const strip = (t: string) => t.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '').replace(/\{\/\*[\s\S]*?\*\/\}/g, '');
function every(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) { if (name !== 'node_modules' && name !== 'dist') out.push(...every(p)); }
    else if (/\.tsx?$/.test(p) && !/\.spec\.tsx?$/.test(p) && !/testonly/.test(p)) out.push(p);
  }
  return out;
}

describe('a date is formatted in one place', () => {
  it('nothing outside the two formatters calls toLocaleDateString or toLocaleTimeString, or formats a Date with toLocaleString', () => {
    const faults: string[] = [];
    for (const root of [API, CLIENT]) {
      for (const file of every(root)) {
        const rel = file.slice(root.length + 1);
        if (FORMATTERS.some((f) => rel.endsWith(f))) continue;
        const code = strip(readFileSync(file, 'utf8'));
        if (/\.toLocaleDateString\(|\.toLocaleTimeString\(/.test(code)) faults.push(`${rel}: toLocaleDateString/TimeString`);
        /* toLocaleString on a number is fine; on a Date, or with date parts in its options, it is a date format. */
        if (/new Date\([^)]*\)\.toLocaleString\(/.test(code)) faults.push(`${rel}: new Date(...).toLocaleString`);
        if (/\.toLocaleString\([^)]*\b(month|day|hour|minute|year)\b/.test(code)) faults.push(`${rel}: toLocaleString with date parts`);
      }
    }
    expect(faults).toEqual([]);
  });

  it('the two formatters say the same thing', () => {
    const a = strip(readFileSync(join(API, FORMATTERS[0]), 'utf8'));
    const b = strip(readFileSync(join(CLIENT, FORMATTERS[1]), 'utf8'));
    const options = (t: string) => (t.match(/const OPTIONS[\s\S]*?\n\}/) ?? [''])[0].replace(/[;,\s]+/g, ' ').trim();
    expect(options(a)).not.toBe('');
    expect(options(a)).toBe(options(b));
    expect(a).toContain("THE_LANGUAGE = 'en-GB'");
    expect(b).toContain("THE_LANGUAGE = 'en-GB'");
  });
});

describe('whenItWas', () => {
  const noon = new Date('2026-09-12T12:05:00Z');
  it('reads in English day-first, in the zone it is told', () => {
    expect(whenItWas(noon, 'day', 'UTC')).toBe('12 Sept 2026');
    expect(whenItWas(noon, 'dayAndMonth', 'UTC')).toBe('12 Sept');
    expect(whenItWas(noon, 'full', 'UTC')).toBe('12 September 2026');
    expect(whenItWas(noon, 'dayAndTime', 'UTC')).toMatch(/12 Sept, 12:05/);
    expect(whenItWas(noon, 'time', 'UTC')).toBe('12:05');
  });
  it('and in the display zone when told nothing', () => {
    setDisplayTimezone('Pacific/Kiritimati'); // UTC+14: noon UTC is the next day
    expect(displayTimezone()).toBe('Pacific/Kiritimati');
    expect(whenItWas(new Date('2026-09-12T23:00:00Z'), 'day')).toBe('13 Sept 2026');
    setDisplayTimezone('Not/AZone');
    expect(displayTimezone()).toBe('Pacific/Kiritimati');
    setDisplayTimezone('UTC');
  });
  it('and says nothing for nothing', () => {
    expect(whenItWas(null, 'day')).toBe('');
    expect(whenItWas('not a date', 'day')).toBe('');
  });
});
