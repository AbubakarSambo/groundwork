# Design audit: the product's screens compared with the prototype

Written on 28 September 2026 for Hafsah, in the screens workspace (`wip/prototype-ui`). This is an audit only. No product code was changed.

## The short answer

You are right. The difference is not a list of small things. The product and the prototype follow two different ideas of what a screen is.

- **The prototype is a reading product.** Body text is 16 pixels. Every button and tab is at least 44 pixels tall. There is one page frame for every screen: the page starts at the same left edge, under the same kind of title, and is up to 1150 pixels wide. Every screen is made from the same dozen parts (a section with a heading, a white panel, a list row with a coloured edge, a table row with an avatar, a tag, three kinds of button). Headings are near-black, never blue.
- **The product is a dense dashboard that has been reworded.** Most of its text is 11 to 13 pixels. Buttons are often 30 to 40 pixels tall and stretch the full width of a card. Each page decides its own width (560, 620, 680, 720, 860, 900, 1040, 1060 or 1140 pixels) and centres itself, so the left edge moves from page to page. Headings on the people pages are blue. Many pages are still made from the old product's parts, and the newer pages each have their own set of styles.

The colours are not the problem. The prototype's final colours and the product's colours are almost exactly the same (see part 2). What differs is the size of everything, the page frame, and the parts.

The good news is that the right parts already exist in the product. In U.1 (26 September) the prototype's button, tag, "what needs you" row, mark, stage ladder, type sizes and sidebar were copied into the product with the prototype's exact values. But most pages were not rebuilt from them. The People page, one person's page and the check-in's setup do not use them at all.

---

## 1. What each screen is built from

### How I checked

For every page under `client/src/pages` and every shared piece in `client/src/components/gw`, I looked at which parts it uses (the kit's components, the CSS classes, and its own inline styles), and I used `git log` to see when each part was made. The prototype arrived in this repository on 26 September 2026 (commit `e84eee1c`). Anything made before then cannot have come from it.

### The three kinds of parts in the product

**A. The old product's parts (made from May to August 2026).** These are the classes in `client/src/index.css` that date from the first commit on 29 May, and the first five components in `kit.tsx`.

- In `index.css` they are `gw-hdr` (a white header bar), `gw-btn` (a full-width navy button, 13 pixels, 10 pixels of padding, about 38 to 40 pixels tall), `gw-btn-sec`, `gw-btn-sm` (a 12-pixel cream pill, 30 pixels tall), `gw-input` and `gw-ta` (13-pixel fields), `gw-label` (12 pixels), `gw-ttl` (a 20-pixel sans-serif title), `gw-sub-t` (13 pixels), `gw-sec` (11-pixel capitals), `gw-box`, `gw-pill` (11 pixels), `gw-prow` (a person row drawn as its own small card), `gw-av` (a 32-pixel avatar with 11-pixel initials), `gw-card` (6-pixel corners), `gw-tab` (12 pixels) and the `cg-*` classes of the old "create a check-in" flow.
- In `kit.tsx` they are `Zone`, `Sec`, `Card`, `Row`, `Pill`, `Stat` and the style objects `td`, `btn`, `miniBtn` and `btnGhost`. The file's own comment says they were lifted out of the old board page on 12 August and that this was "an EXTRACTION, not a redesign". `Pill` is 10.5 pixels, and its "flat" tone is a cool grey (`#EEF0F4`) that the prototype does not have. `btn` is 13 pixels with 7-pixel corners. `Card` has a small shadow that the prototype's panels do not have.
- On top of these there are 4,294 inline `style={{ }}` blocks in pages and components. The most common inline font sizes are 13 (656 times), 12 (496 times), 12.5 (357 times), 11 (216 times) and 11.5 (155 times). 16 pixels, the prototype's body size, appears 34 times. There are 27 different font sizes in inline styles and 36 different colours written as raw codes.

**B. Parts copied from the prototype (made on 26 September, in U.1 and U.2).** These match the prototype's values exactly or almost exactly.

- In `kit.tsx`: `Button` (primary, secondary, quiet; big and small), `Tag`, `NeedsYouRow` and `NeedsYouList`, `Mark`, `MarkKey` and `StageLadder`.
- In `index.css`: the type classes `gw-t-greet`, `gw-t-title`, `gw-t-h2`, `gw-t-h3`, `gw-t-body`, `gw-t-small` and `gw-t-tiny`; the button classes `gw-b-*`; the tag classes `gw-tag-*`; the "what needs you" classes `gw-need-*`; the marks `gw-mk-*`; the sidebar `gw-rl-*`; "Jump to" `gw-jump-*`; the phone's "More" page `gw-more-*`.
- In `pages/auth/auth-kit.tsx`: `AuthCard`, `AuthField`, `PasswordField` and the rest of the sign-in parts (48-pixel fields, 16-pixel text, 14.5-pixel bold labels, as in the prototype).

**C. Parts made for one page only (made from 26 to 28 September, in U.3 to U.19).** Each of these pages got its own family of classes: `gw-people-*` and `gw-one-*` (People and one person), `gw-you-*` (You, Company, the suites), `gw-today-*`, `gw-conn-*`, `gw-welcome-*`, `gw-invite-*`, `gw-org-row-*`, `gw-who-can-join-*`. They use the right colours. Some of them use the prototype's sizes (`gw-you-*` uses 14.5 and 16 pixels and the kit's `Button` and `Tag`). Others do not: `gw-people-*` uses 13-pixel text, 11.5-pixel tags, blue 17-pixel headings, the old full-width `gw-btn` and the old `gw-btn-sm` pill. None of them is shared, so the same thing (a section heading, a person row, a panel) is drawn several different ways.

### Screen by screen

"Old" means kind A above, "prototype" means kind B, and "one page" means kind C. The date is when the page's file was first made.

**Sign in and joining**

| Page | Built from | Verdict |
| --- | --- | --- |
| `auth/AuthPage` (29 May, rebuilt) | Prototype sign-in parts from `auth-kit`, the kit's `Button`. | Rebuilt from prototype parts. It matches. |
| `auth/ChoosePasswordPage`, `EmailConfirmed`, `GoogleFailedPage`, `LinkExpired`, `LinkSentPanel`, `SignOutPage` | `auth-kit` and `Button`. | Built from prototype parts. They match. |
| `auth/MagicVerifyPage` (12 June) | Old `gw-btn` and 51 inline styles. | Old product with new words. |
| `auth/GoogleCallbackPage` (10 August) | Old `gw-hdr`, `gw-logo`, `gw-bd`, `gw-sub-t`. | Old product. |
| `invite/InvitePage` (29 May) | The prototype's plain arrival frame, but inside it the old `gw-ttl`, `gw-sub-t`, `gw-btn`, `gw-input` and `gw-label`; one-page `gw-invite-*`; and for someone who already joined, the old header, an emoji and arrow buttons. | Mixed. The frame is the prototype's, the parts inside are old. |
| `invite/InvitationExpired` | `auth-kit`. | Prototype parts. |
| `join/JoinPage` (27 June) | Old `gw-ttl`, `gw-label`, `gw-input`, `gw-fld`. | Old product. |
| `join/AnswerFirstPage` (20 September) | 37 inline styles at 12.5 to 15 pixels. | Old way of building, new page. |
| `join/JoinConfirmPage` | Inline styles. | Old way of building. |
| `join/JoinByLinkPage`, `WaitingForAnAdminPage` | `auth-kit` and `Button`, plus the old `gw-steps`. | Mostly prototype parts. |
| `org/OrgsPage`, `OrgNewPage`, `WhereDoYouWork`, `WelcomePage` | `auth-kit`, `Button`, `Tag`, one-page `gw-org-row-*`. | Mostly prototype parts. |
| `mail/StopRemindersPage` | `auth-kit` and `Button`. | Prototype parts. |
| `mail/StopMailPage` (7 September) | Inline styles. | Old way of building. |

**People and the organisation**

| Page | Built from | Verdict |
| --- | --- | --- |
| `org/OrgMembersPage` (People) (10 July, rebuilt 27 September) | One-page `gw-people-*` at 13 pixels with blue headings; old `gw-btn` (full width) and `gw-btn-sm` (cream pill); `gw-link-btn`; its own `gw-switch`. It does not use the kit's `Button`, `Tag` or `NeedsYouRow`. | The prototype's order and wording, drawn with old sizes and old buttons. This is the "mess" you saw. |
| `org/EveryoneHere`, `InvitePeople`, `WaitingToBeLetIn`, `WhoCanOpenACheckIn`, `WhoCanJoin`, `TheInviteLink` | The same `gw-people-*` family, old `gw-btn`, and `gw-who-can-join-*`. | Same verdict as the People page. |
| `org/OnePersonPage` (27 September) | `gw-people-*` and `gw-one-*`, `gw-link-btn`, `gw-btn-sm`. | The prototype's sections with old sizes. Several sections are missing (see part 3). |
| `org/IntegrationsPage` (28 August) | 119 inline styles. | Old product. |
| `org/LeadsGuidePage` (30 August) | Inline styles and `TextAction`. | Old product. |
| `settings/SettingsPage` (9 July) | Old `gw-hdr`, `gw-logo`, `gw-ttl`, `gw-bd`, and the old `Sec` and `Card`; 63 inline styles, mostly 12 and 13 pixels. | Old product. The prototype's own-settings screen was not built. |
| `connections/ConnectionsPage`, `WhatsAppSetupPage` (27 September) | `Button`, `Tag`, `gw-t-*`, one-page `gw-conn-*`, and the old `gw-input`. | Mostly prototype parts. |
| `company/CompanyPage`, `CompanyContextPage` (27 September) | `Button`, `Tag`, `gw-t-*`, `gw-you-*`. | Built from prototype parts and sizes. Close. |
| `billing/BillingPage` (10 June) | Old `gw-btn-sec` beside `gw-t-h3` and `gw-you-card`; 60 inline styles at 11 to 13 pixels. | Mixed. |
| `billing/PricingPage`, `PaymentPage`, `BillingCallbackPage` | Inline styles and old `gw-btn`. | Old product. |

**A check-in**

| Page | Built from | Verdict |
| --- | --- | --- |
| `grounds/GroundAdminPage` (the check-in as the lead or an admin reads it, 12 June, 3,369 lines) | Old `Sec` and `TextAction`, old `gw-fld`, `gw-label`, `gw-input`, 230 inline styles; the new `TheCheckInHeader`, but with the page's own old tab names passed in. | Old product with new words and a new header on top. Its "Setup" tab is the old numbered folding list, not the prototype's "People and setup". |
| `grounds/GroundParticipantPage` (12 June) | 48 inline styles at 12 and 13 pixels. | Old product. |
| `grounds/GroundPage` | Chooses between the two pages above. | Not a screen. |
| `grounds/GroundsListPage` (the check-ins list, 29 May, rebuilt) | `Button`, `Tag`, `gw-t-*`. | Rebuilt from prototype parts. Close. |
| `grounds/CreateGroundPage` (29 May, 1,781 lines) | Old `cg-*`, `gw-btn`, `gw-select`, `gw-label`, `gw-input`. | Old product. |
| `grounds/EndingPage` (27 September) | Inline styles at 12.5 and 22 pixels. | Old way of building, new page. |
| `grounds/ShareSection` | Old `gw-btn-sec` and inline styles. | Old product. |
| `grounds/OutOfTime`, `an-admin-decides-whether-it-starts`, `an-admin-lands-on-a-check-in-list` | `auth-kit`, `Button`, `Tag`. | Prototype parts. |
| `board/BoardPage` (30 July, 2,218 lines) | Old `Sec`, `Card`, `Row`, `Pill`, `btn`, `miniBtn` and `btnGhost`; the new `Button` and `NeedsYouRow`; 239 inline styles. | The old board with new pieces added. Half and half. |
| `board/CheckInLinks` | Old `Card`, `Row`, `Sec`. | Old parts. |
| `boards/TeamBoardsPage` (13 September) | Inline styles at 13 pixels. | Old way of building. |
| `chat/ChatPage` (the check-in conversation, 12 June, 1,615 lines) | Old `gw-back` and 114 inline styles. | Old product with new words. |
| `enter/EntryChatPage` (starting a check-in, 19 June, 4,456 lines) | 271 inline styles, old `gw-msg-*` chat bubbles and `gw-dot`. | Old product. |
| `enter/AskYourTeamOneThing`, `EverySituation`, `FillsInAsYouTalk`, `TheDoor`, `TheSetup` (18 to 27 September) | Inline styles, old `gw-btn`, `gw-btn-sec`, `gw-input`, `gw-ta`. | New pages, built the old way. |
| `report/ReportPage` (29 May, 1,750 lines) | Old `Sec`, 190 inline styles. | Old product. |
| `report/SessionReportPage`, `RoundReportPage` (8 September) | Inline styles at 12 and 13 pixels. | Old way of building. |

**Your own pages and the suites**

| Page | Built from | Verdict |
| --- | --- | --- |
| `today/TodayPage`, `YouAreIn` (27 September) | `Button`, `NeedsYouList`, `NeedsYouRow`, `gw-t-*`, one-page `gw-today-*`. | Built from prototype parts. Close. |
| `you/YouPage` (27 September) | `Button`, `Tag`, `NeedsYouRow`, `gw-t-*`, `gw-you-*`. | Built from prototype parts. Close. |
| `suites/*` (the Suites page and ten suites, 27 September) | `Button`, `Tag`, `Mark`, `gw-t-*`, `gw-you-*`. | Built from prototype parts. Close, but in passing I saw the Suites cards break words letter by letter ("Onbo / ardin / g") when the page was about 800 pixels wide, so the card grid does not narrow properly. |
| `ask/AskPage` | A wrapper around `AskGroundwork`, which uses `gw-b-*`. | Prototype parts. |
| `more/MorePage` | `Button`, `gw-more-*`. | Prototype parts. |

**Other pages**

| Page | Built from | Verdict |
| --- | --- | --- |
| `home/HomePage`, `EntryChat`, `OnboardingChat`, `SaveCard` (June) | Old `gw-hdr`, `gw-logo`, `gw-chat-w`, `gw-send-btn`, `gw-input`, `gw-label`. | Old product. |
| `notfound/NotFoundPage` | Old `gw-hdr`, `gw-logo`, `gw-btn`, `gw-bd`. | Old product. |
| `talk/TalkToUsPage` | Inline styles. | Old product. |
| `prompts/*`, `admin/*`, `preview/*`, `ops/*` (staff and developer pages) | Inline styles and old classes. | Old product. The staff console (F5) has not been started. |

### The main shared pieces in `components/gw`

| Piece | Built from | Verdict |
| --- | --- | --- |
| `kit.tsx` | Two halves. The top half (`Zone`, `Sec`, `Card`, `Row`, `Pill`, `Stat`, `td`, `btn`, `miniBtn`, `btnGhost`) is the old board's parts. The bottom half (`Button`, `Tag`, `NeedsYouRow`, `Mark`, `MarkKey`, `StageLadder`) is copied from the prototype. `TextAction` is from the old sign-in page. | Half old, half prototype, in one file with no sign of which is which. `Sec` has been patched with a `size="board"` switch so the board alone gets the prototype's heading size. |
| `AppShell.tsx` (the sidebar) | Copied from the prototype in U.1 (`gw-rl-*`). | Prototype. It matches. |
| `TheCheckInHeader.tsx` (28 September) | Inline styles: 12.5-pixel crumb, Literata 30-pixel title at weight 600, 13.5-pixel tabs 32 pixels tall, 13-pixel "Your check-in" button 36 pixels tall. | A new piece built the old way. It also has a bug: every tab is underlined (see part 3). |
| `Arrival.tsx` | Old `gw-hdr`, `gw-ttl`, `gw-sub-t`, `gw-bd`, and a newer "plain" frame for the invitation. | Mixed. |
| `JumpTo.tsx`, `OrganisationChoices.tsx` | Prototype (`gw-jump-*`, `gw-rl-*`). | Prototype. |
| `AskGroundwork.tsx`, `HelpModal.tsx` | `gw-b-*` buttons with inline styles around them (66 in `HelpModal`). | Mostly prototype buttons in old-style layouts. |
| The report and record pieces (`TheSessionsReport`, `TheJudgement`, `WhatTheRecordShows`, `ContextPage`, `ExpectationsPanel`, `GroundChat`, `ResolutionPanel`, `SharedReportForAParty` and about forty more) | Inline styles, mostly 12 to 13 pixels. None uses the kit's `Tag` or `Button` except `TheReportIsAListOfSessions` (`Tag`) and two that use the old `Sec` or `Pill`. | Old way of building. These are where the reports and the board get their look. |
| `PeoplePicker.tsx` | Inline styles. | Old way of building. |
| `a-long-list-is-not-a-page.tsx` (`ShowAFew`) and similar helpers | Behaviour, very little look. | Fine to keep. |

**Overall verdict for question 1.** Yes. Apart from the sign-in pages, Today, You, Company, the suites, the sidebar and the check-ins list, the screens are the old product's parts with new words. The People pages are a special case: their words and order come from the prototype, but their parts were written fresh for those pages at the old product's sizes, instead of using the prototype parts the product already has.

---

## 2. The prototype's design principles, with what the product does now

### A warning about the prototype's source

`docs/prototype/source/app.css` is written in layers. The first lines set one set of colours (a cool grey-blue ink, `#1B2530`, and a blue `#244E8C`), and later sections set them again, three times ("the kit's colour scheme", "cream, like the canvas", and "cream and white, no grey"). The last value is the one that shows on screen. I checked every value below against the rendered prototype, measured in the browser at 1440 pixels. Anyone reading only the top of `app.css` will copy the wrong colours.

### Page width and grid

| | Prototype | Product now |
| --- | --- | --- |
| Sidebar | 256 pixels, cream, a 1-pixel line on its right (`.shell`, `.rl`). Folds to 64 pixels. Hidden under 860 pixels, replaced by a bottom bar. | The same, copied in U.1 (`gw-rl-*`, 256 pixels). |
| Page padding | `main` has 32 pixels at the top, 48 at the sides and 72 at the bottom. On a phone, 20, 18 and 100. | `main.gw-main-content` has no padding. Each page adds its own (for example 28 and 20 pixels on People, 40 and 32 on Today and You). |
| Content width | One frame, `.wrap`, up to 1150 pixels wide, **left-aligned** under the page padding. At 1440 pixels the content runs from 304 to 1392 pixels. | Each page picks its own width and **centres** it. People is 860 pixels wide (content from 438 to 1258). One person is the same. The check-in page is 1060 pixels, and its setup tab is a 568-pixel column inside that. Today and You are 1140. Other pages use 560, 620, 680, 720, 900 or 1040. |
| Columns | `.g2` two equal columns with 20 pixels between; `.g3` three with 16; `.g4` four with 14; `.side` a main column and a 340-pixel side column with 44 pixels between. All fall to one column on a phone. | No shared grid. Each page writes its own `grid-template-columns`. |
| Space between sections | 30 pixels on the People pages (`.stack` with `gap:30px`); inside a section, 14 pixels between the heading and what follows (`.sec`). | 28 pixels (`gw-people-sec`), 24 (`gw-you-section`), 32 (`gw-today-section`), 16 or 28 (`Sec`). |

### Type

Two typefaces in both: Atkinson Hyperlegible for everything you read and press, and Literata for page titles, names and quotes. The product serves both, as the prototype does.

| Style | Prototype | Product now |
| --- | --- | --- |
| Body | 16 pixels, line height 1.5, weight 400. | `body` is 16 pixels, but most text sets its own size: 13 pixels in the old classes, and 11 to 13 pixels in most inline styles. |
| Greeting (`t-greet`) | Literata, 30 to 38 pixels (grows with the screen), line height 1.12, weight 500, letter spacing -0.01em. | `gw-t-greet` is the same but fixed at 38 pixels (30 on a phone). |
| Page title (`t-title`) | Literata, 24 to 30 pixels, line height 1.18, weight 500. Used for "People", "Miriam Wanjiku", "Sales team, Q3". | `gw-t-title` matches. But People uses `gw-people-h1`: Atkinson 26 pixels, weight 700, **navy**. The check-in header uses Literata 30 at weight 600. |
| Section heading (`t-h2`) | 21 pixels, line height 1.25, weight 700, near-black ink. | `gw-t-h2` is 22 pixels. The People pages use 17 pixels, weight 700, **navy**. The old `Sec` is 14 pixels in brown. The old `gw-sec` is 11-pixel capitals. |
| Small heading (`t-h3`) | 18 pixels, line height 1.3, weight 700. | `gw-t-h3` matches. |
| Small (`t-small`) | 14.5 pixels, line height 1.45. Used for notes beside headings, emails, "Open". | `gw-t-small` matches, but People uses 13 pixels for the same things. |
| Tiny (`t-tiny`) | 13 pixels, line height 1.4. Only for table column names and a person's level. | `gw-t-tiny` matches. The old product uses 11 to 12 pixels for ordinary text. |
| Note (`.note`) | 13.5 pixels, muted. | `gw-people-note` is 13 pixels. |
| List row title and line (`.item .h`, `.item .s`) | 17 pixels bold, line height 1.3; then 15 pixels muted. | `gw-need-h` and `gw-need-s` match. The People page's waiting row does not use them. |
| Quote (`.quote`) | Literata 17 pixels, line height 1.5. | No shared style. |
| Labels on forms (`label.f`) | 14.5 pixels, weight 700, 6 pixels above the field. | `gw-auth-label` matches. The old `gw-label` is 12 pixels, weight 400, brown. |

### Colours

These are the prototype's final values, as they show on screen, and where each is used. The product's names are in the last column. The two sets are the same, except where noted.

| Prototype token | Value | Where the prototype uses it | Product token |
| --- | --- | --- | --- |
| `--paper` | `#FDFBF6` | The page and the sidebar. | `--gw-page` and `--gw-paper`, the same. |
| `--surface` | `#FFFFFF` | Panels, fields, secondary buttons, chips. | `--gw-card`, the same. |
| `--band` | `#FAF5EA` | A band above the page. | `--gw-paper-2`, and also `--gw-slate`, the same. |
| `--chat` | `#F7F1E5` | The other person's chat bubble, a plain tag, the track of a bar. | `--gw-bg`, the same. |
| `--rule` | `#EDE5D6` | Every hairline: panel borders, lines between rows, under the tabs. | `--gw-border` and `--gw-line`, the same. |
| `--rule2` | `#DFD3BE` | The stronger line: fields, secondary buttons, chips, an empty mark, a toggle that is off. | `--gw-rule-2`, the same. But the People pages draw their fields and chips with the lighter `--gw-border`, so they look fainter. |
| `--ink` | `#1A1916` | All text and all headings. | `--gw-text` and `--gw-ink`, the same. |
| `--muted` | `#4E4236` | Secondary text: notes, emails, column names, tabs that are not chosen. | `--gw-sub`, the same. |
| `--faint` | `#85705A` | Very quiet text. | Not the same. The product's `--gw-muted` is `#7D6A55`. Note that the product's word "muted" means the prototype's "faint", and the product's "sub" means the prototype's "muted". This is a trap for anyone copying values. |
| `--navy` and `--act` | `#0C447C` | Primary buttons, the chosen chip or option, the chosen tab's underline, links, quiet buttons, avatar initials, the logo, focus rings. Never a heading. | `--gw-navy` and `--gw-blue-t`, the same. The product also uses navy for headings on the People pages. |
| `--navy-d` | `#042C53` | A primary button when pointed at. | `--gw-navy-d`, the same. |
| `--act-soft` and `--act-b` | `#EEF4FB`, `#B5D4F4` | Avatar circle, "Owner", "Admin" and "Runs it" tags, a chosen row. | `--gw-blue-bg`, `--gw-blue-b`, the same. |
| `--rec`, `--rec-soft`, `--rec-b` | `#085041`, `#E1F5EE`, `#5DCAA5` | Proven, "Checking in", "Your turn", a toggle that is on. | `--gw-green-t`, `--gw-green-bg`, `--gw-green-b`, the same. But the product's toggle is navy when on. |
| `--att`, `--att-soft`, `--att-b` | `#8A5C1A`, `#FDF3E3`, `#E8A94A` | Something to look at: "Waiting for an admin", "Guest", the edge of a waiting row. | `--gw-amber-t`, `--gw-amber-bg`, `--gw-amber-b`, the same. |
| `--con`, `--con-soft`, `--con-b` | `#791F1F`, `#FCEBEB`, `#F09595` | Only real problems: "The email bounced", "No seat on your plan", "End this check-in". | `--gw-red-t`, `--gw-red-bg`, `--gw-red-b`, the same. |
| `--dark` | `#0A1628` | The dark bar. | `--gw-dark`, the same. |
| `--on-ink` | `#FFFFFF` | Text on a navy button. | White, the same. |

Colours the product has and the prototype does not: `--gw-clay` `#9F5447` and `--gw-clay-bg`, `--gw-blue-body` `#4A6A9A`, `--gw-danger` `#C0392B`, `--gw-green-live` `#34D399`, `--gw-green-t-soft` `#37745B`, `--gw-sub-d` `#4A4540`, `--gw-amber-bd`, and four paler border colours. The Tailwind theme at the top of `index.css` still has a slate grey (`--color-secondary` `#f1f5f9`, `--color-secondary-foreground` `#64748b`), and the kit's flat `Pill` is a cool grey `#EEF0F4`. The prototype's rule is "cream and white, no grey", so those greys should go. There are also 82 raw colour codes in the pages and components (36 different ones).

### Spacing

The prototype does not name a spacing scale, but it uses a small set of steps again and again: 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 30 and 44 pixels. The ones that matter most:

- A panel's inside space (`.pad`) is 20 pixels top and bottom, 22 left and right.
- A list row (`.item`) has 16 pixels above and below, and 16 pixels between the coloured edge, the words and the buttons.
- A table row (`.row` in a panel) has 12 pixels above and below and 18 at the sides. Its column header row has 10 and 18.
- A label-and-value row (for example "How often") has 14 pixels above and below.
- Buttons sit 8 or 10 pixels apart.
- Sections are 30 pixels apart, and a heading is 14 pixels above its content.

The product's spacing varies by page. The People page's table rows are 10 by 14 pixels, its panels are 12 by 16 or 16 by 20, and its sections are 28 pixels apart.

### Corners (radii)

| Prototype | Used for | Product now |
| --- | --- | --- |
| 8 pixels | Buttons, chips in a row of choices (`.seg`), sidebar items, the check-in row in the sidebar. | `gw-b-*` 8. The old `gw-btn` 6, the kit's `btn` 7, `gw-people` chips 6. |
| 10 pixels | Fields, the toast, a dashed note box. | `gw-auth-input` 8, `gw-input` 6, `gw-people` fields 7. |
| 12 pixels | Panels, menus. | Kit `Card` 12, `gw-you-card` 12, `gw-people-table` 10, old `gw-card` 6. |
| 13 pixels | Tags (half their 26-pixel height, so they are round-ended). | `gw-tag` 13. `gw-people-tag` 6, kit `Pill` 11, old `gw-pill` 20. |
| 14 pixels | A pop-up window. | Varies. |
| 16 pixels | The check-in card and chat bubbles. | Old chat bubbles 8. |
| 20 pixels | A single chip (`.chip`). | Old `gw-btn-sm` 20. |
| Round | Avatars, marks. | The same. |

In inline styles the product uses corners of 8, 7, 10, 6, 12, 4, 20, 14, 5, 9, 3 and 999 pixels.

### Lines (borders)

- A panel or a list has a **1-pixel line** in `--rule` `#EDE5D6`.
- A field has a **1.5-pixel line** in `--rule2` `#DFD3BE` (it shows as 1 pixel on an ordinary screen).
- A secondary button or a chip has **no border** but a 1.5-pixel line drawn inside it (`box-shadow: inset 0 0 0 1.5px var(--rule2)`), so it does not grow when chosen.
- A coloured tag has a 1-pixel line inside it in its own colour's border shade.
- A chosen tab has a **3-pixel underline** in navy; other tabs have a 3-pixel line that cannot be seen.

The product's old parts use 1 pixel of `--gw-border` for everything, fields included. The kit's `Button` and `Tag` match the prototype. The check-in header's tabs use 2 pixels, not 3.

### Shadows

- Panels have **no shadow** in the prototype.
- Menus that open over the page: `0 14px 40px rgba(26,25,22,.14)`.
- The toast: `0 10px 30px rgba(0,0,0,.2)`.
- The Ask Groundwork panel: `-12px 0 40px rgba(26,25,22,.10)`.
- Focus: a 3-pixel navy outline, 2 pixels outside the thing.

The product's kit `Card` and `Stat` add `0 1px 2px rgba(20,24,40,.05)`, which the prototype does not have. Its menus match. Its fields use a soft ring (`0 0 0 3px rgba(12,68,124,.12)`) for focus instead of the outline.

### Each kind of component

| Component | Prototype (exact values) | Product now |
| --- | --- | --- |
| **Person row** (in a table) | A grid row inside a white panel: avatar column 44 pixels, then name, then the other columns. 12 pixels above and below, 18 at the sides, a 1-pixel `--rule` line on top. Avatar 34 pixels. Name 16 pixels bold. Under the name, a level line at 13 pixels muted ("Sales rep, reports to Wairimu Kamau") and the email at 14.5 pixels muted. On a phone, each row becomes a small stack. | On People, `gw-people-tr`: 10 by 14 pixels, 13-pixel text, 30-pixel avatar with 11.5-pixel initials, name 13 pixels, email 11.5 pixels. The old `gw-prow` (a row drawn as its own bordered card with 7 pixels between) is still used elsewhere. |
| **List row with a coloured edge** (`.item`) | Grid of a 4-pixel edge, the words, and the buttons; 16 pixels between; 16 pixels above and below; a line under each row and above the first. Edge colour says why it is there (amber to look at, red a problem, green ready, navy a decision). Title 17 pixels bold, line 15 pixels muted. Buttons on the right, on one line. | `NeedsYouRow` matches exactly. But People's "Waiting to be let in" and the "no seat" warning are drawn as bordered cards with a full-width button, not as this row. |
| **Panel** (card) | White, 1-pixel `--rule` line, 12-pixel corners, 20 by 22 pixels inside, no shadow. | Kit `Card`: white, 12-pixel corners, a small shadow, 6 by 16 or 14 by 16 inside. `gw-you-card`: 18 by 20. Old `gw-card`: 6-pixel corners. |
| **Section** | `section.sec`: a heading row with the 21-pixel heading on the left and a 14.5-pixel muted note on the right, lined up on the text's base; then the content 14 pixels below; then an optional 13.5-pixel note. | Four different versions: kit `Sec` (14 pixels brown, or 22 on the board only), `gw-people-sec` (17 pixels navy), `gw-you-section-head` (uses `gw-t-h2`), `gw-today-section-head`. |
| **Tag** (a short fact) | 26 pixels tall, 10 pixels at the sides, round ends (13 pixels), 13.5 pixels bold, no wrapping. Tones: green, amber, blue, red, each with its soft fill, its dark text and a 1-pixel inside line in its border shade; "plain" is `--chat` fill and ink text with no line. | Kit `Tag` matches exactly. People uses its own `gw-people-tag` (21 pixels tall, 11.5 pixels, 6-pixel corners, no line). The kit `Pill` (10.5 pixels) is used on the board. |
| **Primary button** | Navy fill, white text, 16 pixels bold, at least 44 pixels tall, 18 pixels at the sides, 8-pixel corners, only as wide as its words. One per screen or per row. | Kit `Button kind="primary"` matches. Old `gw-btn`: 13 pixels, full width of its box, about 40 pixels tall, 6-pixel corners (used on People for "Let them in", "Invite a colleague", "Send their invitations"). Kit `btn`: 13 pixels, 7-pixel corners. |
| **Secondary button** | White fill, ink text, 16 pixels bold, 44 pixels tall, a 1.5-pixel `--rule2` line inside, 8-pixel corners. | Kit `Button kind="secondary"` matches. Old `gw-btn-sec` is 13 pixels, weight 400, full width. Old `gw-btn-sm` is a 30-pixel cream pill with 12-pixel text (used for "Send the guide", "See the plans", "Save"). |
| **Quiet button** | No fill, navy text, 16 pixels bold, 44 pixels tall, 8 pixels at the sides. Used for "Change", "Don't let him in", "Upload a list". | Kit `Button kind="quiet"` matches. People uses `gw-link-btn`: 13 pixels bold, 28 pixels tall. |
| **Small button** | 36 pixels tall (40 on a phone), 14.5 pixels, 12 pixels at the sides. Used for "Copy" and "Change" in a panel. | Kit `Button size="small"` matches. |
| **Big button** | 54 pixels tall, 17 pixels, 22 pixels at the sides. Used for "Answer today's check-in now". | Kit `Button size="big"` matches. The invitation uses the old `gw-btn` instead. |
| **Danger button** | Red fill, white text; or a secondary button with red text and a red line, as "End this check-in". | Not in the kit. |
| **Choices in a row** (`.seg`) | Buttons 40 pixels tall, 14 pixels at the sides, 15 pixels, 8-pixel corners, a 1.5-pixel `--rule2` line inside; the chosen one is navy with white bold text. Used for the People filters and "Who can open a check-in". | People's filters are 31 pixels tall, 12.5 pixels, 6-pixel corners, and the chosen one is not bold. |
| **Choice cards** (a role) | White panel rows with a 16-pixel bold title and a 15-pixel line. The chosen one keeps a white fill and gets a 2-pixel ink outline. | The chosen role on one person's page is a solid navy card with white text, and the text is 13 pixels. |
| **Chip** (`.chip`) | 40 pixels tall, 14 pixels at the sides, 20-pixel corners, 15 pixels, a 1.5-pixel line inside; chosen is navy. | No shared chip. |
| **Toggle** | 48 by 28 pixels, 14-pixel corners, a 22-pixel white knob, 3 pixels inside; **green** (`--rec`) when on, `--rule2` when off. | `gw-switch`: 46 by 26, a 20-pixel knob, **navy** when on. |
| **Table** | A white panel (1-pixel line, 12-pixel corners) with rows as above. Column names 13 pixels muted, 10 by 18 pixels. It scrolls sideways on a narrow screen, and on a phone each row becomes a stack. | `gw-people-table` with 12-pixel column names. The old `td` style object is 12 pixels with 9 by 12 inside. |
| **Label and value rows** (for example "Level" and "Sales rep", or "How often") | A row with the label in 16-pixel bold ink in a fixed column (about 200 to 260 pixels), the value in 16 pixels, and a quiet "Change" button on the right; a 1-pixel line between rows; 14 pixels above and below (about 60 to 77 pixels tall in the pictures). | `gw-one-field`: label 13.5 pixels, regular, brown, in a 120-pixel column; value 13.5 pixels; "Change" 13 pixels, 28 tall; 8 pixels above and below. |
| **Tabs** | 46 pixels tall, 14 pixels at the sides, 16 pixels, muted; the chosen tab is ink, bold, with a 3-pixel navy underline; a 1-pixel `--rule` line under the whole row; 18 pixels below the page title. | `TheCheckInHeader`: 32 pixels tall, 13.5 pixels, 20 pixels between tabs, and every tab is underlined. The old `gw-tab` is 12 pixels. |
| **Page header** (a check-in) | Crumb "Check-ins / Sales team, Q3" at 14 pixels with the first part a navy link; the title in Literata 30 pixels weight 500; one 16-pixel muted line under it ("Daily on weekdays, from 4pm. Session 38 of 65. Runs until 30 September."); the tabs. | 12.5-pixel crumb, Literata 30 at weight 600, a 13.5-pixel line, a 36-pixel navy "Your check-in" button and an "Ask" link on the right, and a second status sentence under the tabs. |
| **Page header** (a settings page) | A 14.5-pixel muted line with the organisation's name, then the page title in Literata 30, then the sections 22 pixels below. One person's page keeps the title "People" and adds a crumb "People / Miriam Wanjiku" and the person's own Literata name with a 56-pixel avatar. | People: 13-pixel crumb, 26-pixel navy Atkinson title. One person: no page title, a 13-pixel crumb, the name in 26-pixel navy Atkinson with a 48-pixel avatar. |
| **Form field** | 48 pixels tall, 16 pixels at the sides, 16-pixel text, 10-pixel corners, a 1.5-pixel `--rule2` line, white. A text box is 96 pixels or more tall with 12 by 16 inside. A label is 14.5 pixels bold, 6 pixels above. | `gw-auth-input` and `gw-auth-label` match. `gw-input` is 13 pixels with 10 by 12 inside and 6-pixel corners. People's fields are 36 pixels tall, 13 pixels, 7-pixel corners, and use the lighter `--gw-border` line. |
| **Avatar** | A circle, 34 pixels, `--act-soft` fill, navy initials 13.5 pixels bold. For a larger one, the initials are the size divided by 2.8 (56 pixels gives 20-pixel initials). | `gw-people-av` 30 pixels with 11.5-pixel initials; the big one 48 pixels with 16. The old `gw-av` is 32 pixels with 11-pixel initials and six colours, including a green (`#F0FDF4`, `#166534`) that is not in the palette. |
| **Empty state** | Says it in a sentence where the thing would be: "None" in a table cell, a muted 14.5-pixel line, or for a door you cannot open, a panel up to 640 pixels wide with a 21-pixel heading, one sentence and at most one button ("Only an admin at Baridi can change this. Grace Achieng is your admin."). | Each page writes its own. Some use `gw-people-note` (13 pixels), some inline styles. |
| **Toast** | Ink fill, white text, 15 pixels, 12 by 18 inside, 10-pixel corners, centred at the bottom, 90 pixels up. | The `sonner` library's default toast, which looks different. |
| **Pop-up window** | Up to 520 pixels wide, 24 pixels inside, 14-pixel corners, 14 pixels between its parts, behind it `rgba(14,19,24,.45)`. | Each pop-up is drawn by hand. |
| **Mark and stage ladder** | Ring for "said", filled green for "proven", green with a ring for "confirmed", dashed for "from memory", faint ring for none; 14 pixels, 18 for large; a 2-pixel line between stages. | Kit `Mark` and `StageLadder` match. |
| **Help strip under a row** | Inside a person row, a soft amber or soft red box across the row, with one sentence and one secondary button on the right ("Peter is from outside Baridi, so Grace Achieng, your admin, has to let him in. We asked her yesterday." / "Remind Grace"). | Not built. |

---

## 3. The people screens and the invitation, side by side

All pictures are 1440 pixels wide, full page, in the scratchpad folder
`/private/tmp/claude-501/-Users-hafsahjumare-Documents-GitHub-groundwork/33e0d4e4-58d2-4cdc-a45b-55a68b59b9b8/scratchpad/pictures/`.
Each tall picture is also cut into readable strips beside it (`-01.png`, `-02.png` and so on).

| Screen | Prototype | Product |
| --- | --- | --- |
| People, as the admin | `da-proto-people.png` (Grace, `#/settings/people`) | `da-product-people.png` (Juma, `/org/members`) |
| One person, as the admin | `da-proto-one-person.png` (Grace, `#/settings/people/miriam`) | `da-product-one-person.png` (Juma, `/org/members/<Amani Wekesa>`) |
| The check-in's people and setup, as the lead | `da-proto-checkin-people.png` (Wairimu, `#/c/sales/people`) | `da-product-checkin-people.png` (Rukia, `/grounds/9028f0ad-…?tab=settings`) |
| The invitation | `da-proto-join-invite.png` (`#/join/invite`) | `da-product-join-invite.png` (someone held for a seat) and `da-product-join-invite-neema.png` (someone who already joined) |

The measured values behind the numbers below are in `m-proto-*.json` and `m-prod-*.json` in the same folder.

The data is different in the two (Baridi has 27 people and teams; Kilima Traders U8 has 6 people and no teams), so I have not counted differences that come only from the data.

### People (the admin's list)

1. **The page is in a different place.** The prototype's content starts 48 pixels right of the sidebar (at 304 pixels) and is 1088 pixels wide. The product's is a centred 820-pixel column starting at 438 pixels, so there are 182 pixels of empty cream on the left and the table is 268 pixels narrower.
2. **The title.** The prototype has "Baridi Appliances" in 14.5-pixel muted text, then "People" in Literata, 30 pixels, weight 500, ink. The product has the organisation's name at 13 pixels, then "People" in Atkinson, 26 pixels, bold, navy.
3. **Every section heading is navy and small.** The prototype's headings ("Waiting to be let in", "Everyone at Baridi", "Invite people", "Who can join", "Who can open a check-in", "Help your team get started") are 21 pixels, bold, ink. The product's are 17 pixels, bold, navy. In "Who can join" the product puts the heading inside the white card instead of above it.
4. **An extra warning card at the top.** The product opens with a large amber box, "Somebody is on a check-in with no seat for them", with a full-width navy "Send their invitations" button and a "See the plans" link. `people.txt` does not show it, and the page's own comment says it was kept on purpose. The prototype's source has this same case drawn as a list row with a red edge and two buttons on the right ("Free a seat", "Move to a larger plan"). If it stays, it should be drawn that way.
5. **"Waiting to be let in" is a card, not a row.** The prototype draws Peter as a list row: a 4-pixel amber edge, his name and email at 17 pixels bold, one 15-pixel sentence under it, and on the right a quiet "Don't let him in" and a 112-pixel primary "Let him in", both 44 pixels tall. The product draws Faraji in a white card with an amber edge, a 13-pixel name, the quiet button floating above on the right, and a navy "Let them in" button 789 pixels wide and 40 tall across the whole card.
6. **"Who reports to whom".** The prototype's folded panel is 66 pixels tall with 20 by 22 pixels inside and 12-pixel corners. The product's is 46 pixels tall with 12 by 16 inside, 10-pixel corners and smaller text.
7. **The search and the filters are small.** The prototype's "Find somebody" field is 240 by 48 pixels, 16-pixel text, 10-pixel corners, with the stronger `#DFD3BE` line. The product's is 148 by 36, 13 pixels, 7-pixel corners, with the fainter `#EDE5D6` line. The prototype's filter buttons are 40 pixels tall, 15 pixels, 8-pixel corners, and "Everyone" is bold; the product's are 31 pixels tall, 12.5 pixels, 6-pixel corners, and "Everyone" is not bold. In the product the word "Team" is larger than the 13-pixel field and menu beside it, so the row looks uneven.
8. **The table is small and cramped.** In the prototype each person has a 34-pixel avatar, a 16-pixel bold name, a 13-pixel line with their level and who they report to, and a 14.5-pixel email. In the product the avatar is 30 pixels with 11.5-pixel initials, the name is 13 pixels and the email is 11.5 pixels. The product's check-ins column is so narrow that Rukia's five check-ins wrap onto seven lines. The prototype's "Open" is 14.5-pixel regular navy text; the product's is a 13-pixel bold button.
9. **The tags are a different shape and colour.** The prototype's tags are 26 pixels tall, 13.5 pixels bold, fully round at the ends, and the coloured ones have a thin line of their own colour. "Owner" and "Admin" are blue, "Guest" is amber, the others are plain. The product's tags are 21 pixels tall, 11.5 pixels, with 6-pixel corners and no line, and "Owner" and "Admin" are plain cream.
10. **"Invite a colleague" is a bar.** The prototype's is a normal primary button, 174 by 44, on the right. The product's is 820 pixels wide and 40 tall, across the whole page.
11. **"Invite people" is laid out differently.** The prototype puts the role choice, "Send their invitations" (200 by 44) and "Upload a list" on one line under the text box, and the text box is 16 pixels with two example lines already in it. The product has a 13.5-pixel box with grey placeholder text, the role on its own line, a full-width "Send their invitations" (782 pixels, pale because it is disabled), and "Upload a list" on a line of its own.
12. **Words that differ.** The prototype says "One per line: a name and an email, or a WhatsApp number. Or paste a list from a spreadsheet." and "They’ll get an email or a WhatsApp message with a link to set themselves up." The product says "One per line: a name and an email. Or paste a list from a spreadsheet." and "They’ll get an email with a link to set themselves up." The prototype also offers "Guest" as a role here; the product does not (the morning report says it waits for other modules).
13. **"Who can join".** The prototype shows the invite link itself ("myground.work/j/baridi") with a small "Copy" button. The product shows a second toggle, "The invite link for Kilima Traders U8", with "The link is off." There is no link or Copy button until it is turned on.
14. **Toggles are navy, not green.** The prototype's toggle is green when on and 48 by 28 pixels. The product's is navy and 46 by 26.
15. **Mixed sizes in one row.** In "Check-ins wait for an admin", the product's heading is 13 pixels and the sentence under it is 16 pixels, so the sentence is bigger than its heading.
16. **"Help your team get started".** The prototype's "Send the guide" and "See the plans" are full-width secondary buttons, 44 pixels tall, 16 pixels bold. The product's are small cream pills, 30 pixels tall, 12 pixels, from the old product.
17. **The line with a person's level.** The test organisation has no levels or teams set, so the product shows no line under the names. The code (`EveryoneHere.tsx`, `whereTheySitLine`) does draw one when a level is set, but at 11.5 pixels, the same small size as the email, where the prototype uses 13 pixels for the level and 14.5 for the email.

### One person (the admin's view)

1. **No page title.** The prototype keeps "Baridi Appliances" and the title "People" at the top, then the crumb "People / Miriam Wanjiku" with "People" as an underlined link. The product has only the crumb, at 13 pixels, and "People" is not underlined.
2. **The name.** The prototype shows a 56-pixel avatar with 20-pixel initials, the name in Literata 30 pixels weight 500 ink, and the email at 16 pixels. The product shows a 48-pixel avatar, the name in Atkinson 26 pixels bold navy, and the email at 13 pixels.
3. **Section headings** are 21 pixels ink in the prototype and 17 pixels navy in the product.
4. **Label and value rows are much smaller.** In the prototype, "Level", "Reports to", "Now", "Seat" and "WhatsApp" are 16-pixel bold ink labels with 16-pixel values, rows about 60 pixels tall, and "Change" is a 36-pixel quiet button. In the product the labels are 13.5 pixels regular brown in a 120-pixel column, the values 13.5 pixels, rows about 44 pixels tall, and "Change" is 28 pixels tall.
5. **"Across check-ins"** is a white panel with a bold heading in the prototype. In the product it is a navy heading and a plain line. The prototype's sentence ends "they choose who else sees it."; the product's stops at "on their own You page."
6. **The role choice.** In the prototype the four roles are white cards with 16-pixel bold titles, and the chosen one keeps its white fill with a 2-pixel ink outline. In the product the text is 13 pixels and the chosen one is a solid navy card with white text. The prototype shows four roles ("Guest" too); the product shows three. The note beside the heading is "Changes apply straight away and are noted with your name" in the prototype and "Changes apply straight away." in the product.
7. **Team.** The prototype has a 260 by 48 field and a 72 by 44 secondary "Save" inside a white panel. The product has a 148 by 36 field and a 51 by 30 cream "Save" pill, with no panel.
8. **Status.** The prototype shows "Checking in" as a green tag. The product shows it as plain text. The prototype has "Free this seat" beside "Holds a seat"; the product has nothing there.
9. **Missing in the product.** "Region" (no field yet), the "WhatsApp" row with its "Change", and the whole "Remove from Baridi" section with its "Remove" button.
10. **"What an admin can see"** is a white panel in the prototype, and its sentence goes on: "…You don’t see anyone’s private notes, and what someone writes in their own check-in stays theirs." The product's is plain text and stops at "private notes."
11. The check-ins list: the prototype's names are 14.5 pixels bold; the product's are regular.

### The check-in's people and setup (the lead's view)

This screen was never rebuilt. The morning report (`docs/morning-report-ui.md`, U.4 item 7) says the check-in's "People and setup" tab was left "waiting for other modules" (B1 and B3), and it was not picked up after them. What shows today is the old "Setup" tab of `GroundAdminPage`, which is a different design.

1. **A different screen.** The prototype is one flat page of sections: "Who’s in it" (a list panel of people), "Roles in this check-in" (a table), "How it runs", "Who sees what", "When someone is blocked", "Ending it" and "Who else can see it", each a heading with label, value and "Change" rows. The product is nine numbered folding cards in a 568-pixel column in the middle of the page ("Who is in it", "You in this check-in", "Who can corroborate whom", "What good looks like", "How long this runs", "What it is", "Who can see whom", "When somebody is blocked", "Ending it"), with "I have read this - sign it off" ticks and "You have not signed off any of the 9 setup questions yet." at the bottom.
2. **The tabs are the old ones.** The prototype's tabs are "Board", "Check-in", "Context", "My work", "People and setup". The product shows "Board", "Check-in", "Report", "Sessions", "What I shared", "Context", "Setup". `TheCheckInHeader` has the right names, but `GroundAdminPage.tsx` (lines 1296 to 1299) passes in its own old list instead.
3. **A bug: every tab is underlined.** In `components/gw/TheCheckInHeader.tsx` (lines 157 and 158) the tab style sets the right underline and then `border: 'none'` wipes it, and `borderBottomWidth: 2, borderBottomStyle: 'solid'` draws a 2-pixel line in the text's own colour under every tab. I measured it: "Board", "Report", "Sessions" and "What I shared" all have a 2-pixel brown underline, and the chosen "Setup" has an ink one instead of navy. The prototype's unchosen tabs have no visible line, and the chosen one has a 3-pixel navy line.
4. **The header is small.** The prototype's tabs are 46 pixels tall and 16 pixels; the product's are 32 pixels and 13.5 pixels. The line under the title is 16 pixels in the prototype and 13.5 in the product ("Every week."). The product adds a 36-pixel "Your check-in" button and an "Ask" link on the right, and a second status sentence under the tabs ("Session 1 of 12. It ends on 13 December 2026. 4 of 6 people have checked in for session 1. It went back to session 1, because somebody new was added. Nothing anybody wrote is lost. How to run one").
5. **"Who’s in it" is missing.** The prototype has "Copy an invite link" and "Add people" beside the heading, a count ("8 people. 6 checking in; 2 need something before they can start."), and one row per person with avatar, name, email, when they joined, a status tag, and a "···" menu. When someone needs help, a soft amber or red strip under their row says why in one sentence and gives one button ("Remind Grace", "Fix the address"). None of this is in the product. Instead the first folding card holds an amber plan warning, an "Add a person to this check-in" form (a people picker, email, "What do you want them to cover? (optional)", "Their department (optional)", "Send invite", "+ Add another"), a link "See who is in it, and where each of them has got to →", "Or share an access code instead", and "Or share a link" with a QR code and the full web address of the check-in's open link printed in grey typewriter letters.
6. **"Roles in this check-in" is missing.** The prototype's table shows who runs it, who checks in, "Their role, as described", and each status, with the note "“Role, as described” is what the check-in uses to shape each person’s questions. Their role at Baridi is set in People."
7. **"How it runs", "Who sees what", "When someone is blocked" and "Who else can see it" are missing** as rows. Some of the same facts are inside folded cards with different names ("How long this runs", "Who can see whom", "When somebody is blocked").
8. **"Ending it".** The prototype has a panel with one sentence and a red-outlined "End this check-in" button. The product has a folded card whose line under the heading reads "archiving is done by hand for now".
9. **The words break the rules.** The product's folded cards have clipped, lower-case lines under their headings, and hyphens joining pieces: "adding somebody sends them an invitation", "Not answered - assumed from the kind of check-in", "stated by the lead, read by everybody", "84 days, weekly", "It asks what they tried", "archiving is done by hand for now", "I have read this - sign it off", and in the form "You are an admin here, so adding somebody is the approval - there is no queue." "Who can corroborate whom" is work jargon. The prototype's words for the same things are full sentences, for example "What they’ve tried, and who could clear it. We raise it with you if it’s still blocked after 2 days."
10. **The page frame.** The prototype runs 1088 pixels wide from the left. The product's header is in a centred 1060-pixel box, and the setup cards are in a 568-pixel column centred inside that, leaving about 230 pixels of empty page on each side.

### The invitation

I could not show a fresh invitation in the product without adding a new person to a check-in, which would have changed the local database and sent an email. The two invitations that are still open on the test check-in show two other states. So I compared the fresh invitation from its code (`pages/invite/InvitePage.tsx`), and pictured the two states that exist.

1. **The fresh invitation (from the code).** The frame is right: the cream page and one 360-pixel column with the small Groundwork mark, as in the prototype. Inside it, the parts are old.
   - The heading ("Wairimu invited you to the sales team’s check-in") uses `gw-ttl`: Atkinson 20 pixels bold. The prototype's is Literata, about 30 pixels, weight 500, on two lines.
   - The line under it ("Baridi Appliances, until 30 September.") uses `gw-sub-t` at 13 pixels. The prototype's is 16 pixels muted.
   - "What it asks" and "Who sees your answers" are 15-pixel headings with 14.5-pixel text in a white box. This part is close to the prototype.
   - The button "Answer today’s check-in now" is the old `gw-btn`, 13 pixels and about 40 pixels tall. The prototype's is a big button, 17 pixels and 54 pixels tall.
   - The product adds a folding panel "What happens to what you write" with four paragraphs at 12.5 pixels, and "First name" and "Last name" fields with a 12-pixel note. The prototype has neither.
   - "Your number" is not shown, because the invitation does not carry the person's share yet, and the two sentences "Nobody else reads your answers." and "Wairimu reads the report, not your words." are held for your decision (the page's own comment says so).
2. **Someone who already joined** (`da-product-join-invite-neema.png`). This is the old product. It has a white header bar with the old "GROUNDWORK" wordmark (a different logo from the rest of the product), a waving-hand emoji, a 16-pixel bold centred title "You've already joined", 13-pixel text, and two buttons with arrows ("Pick up where I left off →", "Sign in to continue →"), with "or" between them.
3. **Someone held for a seat** (`da-product-join-invite.png`). This uses the prototype's sign-in card, but its whole message is the title, in Literata 28 pixels: "This check-in cannot start for you yet, because there is no seat for you on the plan. You will get your invitation as soon as there is one." Two sentences as a heading are hard to read. The prototype's pattern would be a short heading and a sentence under it.

---

## 4. How to fix it

### The idea

Stop restyling the old pages one by one. Build one small set of shared parts from the prototype's own values, then rebuild each screen from those parts only, with no inline styles for size, colour or spacing. A screen is finished when it uses only these parts and its picture matches the prototype's at 1440 pixels and on a phone.

Some of these parts already exist and are right (`Button`, `Tag`, `NeedsYouRow`, `Mark`, `StageLadder`, the `gw-t-*` type classes, the sidebar, the sign-in parts). The work is to add the missing ones, make the page frame one thing, and retire the old ones so they cannot be used again.

### The parts to build (in a new `components/gw/ui/` folder, with one stylesheet)

Every value is the prototype's, as rendered.

1. **`Page`**, the one page frame. Main padding 32 pixels top, 48 sides, 72 bottom (20, 18 and 100 on a phone under 860 pixels). Content up to 1150 pixels wide, left-aligned, not centred. Sections stacked 30 pixels apart. A `narrow` option for the invitation and sign-in pages: one column 360 pixels wide on the cream page, centred, as today's plain arrival frame. The main element gets no padding of its own from any page.
2. **`PageTitle`**. An optional line above (14.5 pixels, `#4E4236`), an optional crumb (14 pixels muted, the links navy and underlined, "/" between with 6 pixels either side), the title in Literata 30 pixels, line height 1.18, weight 500, ink `#1A1916` (24 on a phone), an optional avatar to its left (56 pixels) and an optional 16-pixel muted line under it, and an optional primary button on the right, lined up with the bottom of the title.
3. **`CheckInHeader`**, which replaces `TheCheckInHeader`. The same as `PageTitle` plus `Tabs`, 18 pixels below. The tab names come from one list, never from the page: "Board", "Check-in", "Context", "My work", "People and setup".
4. **`Tabs`**. Each tab 46 pixels tall, 14 pixels at the sides, 16 pixels, `#4E4236`; the chosen tab ink `#1A1916`, bold, with a 3-pixel navy `#0C447C` underline; the others with a 3-pixel transparent underline; a 1-pixel `#EDE5D6` line under the row; the row scrolls sideways on a phone.
5. **`Section`**. A heading row: the heading in 21 pixels, line height 1.25, bold, ink, and an optional note on the right in 14.5 pixels muted, lined up on the text's base, wrapping below on a narrow screen; the content 14 pixels below; an optional 13.5-pixel muted note at the end. Headings are never navy.
6. **`Panel`**. White, 1-pixel `#EDE5D6` line, 12-pixel corners, 20 by 22 pixels inside (or none, for a table or list inside it), no shadow.
7. **`EdgeList` and `EdgeRow`**, the prototype's `.list` and `.item`: `NeedsYouRow` made general. A 4-pixel edge with 2-pixel corners in green `#085041`, amber `#8A5C1A`, navy `#0C447C` or red `#791F1F`, the words, and the buttons on the right, 16 pixels apart, 16 pixels above and below, a 1-pixel line above the first and under each; title 17 pixels bold, line height 1.3; line 15 pixels muted. On a phone the buttons drop under the words. Used for "Waiting to be let in", the no-seat warning, and anything that needs you.
8. **`PeopleTable`, `PersonRow` and `PersonCell`**. A `Panel` with no inside padding. A column-name row in 13-pixel muted text with 10 by 18 pixels inside. Each row 12 by 18 pixels inside, with a 1-pixel line above, the columns set by the table. `PersonCell` is the 34-pixel avatar, the name in 16 pixels bold, then up to two lines: a 13-pixel muted line (level and reporting line) and a 14.5-pixel muted line (email). The whole row can be a link. It scrolls sideways under 900 pixels and becomes a stack on a phone (a 44-pixel avatar column and everything else under the name). A `help` slot under the row draws the soft amber or soft red strip, with one sentence and one secondary button, as in "Who’s in it".
9. **`Avatar`**. A circle, 34 pixels by default, fill `#EEF4FB`, initials navy `#0C447C` bold, at the size divided by 2.8 (13.5 pixels for 34, 20 for 56). One colour only.
10. **`FieldRows` and `FieldRow`**, the label and value rows. The label 16 pixels bold ink in a column 200 pixels wide (260 on the check-in's setup), the value 16 pixels, and an optional quiet `Button` on the right ("Change", "Give it more time", "Free this seat"); 14 pixels above and below; a 1-pixel `#EDE5D6` line between rows. On a phone, the label sits above the value.
11. **`Choices`**, the prototype's `.seg`. Each choice 40 pixels tall, 14 pixels at the sides, 15 pixels, 8-pixel corners, white with a 1.5-pixel `#DFD3BE` line inside; the chosen one navy `#0C447C` with white bold text. A `stacked` option for choices with a line of description (12 by 14 pixels inside, bold title, 14.5-pixel line).
12. **`ChoiceCards`**, for the role on one person's page. White rows in panels, a 16-pixel bold title and a 15-pixel line, 8 pixels between; the chosen one keeps its white fill and gets a 2-pixel ink `#1A1916` outline.
13. **`Toggle`**. 48 by 28 pixels, 14-pixel corners, 3 pixels inside, a 22-pixel white knob; green `#085041` when on, `#DFD3BE` when off; a real switch for screen readers, with its name.
14. **`TextField`, `TextArea`, `Select` and `FieldLabel`**. 48 pixels tall, 16 pixels at the sides, 16-pixel text, 10-pixel corners, a 1.5-pixel `#DFD3BE` line, white; a text box at least 96 pixels tall with 12 by 16 inside; a label 14.5 pixels bold, 6 pixels above; focus is a 3-pixel navy outline 2 pixels outside. This is the sign-in kit's field, made general.
15. **`Button`**, kept as it is, plus a `danger` kind: white with red `#791F1F` text and a 1.5-pixel `#F09595` line inside (for "End this check-in", "Remove"), and a filled red for a pop-up's final "Remove".
16. **`Tag`**, kept as it is (26 pixels, 13.5 pixels bold, round ends, the thin coloured line). Everything that is a short fact uses it: "Owner" and "Admin" and "Runs it" in blue, "Guest" and "Waiting for an admin" in amber, "Checking in" in green, "The email bounced" and "No seat on your plan" in red, the rest plain.
17. **`Note`** (13.5 pixels muted) and **`Empty`** (a 14.5-pixel muted sentence where the thing would be, or for a door you cannot open, a `Panel` up to 640 pixels wide with a 21-pixel heading, one sentence and at most one button).
18. **`Toast`** (ink fill, white 15-pixel text, 12 by 18 pixels inside, 10-pixel corners, at the bottom centre, 90 pixels up) and **`Modal`** (up to 520 pixels wide, 24 pixels inside, 14-pixel corners, 14 pixels between parts, a `rgba(14,19,24,.45)` backdrop). The toast can stay on the `sonner` library if it is styled to these values.

At the same time: remove the greys (`#EEF0F4`, `#f1f5f9`, `#64748b`) and the colours the prototype does not have; rename `--gw-sub` and `--gw-muted` to the prototype's "muted" and "faint" so nobody copies the wrong one; and mark the old parts (`gw-btn`, `gw-btn-sec`, `gw-btn-sm`, `gw-input`, `gw-label`, `gw-ttl`, `gw-sub-t`, `gw-sec`, `gw-pill`, `gw-prow`, `gw-av`, `gw-card`, `gw-tab`, kit `Zone`, `Sec`, `Card`, `Row`, `Pill`, `Stat`, `btn`, `btnGhost`, `miniBtn`) as old, with a test that fails if a rebuilt page uses any of them.

### The order to rebuild the screens

1. **The parts above, and a page that shows them all** (one private page, like the prototype's design-system screen A1, so a picture check can compare each part with the prototype's). About 2 sessions.
2. **People** (`/org/members`), then **one person** (`/org/members/:id`). These are the screens you named, the parts they need are the basic ones, and the backend is already done. About 2 sessions for both, plus 1 for what is missing on one person's page that needs small backend parts (region, WhatsApp, freeing a seat, removing someone, the "Guest" role), if you want those now.
3. **The check-in's "People and setup"** (`?tab=settings`, renamed to `people`). This is a new screen, not a restyle, and the backend has most of what it needs (who is in it, their status and when they joined, delivery status for bounced emails, role as described, cadence, reminders, who sees what, ending). About 3 sessions, plus your decision on the setup sign-off (below).
4. **The invitation and the other joining states** (`/invite`, the already-joined and held-for-a-seat states, `/join`, `/answer`). About 1 session.
5. **The check-in header, used by every check-in page**, with the one tab list. About 1 session, and it fixes the underline bug on every check-in page at once.
6. **The board** (`BoardPage`, 2,218 lines, and the report pieces it shows). About 3 to 4 sessions. The board's text comes from the engine, so only its parts change.
7. **The check-in conversation** (`ChatPage`) and **starting a check-in** (`EntryChatPage` and `enter/*`). About 3 to 4 sessions.
8. **Context** (`ContextPage` and its panels). About 2 sessions.
9. **The reports** (`ReportPage`, `SessionReportPage`, `RoundReportPage` and the pieces in `components/gw`). About 3 sessions.
10. **A party's own view** (`GroundParticipantPage`) and **My work**. About 2 sessions.
11. **Settings, billing, integrations, the leads' guide, talk to us, the error pages.** About 3 sessions.
12. **Check the pages already built from prototype parts** (Today, You, Company, the suites, Connections, the check-ins list) against the new `Page` and `Section`, and fix the suites' card grid on narrow screens. About 1 to 2 sessions.

In total about 25 to 30 working sessions of a builder, each followed by a picture check. The first four steps, which cover everything you pointed at, are about 8 to 9 sessions.

### Risks

- **Tests that read the old markup.** 290 test files read source files as text. 73 of them read `GroundAdminPage.tsx`, 14 read `InvitePage.tsx`, 10 read the People pages, 6 read `kit.tsx`, and 20 read `index.css` (for example `the-two-typefaces`, `the-page-is-cream-and-opens-light`, `a-colour-does-one-job`, `every-colour-a-person-reads-is-legible`, `one-look-not-five`). When a page is rebuilt, many will fail because the file or the class they look for has moved, not because anything is wrong. Each one has to be moved to the new file and checked, never deleted, and the reason written in the commit and the morning report, as `CLAUDE.md` says. Three tests pin the old folding setup: `setup-asks-one-question-at-a-time.spec.ts`, `the-setup-flow-asks-one-thing-at-a-time.spec.ts` and `setup-can-be-signed-off.spec.ts`.
- **A decision for you: the setup sign-off.** The product lets the lead tick each setup question as read ("I have read this - sign it off"). The prototype has no such thing. Rebuilding the setup as the prototype draws it drops it. That is a product decision, so it waits for you, and step 3 can be built with or without it.
- **Privacy gates that must be kept.**
  - People and one person are for admins only, and that is enforced on the server as well as by `AdminsOnly` on the route. The rebuild must not move any fetch outside that.
  - Each person's load across check-ins is private. One person's page shows only a count and points to their own You page; keep it that way.
  - A lead's private notes, questions to Ask Groundwork and each person's own report never appear on these pages.
  - Leads never see how a person's answers were rated, and no tag on a person may say "at risk", "PIP" or similar. The new `Tag` is for facts about a thing, never a label on a person.
  - The invitation's two sentences about who reads the words are held for your decision, and must stay held.
  - A party sees "People and setup" too (the prototype shows it on a party's board), so the rebuilt tab needs a read-only version for a party, with nothing they are not allowed to change, and it must be refused on the server, not only hidden.
  - The check-in's open link is shown today in full on the setup page. The prototype shows a "Copy an invite link" button instead. The rebuild should not print it.
- **Engine data some parts need.** The screens workspace must not change the engine. "Their role, as described" is what the engine uses to shape each person's questions, so the table can show it and let the lead change it through the existing route, but must not change how the engine reads it. "When someone is blocked" (the 2-day rule) and the session line ("Session 38 of 65") come from the engine. The board and the reports get all their text from the engine, so their rebuild changes only their parts, and any wording change there goes to `docs/requests-to-engine.md`.
- **Small backend parts that do not exist yet.** Region, the "Guest" role when inviting, inviting by WhatsApp number, "Remind Grace", "Fix the address" for a bounced email, and "Give someone access" to a check-in. Each is a small new backend part the screens workspace can build, but each should be listed first so the rebuilt screen does not show a button that does nothing.
- **Old pages that other pages lean on.** `GroundAdminPage` holds many tabs in one 3,369-line file. Rebuilding one tab at a time, each in its own file, is safer than rewriting the file at once.

---

The measurements and pictures were taken on this Mac only, with the local servers, which were stopped afterwards. Nothing was pushed or merged.
