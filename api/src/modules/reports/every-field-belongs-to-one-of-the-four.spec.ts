import { readdirSync, readFileSync } from 'fs';
import { join } from 'path';
import {
  EVERY_CELL, WHERE_IT_BELONGS, theFieldsOf, whichCell, whatThisSurfaceShows,
  placedNowhere, isYourOwn, readsARun, WHAT_A_SESSION_CELL_MAY_NOT_HOLD, NOT_REPORT_CONTENT,
  REACHES_NO_SCREEN, THE_ORDER, RUN_BLOCKS, EVERY_SURFACE, isAnIndex, isANotification, isACrop,
  BEFORE_THE_DEAD_BODY_CAN_GO,
} from './the-four-reports';
import { RUN_ONLY_FIELDS } from './a-read-needs-a-run';

describe('every field belongs to one of the four', () => {
  it('places each field exactly once', () => {
    const seen = Object.keys(WHERE_IT_BELONGS);
    expect(new Set(seen).size).toBe(seen.length);
    for (const [field, placed] of Object.entries(WHERE_IT_BELONGS)) {
      expect(EVERY_CELL).toContain(placed.cell);
      expect(field.trim()).toBe(field);
    }
  });

  it('gives every cell something, so none of the four is a label with nothing behind it', () => {
    for (const cell of EVERY_CELL) expect(theFieldsOf(cell).length).toBeGreaterThan(0);
  });

  it('keeps what needs a run out of the session cells', () => {
    /* The rule is borrowed from a-read-needs-a-run rather than restated - a rule stated twice is a
       rule that will disagree with itself, and this is one of the two that must not. */
    expect(WHAT_A_SESSION_CELL_MAY_NOT_HOLD).toEqual(RUN_ONLY_FIELDS);
    for (const field of WHAT_A_SESSION_CELL_MAY_NOT_HOLD) {
      const placed = whichCell(field);
      expect(placed).not.toBeNull();
      expect(readsARun(placed!.cell)).toBe(true);
    }
  });

  it('keeps the reads that need several sessions on the run, and out of one sitting', () => {
    for (const field of ['contribution', 'coverage', 'patterns']) {
      expect(readsARun(whichCell(field)!.cell)).toBe(true);
    }
  });

  it('keeps specificity on the session and confidence on the shared half', () => {
    /* two-reads-not-one-grade: specificity is per session and sits on the session; confidence is
       the one read across the history. My record had them as two matching bar rows and that is
       what was removed. */
    expect(whichCell('howClearThisWas')!.cell).toBe('A_SESSION');
    expect(isYourOwn(whichCell('howClearThisWas')!.cell)).toBe(true);
    expect(isYourOwn(whichCell('confidence')!.cell)).toBe(false);
  });

  it('keeps the coaching note on one sitting and out of the run', () => {
    expect(whichCell('coaching')!.cell).toBe('A_SESSION');
  });

  it('never puts a lead-only field on somebody else own half', () => {
    /* A lead-only read is about the shared picture. On somebody's own private half it would be a
       thing written about them that they are being handed. */
    for (const [field, placed] of Object.entries(WHERE_IT_BELONGS)) {
      if (placed.leadOnly) expect(isYourOwn(placed.cell)).toBe(false);
    }
  });

  it('a crop names what it leaves out, never what it takes', () => {
    const whole = whatThisSurfaceShows({ cell: 'B_SESSION' });
    const cropped = whatThisSurfaceShows({
      cell: 'B_SESSION',
      without: { whatEachPersonSaid: 'no room on a phone', confidence: 'read on the page it links to' },
    });
    expect(cropped.length).toBe(whole.length - 2);
    expect(cropped).not.toContain('confidence');
    /* The point of naming absences: a field added to the cell later lands on every crop that did
       not explicitly refuse it. */
    expect(cropped).toContain('sharedPicture');
  });

  it('separates lead-only fields from the rest when asked', () => {
    const lead = theFieldsOf('B_RUN', { leadOnly: true });
    const rest = theFieldsOf('B_RUN', { leadOnly: false });
    expect(lead).toContain('concernFlags');
    expect(rest).not.toContain('concernFlags');
    expect(lead.concat(rest).sort()).toEqual(theFieldsOf('B_RUN').sort());
  });

  it('names a field nobody has decided about', () => {
    expect(placedNowhere(['sharedPicture', 'somethingNew'])).toEqual(['somethingNew']);
    expect(placedNowhere(['sharedPicture', 'coaching'])).toEqual([]);
  });

  it('every field that reaches no screen is still placed', () => {
    /* The dark list is the honest state, not an excuse for leaving something unplaced. A field can
       be invisible and still have one correct home; being invisible is what gets fixed, and being
       unplaced is what lets the next surface decide by accident. */
    for (const field of REACHES_NO_SCREEN) expect(whichCell(field)).not.toBeNull();
  });

  it('and nothing on the dark list is somebody own private half by mistake', () => {
    /* Three of these are lead-only reads about other people. If one were sitting in an A cell it
       would be a thing written about somebody being handed to them the moment it was lit up. */
    for (const field of ['concernFlags', 'hiddenContributors', 'arcSignals']) {
      expect(isYourOwn(whichCell(field)!.cell)).toBe(false);
      expect(whichCell(field)!.leadOnly).toBe(true);
    }
  });

  it('gives every cell an order, with no block named twice', () => {
    for (const cell of EVERY_CELL) {
      const order = THE_ORDER[cell];
      expect(order.length).toBeGreaterThan(0);
      expect(new Set(order).size).toBe(order.length);
    }
  });

  it('puts what this is for before anything measured against it', () => {
    /* Every line underneath means something different depending on what it was in service of. */
    for (const cell of EVERY_CELL) {
      const order = THE_ORDER[cell];
      const objective = order.findIndex((b) => /^whatThisIsFor$|^againstWhatGoodLooksLike$/.test(b));
      const measured = order.findIndex((b) => /^where(YouAre|ItStands|ThingsStand)/.test(b));
      if (objective >= 0 && measured >= 0) expect(objective).toBeLessThan(measured);
    }
  });

  it('puts what it sits under before the objective it qualifies', () => {
    for (const cell of ['B_SESSION', 'B_RUN'] as const) {
      const order = THE_ORDER[cell];
      expect(order.indexOf('whatThisSitsUnder')).toBeLessThan(order.indexOf('againstWhatGoodLooksLike'));
    }
  });

  it('puts the sharp part before the prose', () => {
    /* Already settled for the other body in the-sharp-part-first, and stated here so the next
       surface inherits it rather than rediscovering it. */
    const b = THE_ORDER.B_SESSION;
    expect(b.indexOf('whereThingsStand')).toBeLessThan(b.indexOf('thePictureFromEverybody'));
  });

  it('puts the method last, on every cell that has one', () => {
    /* A caveat above the thing it qualifies reads as a verdict. */
    for (const cell of EVERY_CELL) {
      const order = THE_ORDER[cell];
      const method = order.findIndex((b) => /^(howMuchYouGaveIt|howMuchThereIsToGoOn|whatThisRestsOn)$/.test(b));
      if (method >= 0) expect(method).toBe(order.length - 1);
    }
  });

  it('keeps every run block out of both session cells', () => {
    for (const block of RUN_BLOCKS) {
      expect(THE_ORDER.A_SESSION).not.toContain(block);
      expect(THE_ORDER.B_SESSION).not.toContain(block);
    }
    /* And each one is somewhere, or the list is a list of things nobody shows at all. */
    for (const block of RUN_BLOCKS) {
      expect(THE_ORDER.A_RUN.concat(THE_ORDER.B_RUN)).toContain(block);
    }
  });

  it('places every surface in a cell, or says which kind of not-a-report it is', () => {
    for (const [name, surface] of Object.entries(EVERY_SURFACE)) {
      expect(name.trim()).toBe(name);
      if (isACrop(surface)) { expect(EVERY_CELL).toContain(surface.cell); continue; }
      /* An index or a notification. Either way it owes a reason, because an absence with no name
         is what invites somebody to fill it. */
      expect((surface as any).because.length).toBeGreaterThan(20);
    }
  });

  it('keeps a notification a notification, and out of the crop machinery', () => {
    /*
     * Two of the eight surfaces the audit counted carry no read at all: the WhatsApp message is a
     * check-in question and a link, and the report-ready mail says what a shared picture is and
     * offers the way in. I had drawn the first as a three-block crop, which is the wrong object -
     * a difference between two accounts, on a phone, in a message with no way to answer it, is the
     * worst place that block could land.
     */
    for (const name of ['overWhatsApp', 'theReportReadyEmail']) {
      const s = EVERY_SURFACE[name];
      expect(isANotification(s)).toBe(true);
      expect(isACrop(s)).toBe(false);
    }
  });

  it('gives every cell at least one surface, so none of the four is a shape nobody draws', () => {
    const drawn = new Set(
      Object.values(EVERY_SURFACE).filter(isACrop).map((s) => s.cell),
    );
    for (const cell of EVERY_CELL) expect(drawn.has(cell)).toBe(true);
  });

  it('keeps the report tab an index, which was decided rather than inherited', () => {
    /*
     * It held a report body once, it was taken out deliberately, and the three orphaned things were
     * each re-homed one by one. A redesign proposed refilling it; the call was to keep the index.
     * Asserted so that an absence does not read as an invitation to the next template.
     */
    const tab = EVERY_SURFACE.theReportTab;
    expect(isAnIndex(tab)).toBe(true);
  });

  it('every crop names what it leaves out with a reason, never a bare list', () => {
    /* A surface that lists what it TAKES silently stops taking anything added later. */
    for (const surface of Object.values(EVERY_SURFACE)) {
      if (!isACrop(surface)) continue;
      for (const [field, why] of Object.entries(surface.without ?? {})) {
        expect(why.length).toBeGreaterThan(15);
        expect(THE_ORDER[surface.cell]).toContain(field);
      }
    }
  });

  it('and the plumbing list is a list, not a pattern', () => {
    /* A pattern is how the next unplaced field slips through. */
    expect(NOT_REPORT_CONTENT).toContain('sessionNumber');
    expect(placedNowhere(['sessionNumber'])).toEqual([]);
    expect(placedNowhere(['sessionThing'])).toEqual(['sessionThing']);
  });
});

describe('the dead body is where ten rules are true', () => {
  const REPORT_SPECS = join(__dirname, '../../../../client/src/pages/report');

  it('names a real spec for every rule that has to survive it', () => {
    /* The list rots the moment a spec is renamed and nothing notices, and a rotten checklist is
       worse than none: it reads as done. */
    for (const { rule, spec } of BEFORE_THE_DEAD_BODY_CAN_GO) {
      expect(rule.length).toBeGreaterThan(30);
      const found = readdirSync(REPORT_SPECS).some((f) => f.startsWith(`${spec}.spec.`));
      expect(found).toBe(true);
    }
  });

  it('and the body is gone, now that every rule it held has a live home', () => {
    /* The test before this one held the dead body in place while the list had entries, and said it
       would go with the file once the last entry left. The last entries left on 1 October
       (decisions 70 and 71, request 99), so it now guards the other way: the body does not come
       back, and nothing new is added to a list whose job is done. Comments stripped first. */
    const page = readFileSync(join(REPORT_SPECS, 'ReportPage.tsx'), 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/^\s*\/\/.*$/gm, '');
    expect(page).not.toContain('function ReportBody(');
    expect(BEFORE_THE_DEAD_BODY_CAN_GO).toEqual([]);
  });
});
