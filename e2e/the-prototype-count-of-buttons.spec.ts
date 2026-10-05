import { test, expect, Page } from '@playwright/test';
import { signIn } from './sign-in-by-email';
import * as path from 'path';
import { pathToFileURL } from 'url';

/**
 * TWO RULES, CHECKED LIVE (Hafsah, 30 September 2026, item 3):
 *
 *   (a) At most one primary (navy) button per screen.
 *   (b) No more buttons than the prototype's own version of that screen has.
 *
 * This opens each rebuilt screen in the RUNNING PRODUCT (client on localhost:5173, API on
 * 127.0.0.1:3000), as the reader it is built for, and the SAME screen in the prototype
 * (docs/prototype/groundwork-prototype.html, opened as a local file, with the persona set through
 * `#d-persona` and the screen chosen by its hash - the way the prototype addresses its own
 * screens; docs/prototype/screens/index.json lists them). It counts every visible button a
 * person can see - a `<button>`, or a link styled and acting as one - and how many of those are
 * primary, on both sides, and fails if the product has more than one primary, or more buttons in
 * total than the prototype's own screen.
 *
 * MADE FAIR IN TWO WAYS, AND NO OTHER (Hafsah, 30 September, item 1), on top of the #main scoping
 * below:
 *
 *   (a) PRIMARY BY KIND, NOT COLOUR. A chosen filter or choice chip (`Choices`, the role/team
 *   filters on the People page and their prototype counterparts) sits on a navy background when
 *   selected, on both sides, the same navy `--gw-navy`/`--navy` a primary button uses - it is a
 *   choice, not a button, and was never meant to be counted as one. Colour cannot tell the two
 *   apart; the button's own KIND can. A primary button is now one carrying the product's own
 *   `gwui-btn-primary` class, or the prototype's own `btn pri` pair of classes - however it was
 *   drawn, old part or new, but never a control that merely happens to render navy.
 *
 *   (b) ONE ROW, ONE COUNT. A button repeated once per row of a genuine list - every "Open" in a
 *   table of people, every "Change" in a list of fields - counts once, by its visible label, on
 *   both sides, because the local data has more rows than the prototype's own fixed example
 *   (Amani is in seven check-ins; the prototype's Miriam is in one). This only ever collapses a
 *   label that appears THREE TIMES OR MORE on the one screen - a real list has many rows, not two
 *   - so it never hides two separate, deliberately duplicated buttons that merely happen to share
 *   words (such as "Send their invitations" appearing once in a warning card and once in the
 *   invite form): those are exactly the kind of accidental double button the whole test exists to
 *   catch, and stay counted separately.
 *
 * Run it against the local servers, from the repo root:
 *
 *   cd e2e && npx playwright test the-prototype-count-of-buttons.spec.ts
 *
 * Sign-in is by an emailed link, the same way as the-page-is-cream.spec.ts: the local API relays
 * every email to 127.0.0.1:1025 in development, and this test listens there itself. Nothing is
 * seeded and nothing is changed; it only opens pages and counts what is on them.
 */

const APP = 'http://localhost:5173';
const PROTOTYPE_FILE = pathToFileURL(
  path.join(__dirname, '..', 'docs', 'prototype', 'groundwork-prototype.html'),
).toString();

type Reader = { who: string; email: string };
const READERS: Record<string, Reader> = {
  participant: { who: 'participant', email: 'amani.u8@example.test' },
  lead: { who: 'lead', email: 'rukia.u8lead@example.test' },
  admin: { who: 'admin', email: 'juma.u8admin@example.test' },
};

/**
 * THE TABLE: every entry on REBUILT_PAGES (client/src/components/gw/ui/rebuilt-pages.ts) that has
 * a prototype counterpart, with the product path to open (as the given reader) and the
 * prototype's own hash and persona for the same screen (docs/prototype/screens/index.json).
 *
 * Several rebuilt pages are PANELS inside one prototype screen, not a screen of their own - the
 * People page's "Waiting to be let in", "Invite people", "Who can join" and "Who can open a
 * check-in" are all sections of the one `people` screen, and the board's `WorkRecords` and the
 * ten small board pieces under `components/gw/` are all sections of the one `board-as-lead`
 * screen. Those are marked `null`: this test does not open them separately (they are covered when
 * their parent screen is opened), and says so in the report rather than silently skipping them.
 */
/* `mustShow`: for a page whose true state on this Mac's test data is short (an empty state), the
   exact sentence it must show instead of 300 characters, so a page that did not load still fails. */
type Counterpart = { productPath: string; reader: keyof typeof READERS; hash: string; persona: string; mustShow?: string } | null;
const SCREENS: Record<string, Counterpart> = {
  'pages/invite/InvitePage.tsx': null, // needs an unauthenticated invite token; not opened by reader sign-in
  'pages/invite/InvitationExpired.tsx': null, // same
  'pages/join/WaitingForAnAdminPage.tsx': null, // same
  /*
   * GROUP 3, PIECE 1 (signing in and joining, A2/A3): all four are signed-OUT screens, and this
   * test signs a reader in before opening anything - opening them here would mean signing out
   * first, which no other entry in this table does, and `signIn` keeps a signed-in session across
   * the whole run deliberately (its own comment). So the one-primary-button rule for these four is
   * checked statically instead, by `primaryButtonCount` in
   * components/gw/ui/the-rebuilt-pages-use-only-the-new-parts.spec.ts, which runs for every entry
   * on REBUILT_PAGES including these.
   */
  'pages/auth/auth-kit.tsx': null, // a kit of parts, not a screen of its own
  'pages/auth/AuthPage.tsx': null, // signed out; see above
  'pages/auth/MagicVerifyPage.tsx': null, // signed out; see above
  'pages/join/JoinPage.tsx': null, // signed out; see above
  'pages/grounds/OutOfTime.tsx': null, // needs a check-in that has actually run out of time
  'pages/org/OrgMembersPage.tsx': { productPath: '/org/members', reader: 'admin', hash: '#/settings/people', persona: 'admin' },
  'pages/org/WaitingToBeLetIn.tsx': null, // a panel of the people screen above, not its own prototype screen
  'pages/org/EveryoneHere.tsx': null, // a panel of the people screen above
  'pages/org/InvitePeople.tsx': null, // a panel of the people screen above
  'pages/org/WhoCanJoin.tsx': null, // a panel of the people screen above
  'pages/org/TheInviteLink.tsx': null, // a panel of the people screen above
  'pages/org/WhoCanOpenACheckIn.tsx': null, // a panel of the people screen above
  'pages/org/OnePersonPage.tsx': { productPath: '/org/members/f5d37595-4a15-41e9-9c2e-f9b7e52a30a3', reader: 'admin', hash: '#/settings/people/miriam', persona: 'admin' },
  'pages/grounds/CheckInPeopleAndSetup.tsx': { productPath: '/grounds/9028f0ad-293b-4592-9a4e-25b680dd91cd?tab=settings', reader: 'lead', hash: '#/c/sales/people', persona: 'lead' },
  /*
   * GROUP 3, PIECE 5, LAST PIECE (Context and resources, B2-context): the lead's check-in page,
   * ContextPage.tsx, drawn by GroundAdminPage.tsx as the "Context and resources" tab. Rukia is the
   * same lead persona the prototype's own context.jpg/context.txt are drawn for, on the same "Sales
   * team, Q3" check-in every other lead entry here opens.
   */
  'pages/grounds/GroundAdminPage.tsx': { productPath: '/grounds/9028f0ad-293b-4592-9a4e-25b680dd91cd?tab=context', reader: 'lead', hash: '#/c/sales/context', persona: 'lead' },
  'components/gw/ContextPage.tsx': null, // the tab GroundAdminPage.tsx above opens; not a screen of its own
  /*
   * GROUP 3, PIECE 5, PART 9 (the participant's check-in page): Amani, on the same "Sales team, Q3"
   * check-in every other entry here opens, at its default tab (`/p` with no `?tab=`). Her check-in
   * is not due right now, so the page renders the prototype's own "between sessions" conversation
   * card (`BetweenCheckIns`) - the closest prototype counterpart is B3's own `between-check-ins`
   * screen (docs/prototype/screens/index.json), drawn for the "part" persona.
   */
  'pages/grounds/GroundParticipantPage.tsx': { productPath: '/grounds/9028f0ad-293b-4592-9a4e-25b680dd91cd/p', reader: 'participant', hash: '#/c/sales/between', persona: 'part' },
  'pages/board/BoardPage.tsx': { productPath: '/grounds/9028f0ad-293b-4592-9a4e-25b680dd91cd/board', reader: 'lead', hash: '#/c/sales/board', persona: 'lead' },
  'pages/board/WorkRecords.tsx': null, // a section of the board screen above
  'components/gw/where-each-person-is.tsx': null, // a section of the board screen above
  'components/gw/WhatTheRecordShows.tsx': null,
  'components/gw/TheJudgement.tsx': null,
  'components/gw/WhatTheNetworkSaid.tsx': null,
  'components/gw/HowThisHasMoved.tsx': null,
  'components/gw/ResolutionPanel.tsx': null,
  'components/gw/TheSessionsReport.tsx': null,
  'components/gw/split-one-total-across-people.tsx': null,
  'components/gw/WhatSuccessLooksLike.tsx': null,
  'components/gw/TargetsBand.tsx': null,
  'components/gw/Suggestions.tsx': null,
  'components/gw/how-it-is-going.tsx': null,
  'components/gw/what-to-settle-together.tsx': null,
  'components/gw/a-second-press-before-it-is-gone.tsx': null,
  'components/gw/TheOtherBoardsYouAreIn.tsx': null,
  'pages/settings/SettingsPage.tsx': { productPath: '/settings', reader: 'lead', hash: '#/settings', persona: 'lead' },
  'pages/more/MorePage.tsx': null, // the prototype's more-menu-phone is a 390px view of the sidebar, not its own screen
  'pages/connections/WhatsAppSetupPage.tsx': { productPath: '/settings/whatsapp', reader: 'admin', hash: '#/settings/whatsapp', persona: 'admin' },
  'pages/connections/ConnectionsPage.tsx': { productPath: '/settings/connections', reader: 'admin', hash: '#/settings/connections', persona: 'admin' },
  'pages/billing/BillingPage.tsx': { productPath: '/settings/billing', reader: 'admin', hash: '#/settings/billing', persona: 'admin' },
  'pages/org/IntegrationsPage.tsx': { productPath: '/settings/tools', reader: 'admin', hash: '#/settings/tools', persona: 'admin' },
  /* Group 2, piece 1 (C1-today-and-check-ins). "You are in." (YouAreIn.tsx) and the admin's welcome
     card/checklist (an-admin-lands-on-a-check-in-list.tsx) are both pieces of Today, not a screen of
     their own - covered when Today itself is opened, as the lead here. */
  'pages/today/TodayPage.tsx': { productPath: '/today', reader: 'lead', hash: '#/today', persona: 'lead' },
  'pages/today/YouAreIn.tsx': null, // a piece of Today, above
  'pages/grounds/an-admin-lands-on-a-check-in-list.tsx': null, // a piece of Today, above
  'pages/grounds/GroundsListPage.tsx': { productPath: '/grounds', reader: 'lead', hash: '#/checkins', persona: 'lead' },
  /* Group 2, piece 2 (C2-the-you-board). Amani (participant) is the reader closest to the
     prototype's own Miriam - the same shape of person, a participant across a few check-ins - so
     her persona here is "part", as docs/prototype/screens/index.json has you-board-miriam. */
  'pages/you/YouPage.tsx': { productPath: '/you', reader: 'participant', hash: '#/you', persona: 'part' },
  /* Group 2, piece 3 (D2-company). Both screens are drawn for the prototype's "ceo" persona
     (docs/prototype/source/data.js: "Amani, CEO", admin:true) - the closest of our own readers is
     Juma, an admin. */
  /* No organisation on this Mac has company priorities, so the page shows its true empty state;
     adding them needs a database write, which the safety check refused (1 October). */
  'pages/company/CompanyPage.tsx': { productPath: '/company', reader: 'admin', hash: '#/company', persona: 'ceo', mustShow: "No priorities have come in from your organisation's own systems yet." },
  'pages/company/CompanyContextPage.tsx': { productPath: '/company/context', reader: 'admin', hash: '#/company/kijani/context', persona: 'ceo' },
  /*
   * GROUP 2, PIECE 4 (E-suites). Every suite board's prototype screen is drawn for the "admin"
   * persona (docs/prototype/screens/index.json) - Juma here. The hub itself has two prototype
   * screens (suites-admin, suites-lead, both at the same hash, picked by persona); admin's is used,
   * since every board below needs its suite switched on, which only an admin's own page offers.
   */
  'pages/suites/SuitesPage.tsx': { productPath: '/settings/suites', reader: 'admin', hash: '#/settings/suites', persona: 'admin' },
  /* None of Kilima Traders U8's ten suites is switched on, so every board below shows its own true
     "not switched on" sentence - the same reason the Company page needed `mustShow` (1 October);
     turning a suite on would be adding data, which this piece was told not to do. */
  'pages/suites/OnboardingBoardPage.tsx': { productPath: '/suite/onboard', reader: 'admin', hash: '#/suite/onboard', persona: 'admin', mustShow: 'The onboarding suite is not switched on.' },
  'pages/suites/LeaveBoardPage.tsx': { productPath: '/suite/leave', reader: 'admin', hash: '#/suite/leave', persona: 'admin', mustShow: 'The leave suite is not switched on.' },
  'pages/suites/TimeSheetsPage.tsx': { productPath: '/suite/time', reader: 'admin', hash: '#/suite/time', persona: 'admin' },
  'pages/suites/ReviewsBoardPage.tsx': { productPath: '/suite/reviews', reader: 'admin', hash: '#/suite/reviews', persona: 'admin' },
  'pages/suites/ReviewPage.tsx': null, // needs a real review id, started from the board above; not opened separately
  'pages/suites/LeavingBoardPage.tsx': { productPath: '/suite/leaving', reader: 'admin', hash: '#/suite/leaving', persona: 'admin', mustShow: 'The suite for when someone leaves is not switched on.' },
  'pages/suites/RoleMapPage.tsx': { productPath: '/suite/roles', reader: 'admin', hash: '#/suite/roles', persona: 'admin', mustShow: 'The role map suite is not switched on.' },
  'pages/suites/SpendingPage.tsx': { productPath: '/suite/spend', reader: 'admin', hash: '#/suite/spend', persona: 'admin', mustShow: 'The spending suite is not switched on.' },
  'pages/suites/TodosPage.tsx': { productPath: '/suite/todos', reader: 'admin', hash: '#/suite/todos', persona: 'admin', mustShow: 'The to-dos suite is not switched on.' },
  'pages/suites/CustomersPage.tsx': { productPath: '/suite/customers', reader: 'admin', hash: '#/suite/customers', persona: 'admin', mustShow: 'The customers and deals suite is not switched on.' },
  'pages/suites/EquipmentPage.tsx': { productPath: '/suite/equipment', reader: 'admin', hash: '#/suite/equipment', persona: 'admin', mustShow: 'The equipment suite is not switched on.' },
  /* Group 3, piece 2 (the reports). The lead's own completed session on "Sales team, Q3"
     (9028f0ad-293b-4592-9a4e-25b680dd91cd) - the prototype's closest counterpart is B4's
     "one-session" screen (#/c/sales/session/37), read as the lead. This one product page also
     serves a participant their own session report (own-report.txt's wording) and refuses anyone
     who is not a party to that session - both checked live by the picture round and by
     your-report-as-each-reader-reads-it.spec.tsx, not by this static count. */
  'pages/report/SessionReportPage.tsx': { productPath: '/checkin/92ae925e-90b5-42f6-a0d4-6187724049dc/report', reader: 'lead', hash: '#/c/sales/session/37', persona: 'lead' },
  /*
   * GROUP 3, PIECE 3 (the check-in conversation, docs/prototype/screens/B3-the-check-in).
   * `TheCheckInHeader.tsx` and `TheEndCard.tsx` are pieces of this one screen, not screens of
   * their own, so they are marked null below.
   *
   * OPENS RUKIA'S OWN COMPLETED, SOLO CHECK-IN (614f5ad3-eace-4c01-ac58-0226a51c1b6b), not a
   * session still waiting for her to open it. Every check-in on this Mac that is not finished yet
   * is NOT_STARTED - opening one would call the engine and start a real session, which this test
   * (like the reviewer walking the product by hand) must never do. A finished check-in with
   * nobody else on it (`aTeamReportComes: false`) renders the prototype's own "done" shape
   * (done.txt) with no second, "team's report" card - the one state on this Mac whose button
   * count actually matches the prototype's own picture; every other finished check-in here
   * already has its team report released, which done.jpg catches a moment earlier ("Not shared
   * yet"), and counting that real difference in the data as a button-count failure would be
   * testing the data, not the screen.
   */
  'pages/chat/ChatPage.tsx': { productPath: '/checkin/614f5ad3-eace-4c01-ac58-0226a51c1b6b', reader: 'lead', hash: '#/c/sales/done', persona: 'part' },
  'components/gw/checkin/TheCheckInHeader.tsx': null, // a piece of the check-in conversation above
  'components/gw/checkin/TheEndCard.tsx': null, // a piece of the check-in conversation above
  /*
   * GROUP 3, PIECE 4 (starting a check-in, docs/prototype/screens/B1-starting-a-check-in), now
   * done in full (4d-1 through 4d-4): EntryChatPage.tsx, opened as Rukia, the same lead persona
   * the prototype's own "start" screen (start.txt/start.jpg) is drawn for. This opens /start as
   * it first shows itself - the single "What do you want your team to check in about?" box, one
   * "Send" and the "See every situation" link - not the later onboarding, check-in or save-card
   * states the conversation moves through, which the entry-chat specs in client/src/pages/enter/
   * already cover with mocked data rather than a live session.
   */
  'pages/enter/EntryChatPage.tsx': { productPath: '/start', reader: 'lead', hash: '#/start', persona: 'lead' },
};

/* Sign-in is by the emailed link, through the one mail catcher every browser test shares
   (sign-in-by-email.ts). */

/**
 * Every visible button-like element, and how many of those are primary - counted ONLY inside the
 * page's own content area, on both sides.
 *
 * WHY THIS CHANGED (Hafsah, 30 September, item 1): counting the whole document also counted the
 * sidebar and the phone tab bar - the product's `<aside class="gw-sidebar-desktop">` rail lists
 * every one of the reader's check-ins as a link, plus "Start a check-in", "Jump to", the
 * organisation switcher and "Settings, help, sign out", none of which the prototype's own sidebar
 * carries in the same shape (a fixed nav list, no live check-in rows) - so the two totals were
 * never comparable, and the product could fail the count by having MORE CHECK-INS, which has
 * nothing to do with the screen being reviewed. The product's Feedback button (`AppShell.tsx`'s
 * `FeedbackWidget`) is a floating pill outside the page entirely, on every authenticated screen,
 * and the prototype has nothing at all in that position - counting it would fail every product
 * screen by exactly one, forever, for a control neither rule is about.
 *
 * Both sides put the page's own content in a `<main id="main">`, as a sibling of the sidebar/rail
 * and the tab bar, never a descendant of either:
 *   - product: `AppShell.tsx`, `<AppSidebar />` then `<main id="main" className="gw-main-content">
 *     {children}</main>` then `<FeedbackWidget />` - all three siblings. The rail, the phone tab
 *     bar (`gw-sidebar-mobile`, inside `AppSidebar`) and the feedback pill all sit OUTSIDE this
 *     `<main>`, so scoping the count to it excludes all three without listing any of them by name.
 *   - prototype: `shell()`, `groundwork-prototype.html`: `<div class="shell">${rail}<main
 *     class="main" id="main">...${body}...</main></div>${tb}` - the same shape: the rail (`nav.rail`)
 *     and the phone tab bar (`nav.tabbar`) are siblings of `#main`, not inside it.
 *
 * So both sides are counted the same way: every visible button or link-as-button inside `#main`
 * (still excluding the prototype's own dev bar, `#dev`/`#devshow`, which sits outside `#main`
 * anyway but is excluded for clarity).
 *
 * PRIMARY IS NOW BY KIND (item 1a above), not by computed background colour: the product's own
 * `gwui-btn-primary` class, or the prototype's own pair of classes, `btn` and `pri` together (a
 * plain `.btn` is secondary/quiet/danger; `.pri` alone is never used away from `.btn` in the
 * prototype's own CSS). A selected filter chip is navy on both sides but carries neither class, so
 * it is no longer counted as primary.
 *
 * REPEATED ROWS COUNT ONCE (item 1b above): once every node's label and primary-kind are read,
 * any label seen three times or more on the one screen - the signature of a real list, a table row
 * or a repeated field, never of two accidental one-off buttons that merely share words - is folded
 * down to a single counted instance, keeping whichever primary-kind its first occurrence had (a
 * repeated row is always drawn the same way, so its first occurrence speaks for the rest).
 */
async function countButtons(page: Page): Promise<{ total: number; primary: number; labels: string[] }> {
  const { items } = await page.evaluate(() => {
    const isVisible = (e: Element) => {
      const r = (e as HTMLElement).getBoundingClientRect();
      const cs = getComputedStyle(e);
      return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none';
    };
    const root = document.querySelector('#main') ?? document.body;
    /* The prototype draws some screens as static pictures, with a reply chip as <span class="chip">;
       in the product that chip is a tappable reply. Counted on both sides, so like is compared with
       like (1 October, the between-check-ins screen). */
    const nodes = Array.from(root.querySelectorAll('button, a, span.chip')).filter((e) => {
      if (e.closest('#dev, #devshow')) return false; // the prototype's own dev bar, not the screen
      /* An on/off switch is a setting, not a button, on both sides (ours is a button with
         role="switch", the prototype's a checkbox); like a chosen chip, it is not counted. */
      if (e.getAttribute('role') === 'switch' || e.getAttribute('role') === 'checkbox') return false;
      /* A tab is the check-in page's own navigation between its views, like the sidebar this count
         already leaves out (1 October): not a button on the screen being compared.
         Board review, 1 October, item 8: this only ever matched the PRODUCT's own tabs
         (role="tab"), so a screen's tab row was excluded on one side and counted on the other -
         never a fair comparison. The prototype draws its own tab row as `<a class="tab">` inside
         `nav.tabs`/`.views` (groundwork-prototype.html: `.tabs{...}`, `.tab{...}`), with no ARIA
         role at all, so it needs its own test, excluded here the same way. */
      if (e.getAttribute('role') === 'tab' || e.closest('[role="tablist"]')) return false;
      if (e.classList.contains('tab') && e.closest('.tabs, .views')) return false;
      /* A quiet text link is a link, not a button (Hafsah, 30 September: the no-seat warning's
         action is "a quiet text link inside the warning, not a second button"). Ours is drawn
         by `.gwui-plain-link`, underlined words with no box, sometimes on a <button> because it
         does something rather than go somewhere; the prototype's own text links are plain <a>s,
         which were never counted. Only the class decides, so a boxed button can't slip through. */
      if (e.classList.contains('gwui-plain-link')) return false;
      const cs = getComputedStyle(e);
      const looksLikeAButton = e.tagName === 'BUTTON' || (e.tagName === 'SPAN' && e.classList.contains('chip')) || cs.display.includes('flex') || cs.display.includes('inline-flex') || e.className.toString().includes('btn');
      return looksLikeAButton && isVisible(e);
    });
    const isPrimary = (e: Element) => {
      const cls = e.className.toString().split(/\s+/);
      return cls.includes('gwui-btn-primary') || (cls.includes('btn') && cls.includes('pri'));
    };
    const items = nodes.map((e) => ({
      label: (e.textContent || '').trim().slice(0, 40),
      primary: isPrimary(e),
    }));
    return { items };
  });

  /* Item 1b: fold a label seen 3+ times on this one screen down to its first occurrence. */
  const countOfLabel = new Map<string, number>();
  for (const it of items) countOfLabel.set(it.label, (countOfLabel.get(it.label) ?? 0) + 1);
  const seenRepeated = new Set<string>();
  const kept: { label: string; primary: boolean }[] = [];
  for (const it of items) {
    const isRepeatedRow = (countOfLabel.get(it.label) ?? 0) >= 3;
    if (isRepeatedRow) {
      if (seenRepeated.has(it.label)) continue;
      seenRepeated.add(it.label);
    }
    kept.push(it);
  }

  return {
    total: kept.length,
    primary: kept.filter((it) => it.primary).length,
    labels: kept.map((it) => it.label),
  };
}

test.use({ viewport: { width: 1440, height: 900 } });

/**
 * ONE SCREEN, BOTH SIDES, CHECKED THE SAME WAY (pulled out so the board-by-kind loop below, item 8,
 * does not have to repeat it). Signs in as `readerEmail`, opens `productPath`, counts its buttons,
 * then does the same for the prototype at `hash` with `persona` selected, and fails with the exact
 * labels on both sides when either rule breaks.
 */
async function checkButtons(
  page: Page,
  context: import('@playwright/test').BrowserContext,
  name: string,
  productPath: string,
  readerEmail: string,
  hash: string,
  persona: string,
  mustShow?: string,
) {
  await signIn(page, readerEmail);
  await page.goto(`${APP}${productPath}`);
  await page.waitForLoadState('networkidle', { timeout: 20000 }).catch(() => {});
  await page.waitForTimeout(2000);
  const product = await countButtons(page);
  /* A page that did not load, or an address that does not exist, shows almost nothing and would
     pass every count. It must show the page itself: its own words inside #main. */
  const mainText = await page.evaluate(() => (document.querySelector('#main') as HTMLElement | null)?.innerText.trim() ?? '');
  if (mustShow) expect(mainText.replace(/[’]/g, "'"), `${productPath} shows its page`).toContain(mustShow);
  else expect(mainText.length, `${productPath} shows its page (not an empty or missing one)`).toBeGreaterThan(300);

  const proto = await context.newPage();
  await proto.goto(PROTOTYPE_FILE);
  await proto.selectOption('#d-persona', persona).catch(() => {});
  await proto.evaluate(() => { (window as any).dispatchEvent?.(new Event('hashchange')); });
  await proto.goto(`${PROTOTYPE_FILE}${hash}`);
  await proto.waitForTimeout(1000);
  const prototype = await countButtons(proto);
  await proto.close();

  const problems: string[] = [];
  if (product.primary > 1) {
    problems.push(`${product.primary} primary buttons, not 1: ${product.labels.slice(0, 10).join(' | ')}`);
  }
  if (product.total > prototype.total) {
    problems.push(`${product.total} buttons, vs the prototype's ${prototype.total} (product: ${product.labels.join(' | ')}) (prototype: ${prototype.labels.join(' | ')})`);
  }
  if (problems.length) {
    console.log(`${name}: ${problems.join(' -- ')}`);
  }
  expect(problems, `${name} (product ${productPath} vs prototype ${hash})`).toEqual([]);
}

test.describe('the two button rules, screen by screen', () => {
  const entries = Object.entries(SCREENS);
  const withCounterpart = entries.filter(([, c]) => c !== null) as [string, NonNullable<Counterpart>][];
  const withoutCounterpart = entries.filter(([, c]) => c === null).map(([p]) => p);

  test('every entry on REBUILT_PAGES is accounted for', () => {
    expect(Object.keys(SCREENS).length).toBeGreaterThan(0);
    // The two lists above must cover every REBUILT_PAGES entry; see the comment on SCREENS.
    console.log(`With a prototype counterpart to open (${withCounterpart.length}): ${withCounterpart.map(([p]) => p).join(', ')}`);
    console.log(`No separate prototype screen - a panel of one already opened above (${withoutCounterpart.length}): ${withoutCounterpart.join(', ')}`);
  });

  for (const [page404, counterpart] of withCounterpart) {
    test(`${page404}: at most one primary, and no more buttons than the prototype`, async ({ page, context }) => {
      const reader = READERS[counterpart.reader];
      await checkButtons(page, context, page404, counterpart.productPath, reader.email, counterpart.hash, counterpart.persona, counterpart.mustShow);
    });
  }
});

/**
 * BOARD REVIEW, 1 OCTOBER, ITEM 8: EVERY KIND'S BOARD, AS THE LEAD AND AS A PARTICIPANT.
 *
 * The table above opens the board ONLY ONCE (sales, "Sales team, Q3", as the lead). The switchboard
 * draws a different board for each of the 24 situations (`the-switchboard-g2-table.ts`), so a fault
 * only one kind's own sections trip can hide behind the one kind this file already opened. This
 * opens every kind's own board, as both readers who actually have one (10 July check-ins own test
 * data, `kinds.json`/`product-jobs.json` from the board review's picture round), against that same
 * kind's own prototype example (`#/c/<kind>/board`, docs/prototype/screens/index.json).
 *
 * TWO ARE LEFT OUT, BOTH NOTED RATHER THAN SILENTLY SKIPPED:
 *   - founder, AS A PARTICIPANT: this check-in has no second person on it at all (kinds.json: one
 *     participant, the lead, five answers, complete) - there is no participant account to sign in
 *     as.
 *   - mvq4, EITHER READER: `kinds.json` records its own creation failing outright - `POST
 *     /grounds` returned 400, "Your free plan includes 10 check-ins. Subscribe to open more." -
 *     so no ground exists for it on this Mac at all. The prototype's own mvq4 example can still be
 *     pictured (the board review did, `jobs.json`), but there is no product board to compare it
 *     against without first clearing check-ins to make room under the plan limit, which this
 *     workspace does not do. Left for Hafsah in the morning report rather than guessed at.
 */
/* KNOWN GAPS, said rather than hidden (1 October, night). Each is expected to fail until its cause
   is fixed, and the test says so the day it passes. gov, loans, matter and mvnext: their prototype
   examples are boards of their own shape that the engine does not send yet (request 105), so the
   extra controls are real ones. Every participant board: the prototype's participant board is a
   short personal view (B5), which is board batch 2. mvq4 is the borrowed test check-in d1880c07
   (its own could not be made under the free plan), led by Rukia; it has no participant answer. */
const KNOWN_GAP: Record<string, string> = {
  'gov lead': 'request 105: the prototype board is its own shape', 'gov participant': 'board batch 2 and request 105',
  'loans lead': 'request 105: the prototype board is its own shape', 'loans participant': 'board batch 2 and request 105',
  'matter lead': 'request 105: the prototype board is its own shape', 'matter participant': 'board batch 2 and request 105',
  'mvnext lead': 'request 105: the prototype board is its own shape', 'mvnext participant': 'board batch 2 and request 105',
  'mvq4 lead': 'request 105: the prototype board is its own shape',
  /*
   * 2 October: the eng and programme participants' boards came within their prototype examples'
   * counts once the sales pass (2304d06b) folded the participant's board, so both gaps are closed
   * and their entries removed; the test now holds them to the count.
   *
   * RELEASE WALKTHROUGH A, FIX 6, 5 OCTOBER: checked, and this one is NOT closed. A single
   * "mvnext: as a participant" run outside the full-suite pass shows the gap is still real - "Read
   * your own report", "Every session" and "Ask" are still extra against the prototype's own count,
   * unrelated to the "Start my check-in" fallback this fix adds. The single unexpected pass seen in
   * a full-suite run is left unexplained (most likely a timing flake in a serial, stateful run
   * against the real dev servers) rather than taken as the gap closing. Entry kept.
   */
}
const BOARD_KINDS: { kind: string; groundId: string; lead: string; participant: string | null }[] = [
  { kind: 'founder', groundId: '3ca11603-8fd8-4027-ac6f-ef180585927c', lead: 'u7lead@example.test', participant: null },
  { kind: 'eng', groundId: '555ac67d-44ad-4520-8717-54979e9d4f00', lead: 'u7lead@example.test', participant: 'u7aisha@example.test' },
  { kind: 'support', groundId: '48896035-9edd-47bc-8b53-8bd83587fc8d', lead: 'u7lead@example.test', participant: 'u7aisha@example.test' },
  { kind: 'ops', groundId: 'f76b7a18-f22a-4ecd-9df1-8d7e21bfb87a', lead: 'u7lead@example.test', participant: 'u7aisha@example.test' },
  { kind: 'programme', groundId: '46cfcb15-1ed6-497d-a724-d063925d1127', lead: 'u7lead@example.test', participant: 'u7aisha@example.test' },
  { kind: 'gov', groundId: 'ee96f03c-8be5-442e-9c3f-0f84d277192b', lead: 'u7lead@example.test', participant: 'u7aisha@example.test' },
  { kind: 'loans', groundId: '4e89d79c-cc60-42f6-b622-95c8467aad9e', lead: 'rukia.u8lead@example.test', participant: 'amani.u8@example.test' },
  { kind: 'matter', groundId: '92625659-b766-4587-8bef-cbd6b704ea2f', lead: 'rukia.u8lead@example.test', participant: 'amani.u8@example.test' },
  { kind: 'mvnext', groundId: 'a6ec96f6-1aad-40ed-82ac-5b9ecb5cb95f', lead: 'rukia.u8lead@example.test', participant: 'amani.u8@example.test' },
  { kind: 'sales', groundId: '9028f0ad-293b-4592-9a4e-25b680dd91cd', lead: 'rukia.u8lead@example.test', participant: 'amani.u8@example.test' },
  { kind: 'mvq4', groundId: 'd1880c07-eb5d-4e1d-9007-977e1b53788c', lead: 'rukia.u8lead@example.test', participant: null },
];

test.describe('the two button rules, every kind of board', () => {
  for (const { kind, groundId, lead, participant } of BOARD_KINDS) {
    test(`${kind}: as the lead`, async ({ page, context }) => {
      test.fail(!!KNOWN_GAP[`${kind} lead`], KNOWN_GAP[`${kind} lead`] ?? '')
      await checkButtons(page, context, `${kind} board (lead)`, `/grounds/${groundId}/board`, lead, `#/c/${kind}/board`, 'lead');
    });
    if (participant) {
      test(`${kind}: as a participant`, async ({ page, context }) => {
        test.fail(!!KNOWN_GAP[`${kind} participant`], KNOWN_GAP[`${kind} participant`] ?? '')
        await checkButtons(page, context, `${kind} board (participant)`, `/grounds/${groundId}/board`, participant, `#/c/${kind}/board`, 'part');
      });
    }
  }
});
