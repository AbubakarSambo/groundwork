/**
 * A CHECK-IN CREATED THROUGH THE API AND UNSTARTABLE THROUGH IT.
 *
 * `POST /grounds` creates a ground FOR a named lead, which sits at
 * AWAITING_LEAD until that person has read what was set up for them and said
 * yes. Nothing happens before that — no session opens, nobody is asked
 * anything.
 *
 * There was no route to do it, so a customer could create a ground from their
 * own system and the lead had to log into OURS to start it. Found on our own
 * organisation: one ground, stuck at AWAITING_LEAD, which is why nobody in this
 * company has run a check-in in the product this company sells.
 */
import * as fs from 'fs';
import * as path from 'path';

const withoutComments = (file: string) =>
  fs
    .readFileSync(path.join(__dirname, file), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\/\/.*$/gm, '');

const CONTROLLER = withoutComments('public-api.controller.ts');
const SERVICE = withoutComments('a-check-in-a-customer-can-run.service.ts');

describe('starting a check-in somebody set up for you', () => {
  it('can be found and done through the API', () => {
    expect(CONTROLLER).toMatch(/@Get\('grounds\/awaiting-me'\)/);
    expect(CONTROLLER).toMatch(/@Post\('grounds\/:id\/confirm-lead'\)/);
  });

  it('is panel-authenticated, never machine', () => {
    /**
     * A machine credential doing this would be a customer's SERVER deciding on
     * somebody's behalf that they have read the context and agree with it —
     * which is the one thing this step exists to prevent. It names an
     * organisation and nobody in particular.
     */
    const block = CONTROLLER.slice(
      CONTROLLER.indexOf("@Post('grounds/:id/confirm-lead')"),
      CONTROLLER.indexOf("@Post('grounds/:id/confirm-lead')") + 600,
    );
    expect(block).toContain('@UseGuards(EmbedSessionGuard)');
    expect(block).not.toContain('MachineTokenGuard');
  });

  it('and returns what is being confirmed, rather than a summary of it', () => {
    /* It is somebody else's words about this person's work, and the thing being
       agreed to. A paraphrase would be agreeing to something nobody wrote. */
    expect(SERVICE).toMatch(/brief: g\.brief/);
  });

  it('and scopes by organisation here, not only by initiator downstream', () => {
    /* `confirmLead` checks the initiator, which is right and is not enough: it
       has no reason to know about organisations, and a machine-facing surface
       must never leave that to the caller. */
    expect(SERVICE).toMatch(/where: \{ id: groundId, organizationId \}/);
  });
});
