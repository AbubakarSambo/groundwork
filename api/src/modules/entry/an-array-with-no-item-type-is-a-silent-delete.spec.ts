import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * AN @IsArray() WITH NO @Type() UNDER A WHITELISTING PIPE IS A SILENT DELETE.
 *
 * The global pipe runs `whitelist: true`. For an array of objects, class-validator only knows the
 * item's properties if the property carries `@Type(() => Item)`. Without it, every property of
 * every item is stripped - the request validates, and the object that reaches the service is a row
 * of empty shells.
 *
 * That is what happened to the entry report. The person read a full report at the end of their
 * session, because that one comes straight back from the model and never passes a pipe. The copy
 * committed to their check-in went through this DTO, so opening the same report a minute later from
 * Report showed three cards headed "What we noticed", "Why it matters" and "What to do next" with
 * nothing under any of them.
 *
 * Pinned on the file rather than on the one property, because the next array added here has exactly
 * the same exposure and nothing about writing it would bring this to mind.
 */
const strip = (t: string) => t.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^\s*\/\/.*$/gm, ' ');
const SRC = strip(readFileSync(join(__dirname, 'entry.controller.ts'), 'utf8'));

describe('every array of objects on the entry DTOs declares its item type', () => {
  /* Updated 19 November 2026: the report's own arrays left this file. The server that writes the report gives it its shape
     (`the-report-as-it-is-kept.ts`), so no array of the report's passes the pipe item by item, and none can be emptied by it. */
  it('the report is not checked item by item here any more', () => {
    expect(SRC).not.toContain('class EntryReportSummaryDto');
    expect(SRC).toMatch(/@IsObject\(\)\s*reportSummary\?: Record<string, unknown>;/);
  });

  it('no @IsArray() of objects is left without a @Type()', () => {
    /* Each property declaration, with whatever decorators sit above it on the same run of lines. */
    const blocks = SRC.split(/\n\s*\n/);
    const offenders: string[] = [];
    for (const block of blocks) {
      if (!/@IsArray\(\)/.test(block)) continue;
      /* An array of plain strings needs no item type; one whose declared item is an object does. */
      const declaresObjectItems = /\?\s*:\s*(?:\{|[A-Z]\w*Dto\[\])/.test(block);
      if (!declaresObjectItems) continue;
      if (!/@Type\(\(\)\s*=>/.test(block)) offenders.push(block.trim().split('\n').pop() ?? block);
    }
    expect(offenders).toEqual([]);
  });
});
