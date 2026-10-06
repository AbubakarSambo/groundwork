import { templateFor, TEMPLATES, THE_NAMES_TO_SUBMIT } from './a-message-outside-the-window';

/**
 * APPROVAL BELONGS TO WHOEVER OWNS THE META APP, AND FOR A CUSTOMER THAT IS NOT US.
 *
 * The send path asked one question - is this name in WHATSAPP_APPROVED_TEMPLATES - for every send,
 * including sends going out on an ORGANISATION'S own number through their own Meta app. So a
 * customer who connected their number, submitted our three template names under their own app and
 * had them approved still had every business-initiated message recorded as not sent, because OUR
 * environment variable was empty. Nothing on the page or in the record said our environment was
 * the reason.
 *
 * The rule this holds: the list consulted is the list belonging to whoever owns the app the message
 * goes through. `approvedFor` in whatsapp.service.ts picks it; this proves the decision itself
 * cannot be made without one.
 */
describe('whose approval it is', () => {
  /* Changed 2 October: Hafsah's messages (decision 83) replaced the first three names. */
  const ALL = THE_NAMES_TO_SUBMIT;

  it('an empty list means nothing the product starts may go out', () => {
    for (const kind of ['checkin-open', 'overdue', 'your-view-matters', 'report', 'report-retry']) {
      expect(templateFor(kind, [])).toBeNull();
    }
  });

  it("an organisation's own approvals are enough on their own, with ours empty", () => {
    /* The point of the fix: this list is theirs, and it decides. */
    expect(templateFor('checkin-open', ALL)).not.toBeNull();
    expect(templateFor('report', ALL)).not.toBeNull();
  });

  it('and a name nobody approved is still refused, whoever the list belongs to', () => {
    expect(templateFor('checkin-open', [TEMPLATES.report.name])).toBeNull();
  });

  it('the names are the ones the page tells an admin to submit, and there is one definition of them', () => {
    /*
     * Meta matches a template name byte for byte. A page that typed these out would be a copy that
     * eventually differs from the one the sender uses, and the failure would show in Meta's console
     * rather than here. So the page is served these from TEMPLATES, and this is the check that they
     * are all of them.
     */
    expect(new Set(ALL).size).toBe(ALL.length);
    expect(ALL.length).toBe(Object.keys(TEMPLATES).filter((k) => k !== 'report-retry').length);
    /* Meta's rule for a name: lower-case letters, digits and underscores. */
    for (const name of ALL) expect(name).toMatch(/^[a-z0-9_]+$/);
  });
});
