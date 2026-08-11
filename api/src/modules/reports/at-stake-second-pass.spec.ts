import { readFileSync } from 'fs';
import { join } from 'path';
import { ReportsService } from './reports.service';

/**
 * THE SECOND PASS, AND WHAT IT IS NOT ALLOWED TO SEE.
 *
 * Asking the synthesis call to add "what this gap costs the work" did not work.
 * Optional field with a clear instruction: 1 of 3 real gaps came back with one.
 * Reworded: no change. Marked `required`: still absent - not even the empty
 * string the instruction offered as the way to decline. The synthesis call is
 * doing too much at once and this is the clause it drops.
 *
 * So it became its own call, one per gap. The tests below are about the risk
 * that creates rather than the mechanism, because the mechanism is three lines.
 *
 * THE RISK. A model handed one isolated gap and asked "what does this cost?" is
 * being set up to answer with a person. That is the natural shape of the
 * question, and this pass asks it without any of the surrounding report to hold
 * the frame. The defence is not only the instruction - it is that the call is
 * never given the party labels, the records, or anything else that would let it
 * name someone. It cannot accuse a person it was never told about.
 *
 * That containment is what these tests hold. If a future change starts passing
 * richer context in "so the sentence is better", the guardrail stops being
 * structural and goes back to being a request.
 */

const SRC = readFileSync(join(__dirname, 'reports.service.ts'), 'utf8');

/** Drive the private pass directly - it is where the guarantee lives. */
function makeService(extract: jest.Mock): ReportsService {
  const svc = Object.create(ReportsService.prototype) as any;
  svc.anthropic = { extract };
  svc.logger = { warn: jest.fn(), error: jest.fn() };
  return svc;
}

const gap = (over: any = {}) => ({
  topic: 'How success is defined for the quarter',
  positions: [
    { participantLabel: 'Party A', view: 'A stable v1 used by a major partner.' },
    { participantLabel: 'Party B', view: 'The weekly task list, finished.' },
  ],
  ...over,
});

describe('the call is not given anything it could name a person with', () => {
  it('sends the gap and the views, and no party labels', async () => {
    const extract = jest.fn().mockResolvedValue({ atStake: 'If this holds, the work could drift.' });
    const svc = makeService(extract);

    await (svc as any).fillAtStake([gap()]);

    const [, messages] = extract.mock.calls[0];
    const sent = messages[0].content;
    expect(sent).toContain('How success is defined for the quarter');
    expect(sent).toContain('A stable v1 used by a major partner.');
    // The labels exist on the object and must not travel with it.
    expect(sent).not.toContain('Party A');
    expect(sent).not.toContain('Party B');
  });

  it('sends nothing else about the ground', async () => {
    // Names, roles and record text are the materials an accusation needs. The
    // pass builds its message from two fields, so nothing else can leak in even
    // if a future divergence object starts carrying more.
    const extract = jest.fn().mockResolvedValue({ atStake: 'x' });
    const svc = makeService(extract);

    await (svc as any).fillAtStake([
      gap({
        evidence: ['Hafeezah said she was behind on the plan'],
        participantId: 'abc-123',
        internalNote: 'lead is frustrated',
      }),
    ]);

    const sent = extract.mock.calls[0][1][0].content;
    expect(sent).not.toMatch(/Hafeezah|abc-123|frustrated/);
  });
});

describe('the instruction restates the whole rule, rather than assuming it carried', () => {
  /**
   * The ASSEMBLED prompt, taken from the call the pass actually makes, not from
   * the source. The source is an array of quoted lines, so a sentence there is
   * split across elements by wherever the quotes fall - asserting on it tests
   * the formatting. This is the string the model reads.
   */
  let PROMPT = '';
  beforeAll(async () => {
    const extract = jest.fn().mockResolvedValue({ atStake: 'x' });
    await (makeService(extract) as any).fillAtStake([gap()]);
    PROMPT = String(extract.mock.calls[0][0]).replace(/\s+/g, ' ');
  });

  it('names the work as the subject and the person as off limits', () => {
    expect(PROMPT).toMatch(/what happens TO THE WORK/i);
    expect(PROMPT).toMatch(/never about a person/i);
    expect(PROMPT).toMatch(/No fault/i);
    expect(PROMPT).toMatch(/No consequence for an individual/i);
  });

  it('forbids guessing at who the parties are', () => {
    // The one instruction specific to this pass: it is working blind, and a
    // model that fills that gap by inferring roles has defeated the point of
    // withholding them.
    expect(PROMPT).toMatch(/You have not been told who these people are and you must not guess/i);
  });

  it('keeps it conditional and keeps prediction out', () => {
    expect(PROMPT).toMatch(/Conditional, because it has not happened yet/i);
    expect(PROMPT).toMatch(/Never a prediction about what anyone will do/i);
  });

  it('offers the empty string and says which way to fail', () => {
    expect(PROMPT).toMatch(/return an empty string/i);
    expect(PROMPT).toMatch(/reaching is the worse failure of the two/i);
  });
});

describe('what it writes, and what it leaves alone', () => {
  it('fills a gap that has none', async () => {
    const extract = jest.fn().mockResolvedValue({
      atStake: 'If this holds, the quarter could end with every weekly task done and the outcome unowned.',
    });
    const d = [gap()];
    await (makeService(extract) as any).fillAtStake(d);
    expect(d[0].atStake).toBe(
      'If this holds, the quarter could end with every weekly task done and the outcome unowned.',
    );
  });

  it('does not re-ask a gap the synthesis already answered', async () => {
    const extract = jest.fn();
    const d = [gap({ atStake: 'Already said, and said well.' })];
    await (makeService(extract) as any).fillAtStake(d);
    expect(extract).not.toHaveBeenCalled();
    expect(d[0].atStake).toBe('Already said, and said well.');
  });

  it('treats an empty or whitespace answer as a decline, not as text', async () => {
    // The instruction offers '' as the way to say nothing. It must not land on
    // the report as a blank "at stake" heading.
    for (const answer of ['', '   ']) {
      const d = [gap()];
      await (makeService(jest.fn().mockResolvedValue({ atStake: answer })) as any).fillAtStake(d);
      expect(d[0].atStake).toBeUndefined();
    }
  });

  it('lets one gap fail without touching the others or the report', async () => {
    // Independent calls: the failure costs one sentence. A report that threw
    // here would lose the whole synthesis over an optional clause.
    const extract = jest
      .fn()
      .mockRejectedValueOnce(new Error('vertex timeout'))
      .mockResolvedValue({ atStake: 'The second one still lands.' });
    const d = [gap({ topic: 'first' }), gap({ topic: 'second' })];

    await expect((makeService(extract) as any).fillAtStake(d)).resolves.toBeUndefined();
    expect(d[0].atStake).toBeUndefined();
    expect(d[1].atStake).toBe('The second one still lands.');
  });

  it('makes no calls when there are no gaps', async () => {
    const extract = jest.fn();
    for (const input of [[], null, undefined]) {
      await (makeService(extract) as any).fillAtStake(input as any);
    }
    expect(extract).not.toHaveBeenCalled();
  });

  it('skips a malformed gap rather than sending an empty question', async () => {
    const extract = jest.fn();
    await (makeService(extract) as any).fillAtStake([null, {}, { positions: [] }]);
    expect(extract).not.toHaveBeenCalled();
  });
});

describe('it runs on every scenario, which is why it lives here', () => {
  it('is called on the synthesis result, not inside one report schema', () => {
    // NEW_STARTING, RECOGNITION and DRIFT have their own report schemas and
    // none of them ever had an atStake field. Running the pass over
    // `result.divergences` after extraction reaches all four; adding the field
    // to a schema would have reached one.
    expect(SRC).toMatch(/await this\.fillAtStake\(result\.divergences\)/);
  });
});
