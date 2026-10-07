import { GroundsService } from './grounds.service';
import { CheckInStatus } from '@prisma/client';

/**
 * A DECLINE IS AN ANSWER, AND A ROUND WITH ONE IN IT MUST STILL FINISH.
 *
 * Her decisions: "Round completes, report names the decline", and a decline is "final for that
 * session".
 *
 * THE STATE THIS REPLACES. `POST /check-ins/:id/decline` had worked since it was written - it sets the
 * row to DECLINED - and nothing had ever called it, so a product whose central claim is that taking
 * part is voluntary offered no way to say no. Going silent was the only option, and going silent looks
 * exactly like being slow.
 *
 * WHY IT COULD NOT SIMPLY BE WIRED. This function counted anybody holding an account as still owing an
 * answer and cleared them only on COMPLETED. So a declined party stayed in `missingParticipantIds`
 * permanently: the round never completed, the report never left "forming", and the waiting-on row
 * named them for good. A button on top of that would have manufactured permanently stuck check-ins,
 * which is worse than the missing button it fixed.
 *
 * THE LINE THAT MATTERS is that a decline clears somebody from `missing` WITHOUT being counted in
 * `completed`. Both halves are load-bearing and they pull in opposite directions:
 *   - not in `missing`  -> the round can finish
 *   - not in `completed` -> the report never claims an account it does not hold
 */
function makeService(rows: { participantId: string; status: CheckInStatus }[]) {
  /* The rows the population rule reads: joined, with this session's answers attached. getSessionProgress
     asks how-many-have-answered for both halves now rather than keeping its own copy of the clause. */
  const participants = [...new Set(rows.map((r) => r.participantId))].map((id) => ({
    id,
    userId: `u-${id}`,
    checkIns: rows.filter((r) => r.participantId === id && (r.status === CheckInStatus.COMPLETED || r.status === CheckInStatus.DECLINED)).map((r) => ({ status: r.status })),
  }));
  const prisma: any = {
    checkIn: {
      aggregate: jest.fn(async () => ({ _max: { sessionNumber: 1 } })),
      findMany: jest.fn(async ({ where }: any) => {
        const wanted: CheckInStatus[] = where.status?.in ?? [where.status];
        return rows
          .filter((r) => wanted.includes(r.status))
          .map((r) => ({ participantId: r.participantId, status: r.status }));
      }),
    },
    groundParticipant: { findMany: jest.fn(async () => participants) },
  };
  return new GroundsService(prisma, {} as any, {} as any, {} as any, {} as any, {} as any, {} as any);
}

describe('GW-DECLINE-01: a decline does not hold the round open', () => {
  it('somebody who declined is not still being waited on', async () => {
    const svc = makeService([
      { participantId: 'a', status: CheckInStatus.COMPLETED },
      { participantId: 'b', status: CheckInStatus.DECLINED },
    ]);
    const p = await svc.getSessionProgress('g1');
    expect(p!.missingParticipantIds).toEqual([]);
    expect(p!.declinedParticipantIds).toEqual(['b']);
  });

  it('but their decline is never counted as an account given', async () => {
    /** The report's standing depends on this: three accounts must never be reported as four. */
    const svc = makeService([
      { participantId: 'a', status: CheckInStatus.COMPLETED },
      { participantId: 'b', status: CheckInStatus.DECLINED },
    ]);
    const p = await svc.getSessionProgress('g1');
    expect(p!.completed).toBe(1);
    expect(p!.total).toBe(2);
  });

  it('and somebody who has simply not answered yet IS still being waited on', async () => {
    /** The other side of it. If this ever passes for NOT_STARTED, the round closes on people early. */
    const svc = makeService([
      { participantId: 'a', status: CheckInStatus.COMPLETED },
      { participantId: 'b', status: CheckInStatus.NOT_STARTED },
    ]);
    const p = await svc.getSessionProgress('g1');
    expect(p!.missingParticipantIds).toEqual(['b']);
    expect(p!.declinedParticipantIds).toEqual([]);
  });
});

/**
 * AND IT IS FINAL FOR THAT SESSION. Her second decision, and it has to bite at the WRITE PATHS
 * rather than only in the button - the round has already been allowed to finish on the strength of
 * the decline, so a reopened session typed into afterwards would be adding an account to a round
 * that closed without it.
 *
 * Asserted as source because the rule lives in which LOADER each path picks, and that choice is the
 * fix: `loadOwnedCheckIn` still serves the three read paths, because somebody must be able to read
 * their own record of a session they declined.
 */
describe('GW-DECLINE-02: a declined session cannot be written to', () => {
  const SRC = require('fs')
    .readFileSync(require('path').join(__dirname, '../conversation/conversation.service.ts'), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '');

  const bodyOf = (name: string) => {
    /** Generators are `async *name(`; the star is optional so the stream route is covered. */
    const m = new RegExp(`async \\*?${name}\\(checkInId: string, requestingUserId: (string|WhoIsAsking)`).exec(SRC);
    return m ? SRC.slice(m.index, m.index + 400) : '';
  };

  it('the loader that refuses a settled session exists and names both settled states', () => {
    expect(SRC).toMatch(/private async loadOwnedOpenCheckIn\(/);
    expect(SRC).toMatch(/CheckInStatus\.DECLINED[\s\S]{0,200}?You declined this session/);
    expect(SRC).toMatch(/CheckInStatus\.COMPLETED[\s\S]{0,160}?already complete/);
  });

  /**
   * The four session routes now reach the loader through one door (`openTheDoor`, or
   * `aSessionUnderway` which is that door plus a question) - see a-hold-must-actually-hold.spec.ts.
   * The rule is unchanged: what matters is which loader the path ends up on, and the door picks the
   * refusing one. The two paths outside the door still name it directly.
   */
  it('the door itself picks the refusing loader', () => {
    const door = SRC.slice(SRC.indexOf('private async openTheDoor('), SRC.indexOf('private async openTheDoor(') + 400);
    expect(door).toContain('loadOwnedOpenCheckIn(');
    expect(door).not.toMatch(/loadOwnedCheckIn\(/);
  });

  it.each([
    ['open', /openTheDoor\(/],
    ['sendMessage', /aSessionUnderway\(/],
    ['sendMessageStream', /aSessionUnderway\(/],
    ['complete', /openTheDoor\(/],
    ['documentReceived', /loadOwnedOpenCheckIn\(/],
    ['decline', /loadOwnedOpenCheckIn\(/],
  ])('%s refuses a declined session', (method, through) => {
    expect(bodyOf(method as string)).toMatch(through as RegExp);
  });

  it.each(['getTranscript', 'getDownload', 'getSoloArtifact'])(
    '%s still works on one, because reading your own record is not writing to it',
    (method) => {
      const body = bodyOf(method);
      expect(body).toContain('loadOwnedCheckIn(');
      expect(body).not.toContain('loadOwnedOpenCheckIn(');
    },
  );
});

/**
 * AND NOBODY IS NAMED BY THEIR EMAIL ADDRESS IN THE SHARED REPORT. W-UX-4.
 *
 * Found by reading the released report the decline notice was just added to: the end-state list under
 * it showed "sahar@meridianhealth.test" beside two people shown by role. The label was
 * `roleAsDescribed?.trim() || p.email` - a chain that never consults the NAME at all, which is the
 * seventh hand-written version of this in the codebase and the only one that skipped names entirely.
 *
 * The rule: anything rendered INSIDE the shared report is named through `labelsForParties`. That map
 * is what the report's own sentences are written in, and it carries the privacy behaviour - a viewer
 * not entitled to a real name gets the role, and the address never appears.
 */
describe('GW-DECLINE-03: the shared report names people one way', () => {
  const SRC = require('fs')
    .readFileSync(require('path').join(__dirname, '../resolution/resolution.service.ts'), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '');

  it('the end-state list uses the report label map, then puts the names back', () => {
    /**
     * BOTH HALVES, because the first one alone was a visible regression. Using `labelsForParties`
     * killed the raw address and replaced it with "the initiator" - the report's internal shorthand,
     * shown to the person it referred to. `namesVisibleTo` is the per-viewer step that swaps real
     * names back in for the people this reader is entitled to see, and it is what the rest of the
     * report already does.
     */
    expect(SRC).toContain('labelsForParties(active as any)');
    /* Changed with decision 115: the names now take the check-in's own setting for whether colleagues see each other,
       and the label itself is never shown (see the-ending-panel-says-names-never-labels.spec.ts). */
    expect(SRC).toContain('namesVisibleTo(viewer?.id ?? null, active as any, viewerIsLead || peersAreNamed)');
    expect(SRC).toContain('whatEachLabelIsCalled(active as any');
    expect(SRC).not.toContain('label: names.get(label) ?? label');
  });

  it('and no longer falls back to a raw address', () => {
    expect(SRC).not.toMatch(/roleAsDescribed\?\.trim\(\) \|\| p\.email/);
  });

  it('the query selects the name, or the map has nothing to prefer', () => {
    /** Without `user`, `labelsForParties` silently falls through to roles for everybody. */
    expect(SRC).toMatch(/user: \{ select: \{ firstName: true, lastName: true, email: true \} \}/);
  });
});
