import { buildIntakeBlock } from './prompt-library';

const base = { scenario: 'OKR_ALIGNMENT', moment: 'STARTING', timelineDays: 90,
  partyType: 'PARTICIPANT', sessionNumber: 1 } as any;
const obj = (text: string, o: any = {}) => ({
  text, authoredBy: 'lead', seenBySubject: true, authoredByThem: false, ...o,
});

describe('all of a person\'s objectives reach the interview', () => {
  it('not just the first one', () => {
    /*
     * The engine took `personObjectives[0]`. A person holding a target AND a commitment AND a
     * standing role expectation - which the data model has always allowed, and which a planning
     * system produces by default - had everything after the first silently invisible. Nothing
     * failed; the conversation simply never mentioned two thirds of what somebody was carrying.
     */
    const block = buildIntakeBlock({ ...base, personObjectives: [
      obj('Bring in six paying clients'),
      obj('Onboard the clients the team brings in'),
      obj('Own client onboarding end to end'),
    ] });
    expect(block).toMatch(/MY_OBJECTIVES \(3, all of them this person's\)/);
    for (const t of ['Bring in six paying clients', 'Onboard the clients', 'Own client onboarding']) {
      expect(block).toContain(t);
    }
  });

  it('and each keeps its own answer to whether they have seen it', () => {
    /* An instruction attached to one must not carry to another: the fairness rule is per objective,
       and reading somebody against an unseen standard is the thing it exists to stop. */
    const block = buildIntakeBlock({ ...base, personObjectives: [
      obj('Seen target', { seenBySubject: true }),
      obj('Unseen commitment', { seenBySubject: false }),
    ] });
    const seen = block.slice(block.indexOf('Seen target'), block.indexOf('Unseen commitment'));
    const unseen = block.slice(block.indexOf('Unseen commitment'));
    expect(seen).toMatch(/PRESS ON THE GAP/);
    expect(unseen).toMatch(/THEY HAVE NOT SEEN IT/);
  });

  it('and they are named as separate commitments, not a checklist', () => {
    /* The failure mode of a list is a march through it, one question per item, in order. */
    const block = buildIntakeBlock({ ...base, personObjectives: [obj('one'), obj('two')] });
    expect(block).toMatch(/SEPARATE COMMITMENTS, NOT A CHECKLIST/);
    expect(block).toMatch(/Do not march through them in order/);
    expect(block).toMatch(/Progress on one says nothing about the others/);
  });

  it('and silence about one earns a question, not a reminder every time', () => {
    const block = buildIntakeBlock({ ...base, personObjectives: [obj('one'), obj('two')] });
    expect(block).toMatch(/one plain question, not a reminder every time/);
  });
});

describe('the single and empty cases are unchanged', () => {
  it('one objective still reads as one', () => {
    const block = buildIntakeBlock({ ...base, personObjectives: [obj('Bring in six paying clients')] });
    expect(block).toMatch(/MY_OBJECTIVE: Bring in six paying clients/);
    expect(block).not.toMatch(/MY_OBJECTIVES/);
    expect(block).not.toMatch(/SEPARATE COMMITMENTS/);
  });

  it('and none still says so', () => {
    expect(buildIntakeBlock({ ...base, personObjectives: [] }))
      .toMatch(/MY_OBJECTIVE: none set for this person/);
  });

  it('and a caller passing only the old single field still works', () => {
    /* `personObjective` predates this and is still read by anything that has not been updated. */
    const block = buildIntakeBlock({ ...base, personObjective: obj('Just the one') });
    expect(block).toMatch(/MY_OBJECTIVE: Just the one/);
  });
});
