import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * GW-69 SCREENING IS GONE, AND MUST NOT COME BACK BY HALVES. Her decision, verbatim:
 * "remove the entire thing, lets see how clients respond when we tell them verbally and then we can
 * revisit this."
 *
 * THE HISTORY THIS PROTECTS. Three contraindication questions - active legal proceedings, fear of
 * retaliation, decision already made - lived on the server for DRIFT, RECOGNITION and
 * CRISIS_ALIGNMENT, each returning a paragraph telling the initiator to go and use something else.
 *
 * Not one of them ever fired. The block was gated on `dto.contraindicationAnswers`, no client ever
 * sent it, and nothing ever read the warning that came back. It was a safety net in appearance only
 * for its entire life, which is worse than no net at all: anybody reading this file would have
 * concluded the product screens for these things.
 *
 * WHAT THIS TEST IS FOR. Not to keep it deleted forever - it is to stop it coming back the way it
 * existed, wired at one end. If screening returns it must be reachable from the product and its
 * result must be shown to somebody, and a test asserting the SERVER half alone is what let this sit
 * dead through several audits.
 *
 * THE RISK NOW CARRIED KNOWINGLY: a Groundwork record can be pulled into formal proceedings and
 * nothing in the product says so. That is the piece to restore first.
 */
const SERVICE = readFileSync(join(__dirname, 'grounds.service.ts'), 'utf8');
const DTO = readFileSync(join(__dirname, 'dto/create-ground.dto.ts'), 'utf8');
const CODE = SERVICE.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

describe('GW-69: the screening is removed at both ends, not just muted', () => {
  it('the service no longer builds a warning nothing reads', () => {
    expect(CODE).not.toMatch(/contraindicationWarning/);
    expect(CODE).not.toMatch(/CONTRAINDICATED_SCENARIOS/);
  });

  it('and the DTO no longer accepts answers nothing sends', () => {
    /** A field on the contract is a promise that something happens. Nothing did. */
    expect(DTO).not.toMatch(/contraindicationAnswers/);
    expect(DTO).not.toMatch(/legalProceedings|fearOfRetaliation|decisionAlreadyMade/);
  });

  it('the create response still carries the one contract term that IS real', () => {
    /**
     * `contract.noVerdict` sat in the same return and is a live, load-bearing promise shown to
     * people. Removing the dead sibling must not take it along - which is the ordinary way a
     * deletion like this goes wrong.
     */
    expect(CODE).toMatch(/return \{ \.\.\.ground, contract \};/);
    expect(CODE).toMatch(/noVerdict: true/);
  });

  it('and the reason it went is written where the next person will look', () => {
    /**
     * The comment is the deliverable here. Without it this reads as an accidental deletion and the
     * next audit re-adds the server half, which is exactly the state we just left.
     */
    expect(SERVICE).toMatch(/GW-69 CONTRAINDICATION SCREENING WAS REMOVED HERE, DELIBERATELY/);
    expect(SERVICE).toMatch(/pulled into formal proceedings/);
  });
});
