import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * THE TWO PARTS OF THIS PRODUCT NOBODY REACHES.
 *
 * Found writing a tester a brief and having to explain both of them in prose, which is the tell:
 * "how can she test multiple sessions if there's a block, and how can she see resolution?"
 *
 * A SECOND SESSION IS A MONTH AWAY. Between rounds the screen says "your next check-in opens 12
 * October" and stops. True, and half the story for the one person who can move it: the lead chose
 * that rhythm, usually by not choosing it, and can change it on Setup in two clicks. One of the
 * options has no clock at all - the next round opens the moment the lead finishes theirs. Nothing
 * anywhere said so, so a lead who wanted a second round sooner had no way to find out.
 *
 * AND THE ENDING IS INVISIBLE UNTIL YOU ARE AT IT. A check-in does not run out; on the last session
 * everybody is asked how it closes and it ends on an agreed answer. `ResolutionPanel` renders
 * nothing until the run is nearly over, so the only way to learn that screen exists was to reach it,
 * which on a three-month run takes three months. The session count was a countdown to something
 * nobody had been told about.
 *
 * NEITHER IS A BUG AND BOTH NEEDED SAYING. If somebody being paid to explore the product had to be
 * told, a customer will never find out.
 */
const strip = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
const CLIENT = join(__dirname, '..', '..', '..', '..', 'client', 'src');
const CHAT = strip(readFileSync(join(CLIENT, 'components', 'gw', 'GroundChat.tsx'), 'utf8'));
const PARTY = strip(readFileSync(join(CLIENT, 'pages', 'grounds', 'GroundParticipantPage.tsx'), 'utf8'));

describe('waiting for the next session', () => {
  it('says the rhythm can be changed, next to the date it is waiting for', () => {
    expect(CHAT).toContain('Change how often this runs');
  });

  it('and only to somebody who can actually change it', () => {
    /* A party cannot, and offering them a control that refuses is worse than saying nothing. */
    expect(CHAT).toContain('canChangeTheRhythm && onGoToSetup');
    /**
     * client round 4, item A step 3: the lead's Check-in tab no longer mounts Composer directly -
     * a party (which is who this control is ever offered to at all; see `isInitiator` on the
     * party side below) is sent straight to /grounds/:id/p?open=1, and IT mounts Composer with
     * `canChangeTheRhythm={isInitiator}`. Reading her own rhythm control now goes through that
     * page, same as opening her check-in does - one implementation, not two.
     */
    expect(PARTY).toContain('canChangeTheRhythm={isInitiator}');
  });

  it('and only while there is a date to wait for', () => {
    /* No date means no session scheduled, and "change how often" answers a question nobody asked. */
    expect(CHAT).toContain('{nextOpensAt && canChangeTheRhythm');
  });
});

/* REPOINTED (batch 1, group 10, 4 November 2026): People and setup as pictured is the only People and setup page, and it says the end
   in the prototype's words, in the panel where how often and how long it runs are chosen. */
const PICTURED = strip(readFileSync(join(CLIENT, 'pages', 'grounds', 'PeopleAndSetupAsPictured.tsx'), 'utf8')).replace(/props\./g, '').replace(/\s+/g, ' ');

describe('the end of a check-in', () => {
  it('is described where the length is chosen, not only when it arrives', () => {
    expect(PICTURED).toContain('At the last session, everyone is asked how this should close.');
  });

  it('in the same panel as how often and how long it runs, because that is the number it is the end of', () => {
    const at = PICTURED.indexOf('id="how-often"');
    expect(at).toBeGreaterThan(-1);
    const panel = PICTURED.slice(at, PICTURED.indexOf('<Panel>', at));
    expect(panel).toContain('how this should close');
  });
});
