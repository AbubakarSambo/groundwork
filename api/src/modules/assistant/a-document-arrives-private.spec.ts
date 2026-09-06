/**
 * A DOCUMENT THAT BECAME VISIBLE TO A TEAM BECAUSE SOMEBODY WALKED AWAY
 * MID-SENTENCE IS NOT A MISTAKE ANYBODY CAN TAKE BACK.
 *
 * So the file arrives private and is opened by saying so, never the other way
 * round — and the question is asked afterwards, when somebody is actually
 * looking at it.
 */
import {
  WHO_IT_COULD_BE_FOR,
  askAgain,
  askWhoItIsFor,
  whatWasDone,
  whoTheyMeant,
  whyThereIsNowhereToPutIt,
} from './a-document-is-private-until-you-say-otherwise';
import { route } from './the-router-is-deterministic';
import { CAPABILITY_BY_KEY } from './what-the-assistant-can-do';

describe('who a document is for', () => {
  it('has three answers, not two', () => {
    /* "Private or not" sounds binary and is not. Collapsing it loses the middle
       one — something the lead should see and the rest of the team should not —
       which is the one people most often mean. */
    expect(WHO_IT_COULD_BE_FOR.map((o) => o.value)).toEqual(['OPEN', 'CLOSED', 'OWN']);
  });

  it('and each is said in words somebody can answer', () => {
    for (const o of WHO_IT_COULD_BE_FOR) {
      expect(o.label.length).toBeGreaterThan(5);
      expect(o.said).toMatch(/read it/);
    }
  });
});

describe('reading their answer', () => {
  it.each([
    ['everyone', 'OPEN'],
    ['the whole team', 'OPEN'],
    ['just the lead', 'CLOSED'],
    ['only the lead', 'CLOSED'],
    ['just me', 'OWN'],
    ['keep it private', 'OWN'],
  ])('takes "%s" as %s', (said, expected) => {
    expect(whoTheyMeant(said)).toBe(expected);
  });

  it('and refuses to guess at anything ambiguous', () => {
    /**
     * Getting this wrong in the permissive direction publishes somebody's
     * document to their team. "Share it" is not clear — share with whom.
     */
    for (const vague of ['share it', 'go ahead', 'yes', 'the usual']) {
      expect(whoTheyMeant(vague)).toBeNull();
    }
    expect(askAgain()).toContain('not something I can undo');
  });
});

describe('what it says', () => {
  it('tells them it is already private before asking anything', () => {
    /* The state is stated before the question, so somebody who stops reading
       here has still been told the safe thing is what happened. */
    expect(askWhoItIsFor('handbook.pdf')).toContain('only you can see it');
  });

  it('and afterwards says exactly who can read it', () => {
    expect(whatWasDone('handbook.pdf', 'OPEN')).toContain('Everyone in this check-in can read it');
    expect(whatWasDone('handbook.pdf', 'CLOSED')).toContain('Only the person leading');
    expect(whatWasDone('handbook.pdf', 'OWN')).toContain('Nobody else on the check-in sees it');
  });
});

describe('when there is nowhere to put it', () => {
  it('says so, rather than offering a file picker that leads nowhere', () => {
    const said = whyThereIsNowhereToPutIt(0)!;
    expect(said).toContain('goes with a check-in');
    expect(said).toContain('nowhere to put one');
  });

  it('and says nothing when there is somewhere', () => {
    expect(whyThereIsNowhereToPutIt(1)).toBeNull();
  });
});

describe('asking for it', () => {
  it.each(['upload a document', 'add our handbook', 'here is our policy', 'attach a file'])(
    'routes "%s"',
    (m) => {
      expect(route(m).lane).toBe('add_a_document');
    },
  );

  it('but "send me the handbook" is the opposite direction', () => {
    /* The sending lane owns the word "send", and these two are opposites. */
    expect(route('email me that').lane).toBe('send_me_that');
  });

  it('and the capability declares it writes only after a yes', () => {
    expect(CAPABILITY_BY_KEY.get('add_a_document')!.writes).toBe('after you confirm it');
  });
});
