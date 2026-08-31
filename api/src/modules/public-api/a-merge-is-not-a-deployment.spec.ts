import {
  whatTheRecordsReach, IN_ORDER, WHAT_A_RECORD_REACHES, NOTHING_HERE_REACHES,
  NEVER_CONCLUDE_ABOUT_SHIPPING,
} from './what-shipped-actually-means';

describe('the eight things "shipped" can mean', () => {
  it('keeps them in order, because the order is the whole point', () => {
    expect(IN_ORDER).toEqual(['WRITTEN', 'MERGED', 'TESTED', 'DEPLOYED', 'RELEASED', 'WORKING', 'USED']);
  });

  it('lets each kind of record reach exactly one state', () => {
    /* A test run says something passed a test. Not that it is deployed, and not that the test
       covers anything anybody cares about. */
    expect(WHAT_A_RECORD_REACHES).toEqual({
      MERGE: 'MERGED', TEST_RUN: 'TESTED', DEPLOY: 'DEPLOYED', RELEASE: 'RELEASED',
    });
  });

  it('names the states nothing here can reach, rather than stopping quietly', () => {
    /* A list that ended at RELEASED would let "deployed" go on meaning "done", which is the
       substitution the whole module exists to break. */
    expect(NOTHING_HERE_REACHES).toEqual(['WORKING', 'USED']);
  });
});

describe('what may not be inferred forwards', () => {
  it('a deploy record never implies the thing works', () => {
    const out = whatTheRecordsReach(['DEPLOY']);
    expect(out.furthest).toBe('DEPLOYED');
    expect(out.says.join(' ')).toContain('working end to end');
    expect(out.says.join(' ')).toContain('cannot see any of them');
  });

  it('takes the furthest state, not the last one pushed', () => {
    expect(whatTheRecordsReach(['DEPLOY', 'MERGE']).furthest).toBe('DEPLOYED');
    expect(whatTheRecordsReach(['MERGE', 'DEPLOY']).furthest).toBe('DEPLOYED');
  });

  it('still says what it cannot see even at the furthest state it can reach', () => {
    const out = whatTheRecordsReach(['RELEASE']);
    expect(out.furthest).toBe('RELEASED');
    expect(out.says.join(' ')).toContain('being used');
  });
});

describe('what may not be inferred backwards', () => {
  it('no record is never evidence that nothing happened', () => {
    const out = whatTheRecordsReach([]);
    expect(out.furthest).toBeNull();
    const said = out.says.join(' ');
    expect(said).toContain('not evidence it has not moved');
    expect(said).toContain('most work leaves no record');
    /* The sentence that would make a technical team route around this product. */
    expect(said).not.toMatch(/has not been|did not happen|no progress/i);
  });

  it('ignores a kind it does not understand rather than guessing at it', () => {
    expect(whatTheRecordsReach(['VISIT', 'CALL']).furthest).toBeNull();
  });
});

describe('when a description reaches further than the records', () => {
  it('says so as a question about the definition, never as an accusation', () => {
    const out = whatTheRecordsReach(['MERGE'], 'USED');
    const said = out.says.join(' ');
    expect(said).toContain('further than the records here reach');
    expect(said).toContain('question to ask');
    /* Both ordinary explanations are offered before anybody reaches for a third. */
    expect(said).toContain('may exist somewhere');
    expect(said).toContain('different point in the sequence');
    for (const accusation of ['overstat', 'exaggerat', 'misleading', 'lying', 'false', 'inaccurate']) {
      expect(said.toLowerCase()).not.toContain(accusation);
    }
  });

  it('says nothing about a description that sits within the records', () => {
    const out = whatTheRecordsReach(['DEPLOY'], 'MERGED');
    expect(out.says.join(' ')).not.toContain('further than the records');
  });

  it('and nothing at all when there are no records to compare against', () => {
    /* With nothing recorded, "further than the records reach" would be true of every claim ever
       made, which makes it a sentence about the product rather than about the work. */
    const out = whatTheRecordsReach([], 'USED');
    expect(out.says.join(' ')).not.toContain('further than the records');
  });
});

describe('what the synthesis is forbidden', () => {
  it('is told all three rules, not only the first', () => {
    expect(NEVER_CONCLUDE_ABOUT_SHIPPING).toContain('A merge is not a deployment');
    expect(NEVER_CONCLUDE_ABOUT_SHIPPING).toContain('most work is unrecorded');
    expect(NEVER_CONCLUDE_ABOUT_SHIPPING).toContain('never as a claim that somebody is overstating');
  });
});

/* -------------------------------------------------------------------------- */

import { whatThisProves, Kind } from './what-a-record-actually-proves';

describe('a technical record is described by what happened, never by what it means', () => {
  const TECHNICAL: Kind[] = ['MERGE', 'TEST_RUN', 'DEPLOY', 'RELEASE', 'INCIDENT'];

  it('names the thing plainly, with no conclusion smuggled into the name', () => {
    /*
     * "a deployment", never "a release to users". "a test run", never "the tests passing". The
     * moment a name here carries a conclusion, every rule about shipping is applied to a lie.
     *
     * READ FROM THE SELF-REPORTED SENTENCE, which is the one that renders the bare name in a
     * neutral frame. The first version of this scanned whole sentences and failed on the words
     * "whether it passed" - a sentence DENYING the conclusion, which is the thing being asked for.
     */
    for (const k of TECHNICAL) {
      const framed = whatThisProves(k, 'SELF_REPORTED', 'the engineer', null).toLowerCase();
      const name = framed.slice(framed.indexOf('says ') + 5, framed.indexOf(' happened'));
      expect(name.length).toBeGreaterThan(3);
      for (const conclusion of ['passing', 'passed', 'live to users', 'complete', 'working', 'successful', 'done', 'fixed']) {
        expect(name).not.toContain(conclusion);
      }
    }
  });

  it('keeps the two strengths that are about who is vouching, unchanged', () => {
    /* A deploy somebody described is not a deploy the system logged, and the existing wording for
       those two says so perfectly well without a technical version of itself. */
    expect(whatThisProves('DEPLOY', 'SELF_REPORTED', 'the engineer', null)).toContain('Their own account');
    expect(whatThisProves('DEPLOY', 'ARRANGED', 'the engineer', null)).toContain('not a record that it took place');
  });

  it('never lets a test run finishing read as a test run passing', () => {
    /*
     * The dangerous one, and it was generated by reusing the conversation wording: "a test run
     * completed - the one kind of record that shows a thing finished rather than attempted". That
     * is the exact conflation the shipping rules exist to prevent, produced by their own sibling,
     * and nothing downstream survives being handed that sentence.
     */
    const done = whatThisProves('TEST_RUN', 'COMPLETED', 'the engineer', null);
    expect(done).toContain('Finishing is not passing');
    expect(done).not.toContain('shows a thing finished rather than that it was attempted');

    const logged = whatThisProves('TEST_RUN', 'RECORDED', 'the engineer', null);
    expect(logged).toContain('Whether it passed');
  });

  it('never lets a deployment read as a working feature', () => {
    expect(whatThisProves('DEPLOY', 'COMPLETED', 'the engineer', null))
      .toContain('not evidence that it works there');
    expect(whatThisProves('DEPLOY', 'RECORDED', 'the engineer', null))
      .toContain('no evidence that it works');
  });

  it('never lets a closed incident read as a fixed cause', () => {
    expect(whatThisProves('INCIDENT', 'COMPLETED', 'the engineer', null))
      .toContain('not the same as the cause being found');
  });

  it('says nothing about conversations, because none of these are one', () => {
    for (const k of TECHNICAL) {
      for (const strength of ['COMPLETED', 'RECORDED'] as const) {
        expect(whatThisProves(k, strength, 'the engineer', null)).not.toContain('what was said');
      }
    }
  });
});
