# The shared parts, against the prototype's own stylesheet

For Hafsah's task of 30 September: "Fix the parts first, because every screen is built from them." Every value below is read from `docs/prototype/source/app.css`, resolving each `var(--x)` in its `:root` to the value that actually wins the cascade (the file sets `--ink`, `--paper`, `--rule`, `--rule2`, `--muted`, `--faint`, `--chat`, `--dev` and the button/tag colours more than once - the LAST rule in the file, not the first, is what renders; the useful colours today are the ones set from line 184 onward, "the kit's colour scheme across the whole product", further narrowed by "cream, like the canvas" and "cream and white, no grey" near the end), and compared against `client/src/components/gw/ui/gw-ui.css` and each part's own `.tsx`.

Where a part has no rule of its own in the prototype's CSS (because the prototype draws it with inline styles in its own JS, or it is one of this product's own inventions), that is said plainly and the value is based on the nearest thing the prototype does have.

**Finding.** After this pass, the parts already match the prototype's values almost everywhere - this file was built, several sessions ago, by copying `app.css`'s own numbers class by class, and the guard test (`the-parts-match-the-prototypes-exact-values.spec.tsx`) has been checking key ones against it ever since. The one real mismatch found was in the **Button**'s `danger` kind, fixed as part of this same task (see the table's last row and the separate button report below): a secondary-styled *outline* red, plus a second "filled" variant behind a `dangerSolid` flag, standing in for the prototype's one, plain, solid-red `.btn.danger`.

## The prototype's resolved values, used throughout this table

| Token | Resolved value | Where (app.css) |
| --- | --- | --- |
| `--ink` (text) | `#1A1916` | line 185, unchanged after |
| `--paper` (page) | `#FDFBF6` | line 208 |
| `--surface` / a panel's white | `#FFFFFF` | line 185 |
| `--rule` (hairline) | `#EDE5D6` | line 224 |
| `--rule2` (a field/chip's own outline) | `#DFD3BE` | line 224 |
| `--muted` | `#4E4236` | line 224 |
| `--faint` | `#85705A` | line 224 |
| `--act` / navy | `#0C447C` | line 186/190 |
| `--rec` (green) | `#085041` | line 186 |
| `--att` (amber) | `#8A5C1A` | line 186 |
| `--con` (red) | `#791F1F` | line 186 |
| `--chat` (bubble/callout ground) | `#F7F1E5` | line 224 |
| `--ui` font | `'Atkinson Hyperlegible', system-ui, -apple-system, 'Segoe UI', sans-serif` | line 2 |
| `--name` font | `'Literata', Georgia, 'Times New Roman', serif` | line 2 |

## Part-by-part comparison

| Part | Property | Prototype's value | Ours before | Ours after |
| --- | --- | --- | --- | --- |
| **Page** (`.main`, `.wrap`) | main padding | `32px 48px 72px` | `32px 48px 72px` | same (already matched) |
| | wrap max-width | `1150px` | `1150px` | same |
| | narrow width | no rule (prototype draws sign-in/invite frames as `.stack` inside a plain centred column; nearest is `Arrival`'s own `maxWidth: wide ? 520 : 400`) | `360px` | same - a deliberate, narrower choice than `Arrival`'s 400px, unchanged by this task |
| | **full-height shell** (`gwui-page-shell`, group 3, piece 5) | no prototype class (the prototype's `body` itself is cream); for a page's own wrapper that renders outside `Page` - a sticky header's flex column, or a state with nothing else on screen | n/a (new) | added: replaces `GroundAdminPage.tsx`'s own page-level `style={{ minHeight: '100vh', ... }}` and its local `Shell` helper's identical inline style |
| **PageTitle** (`.t-title`, `.crumb`, `.t-small`) | title font/size | Literata, `clamp(24px,3vw,30px)`, weight 500, line-height 1.18 | `30px` fixed (not the clamp), weight 500, line-height 1.18 | same - the fixed 30px (24px under 640px via its own media query) is a deliberate simplification of the `clamp()`, already noted as intentional; not changed here |
| | **title-less, centred** (`title?`, `center`, `subtitleRole`, `gwui-title-centre`, group 3 drift list, piece 1) | no prototype class for a bare loading line (the prototype has no screenshot for this in-between moment); nearest is its own `.t-small` muted sentence | one-off `gwui-pt-sub` with an inline `style={{ textAlign: 'center' }}`, on MagicVerifyPage's "Confirming your email…"/"Setting up your check-in…" and JoinPage's "Loading…" | added: `title` is now optional and `PageTitle` takes `center` (centres the row, used with no title and no avatar) and `subtitleRole="status"` (so the line is announced as it arrives); both pages now render `<PageTitle center subtitle={...} subtitleRole="status" />` with no title at all |
| | sub line | `16px`/1.5, muted | `16px`/1.5, muted | same |
| **CheckInHeader** (PageTitle + `.tabs`) | gap under the title | `18px` (`.tabs{margin-top:18px}`) | `18px` | same |
| **Tabs** (`.tabs`, `.tab`) | tab height | `46px` | `46px` | same |
| | underline | `3px`, `var(--ink)` when on, otherwise none in the prototype (a real bug there - the row shifts). Ours draws a 3px TRANSPARENT underline on every tab, fixing the shift the prototype itself has | `3px transparent` (unset) vs `3px navy` (on) | same - this is a documented improvement over the prototype's own layout bug, not a mismatch to copy back |
| **Section** (`section.sec`, `.sec-h`, `.note`) | heading size/weight | `21px`, weight 700 (`.t-h2`) | `21px`/700 | same |
| | note | `13.5px`, muted (`.note`) | `13.5px`, muted | same |
| **Panel** (`.panel`, `.pad`) | corner radius | `12px` | `12px` | same |
| | inside padding | `20px 22px` | `20px 22px` | same |
| | **dark tone** (`gwui-panel-dark`, group 3, piece 5) | no prototype class for a dark panel; this keeps `Panel`'s own radius and padding and swaps in `--gw-dark` (`#0A1628`, already used elsewhere for a dark surface) and white text | n/a (new) | added: a person's private report, previewed on the lead's own roster once they have shared it, replacing a page's own `style={{ background: 'var(--gw-dark)', ... }}` div on `GroundAdminPage.tsx` |
| | border | `1px solid var(--rule)` | `1px solid var(--gw-border)` (= `#EDE5D6`) | same |
| **EdgeRow** (`.list`, `.item`, `.sp`) | grid | `4px minmax(0,1fr) auto`, gap 16px | same | same |
| | row padding | `16px 0` | `16px 0` | same |
| | heading/sub sizes | `17px`/700, `15px` muted | `17px`/700, `15px` muted | same |
| **PeopleTable / PersonRow** | head row | `10px 18px`, `13px` | `10px 18px`, `13px` | same |
| | row padding | no exact prototype rule for a full data-table row (the prototype's own `.row` is a generic `14px 0` list row); this is the product's own invention for a wide admin table | `12px 18px` | same, unchanged |
| **Avatar** (`.av`) | size at the sidebar's own scale | `34px`, radius 50%, weight 700, `13.5px` | matches where used at that scale; `Avatar.tsx` also offers other sizes the prototype's `.av` does not name (56px on PageTitle, etc.) - explicitly a "nearest equivalent", not a literal prototype rule | unchanged |
| **FieldRow** | row grid/padding | `srow` (s5.js/s20.js/s21.js/s38.js), on `.row`: `220px minmax(0,1fr) auto`, gap `18px`, padding `14px 0` (no side padding), `border-top:1px solid var(--rule)`, flat on the page - this was missed before this task, because nothing had read `srow` itself | `200px label column, 14px 22px padding, border-bottom, meant to sit inside a Panel` | fixed, 30 September: `220px minmax(0,1fr) auto`, gap `18px`, padding `14px 0`, `border-top`, no side padding, no Panel wrapper anywhere it is used |
| **Choices** (`.seg`, `.seg button`) | button height | `40px` | `40px` | same |
| | outline | `inset 0 0 0 1.5px var(--rule2)` | same | same |
| | on state | `background:var(--ink)` -> resolves to navy at this cascade's end (`.seg button.on{background:var(--navy)}`, line 191) | `background: var(--gw-navy)` | same |
| **ChoiceCards** | chosen outline | `2px solid var(--ink)` equivalent (white rows) | `inset 0 0 0 2px var(--gw-text)` | same |
| **Toggle** | size | no named prototype class for a settings toggle (the prototype's `.sharew` is the nearest: `30px x 18px` track); this part instead follows the shape of a standard switch at `48x28`, closer to iOS/Android convention than `.sharew`'s narrower one | `48px x 28px` | unchanged - flagged here as the one part with no exact prototype counterpart, nearest taken deliberately wider for a clearer on/off read, not from a miscopied number |
| **SwitchRow** | layout | no prototype class; built to read a heading (16px/700) beside a sentence (14.5px, muted), matching the type scale used everywhere else | 16px/700 title, 14.5px muted detail | unchanged |
| **Button row** (`gwui-button-row`, group 3, piece 5) | gap | no prototype class (the prototype hand-writes `style="display:flex;gap:Npx"` wherever two buttons sit together, e.g. s41.js's closing-session buttons); this follows the same 8px gap | n/a (new) | added: two or more `Button`s side by side, replacing a page's own one-off `style={{ display: 'flex', gap: 8 }}` rows on `GroundAdminPage.tsx`'s check-ins tab |
| **FormFields** (`label.f`, `.input`) | label | `14.5px`/700 | `14.5px`/700 | same |
| | field height | `48px`, radius `10px`, border `1.5px solid var(--rule2)` | same | same |
| **Button** (`.btn`) | height / two sizes | `44px` min, `.big` `54px`, `.sm` `36px` | same | same |
| | corner radius | `8px` | `8px` | same |
| | font | `16px`/700 | `16px`/700 | same |
| | **primary** | `background:var(--ink)` -> resolves to `var(--navy)` `#0C447C`, `#fff` text (line 190) | `background: var(--gw-navy)`, `#fff` | same |
| | **secondary** | white, `inset 0 0 0 1.5px var(--rule2)` | same | same |
| | **quiet** | transparent, `color:var(--act)` (navy), `padding:0 8px` | same | same |
| | **danger** | **solid**: `background:var(--con)`, `#fff` (line 67) | an OUTLINE (`background:var(--gw-card)`, red text + red line), plus a second "solid" style only reached with a `dangerSolid` flag, plus a "quiet danger" (red text, no box) the prototype has no equivalent of at all | fixed as part of this task: `gwui-btn-danger` is now the solid red directly; `dangerSolid` and `gwui-btn-quiet-danger` are removed - see the button report below |
| **Tag** (`.tag`) | height | `26px` | `26px` | same |
| | radius | `13px` | `13px` | same |
| | tones | `rec`/`att`/`act`/`con`/`plain`, each tinted bg + matching ink, plus a `1px` matching outline in the dark-mode-and-after rules (line 193) | proven/attention/action/concern/plain, each with the matching `box-shadow: inset 0 0 0 1px` outline | same |
| **Note / Empty / Callout** | note | `13.5px`, muted | `13.5px`, muted | same |
| | **Note's `center` option** (`gwui-note-centre`, group 3 drift list, piece 1) | `.gwui-auth-or` (signup.jpg's "or with your email" divider between Google and the email form): `text-align:center`, `14.5px`, muted | n/a (new) | added: `<Note center>`, replacing AuthPage.tsx's page-only `gwui-auth-or` paragraph; kept at `Note`'s own `13.5px` rather than copying the old class's `14.5px`, since the point of this option is to fold the divider into the one shared Note size, not carry its old number forward |
| | empty panel heading | `21px`/700 (`.t-h2`) | `21px`/700 | same |
| | **Callout's `concern` tone** (`gwui-callout-concern`, group 3, piece 5) | no prototype class for a tinted red callout (the prototype only ever shows red as `.btn.danger` or plain red text); this follows the same red the product already uses for a `concern`-toned `Tag` and `PersonRow` help strip (`--con` `#791F1F` on `--gw-red-bg`) | n/a (new) | added: a banner for something broken that needs fixing, such as a bounced invite, replacing a page's own one-off red `style={{...}}` block on `GroundAdminPage.tsx`'s check-ins tab |
| **TheDoor, rebuilt from the shared parts** (group 3 drift list, piece 1) | heading/help/crumb/rather | one-off `gwui-door-heading` (`clamp(26px,5vw,34px)`), `gwui-door-help` (`15.5px`), a hand-written crumb (`gwui-pt-crumb`, literal text spaces around "/"), `gwui-door-rather` (`13.5px`, ink) | now `PageTitle` (`title`, `subtitle`, `crumbs` - the fixed `30px` title and `16px` subtitle every other screen already uses) and `Note` for "Rather pick from a list?"; `gwui-door-heading`, `-help` and `-rather` are gone from gw-ui.css and the frozen list, `gwui-door` itself (the column's own width/margin) is kept since it is a layout wrapper, not a one-off style |
| **SessionReportPage, rebuilt from the shared parts** (`gwui-panel-private`, group 3 drift list, piece 1) | 38 one-off `gwui-fs-*`/`gwui-ink-*`/`gwui-mb-*`/`gwui-mt-*`/`gwui-pb-*`/`gwui-pl-*`/`gwui-pr-*`/`gwui-pt-*`/`gwui-rule-top` classes and 24 inline styles | no single prototype screen draws this page (own-report.txt is the nearest), so each piece follows the house type scale already set by the shared parts | now `Section` for "Session N"/"Your session" and "What now?", `Panel` with a real `Tag` reading "Only you" for the private half (kept tinted via a new `gwui-panel-private`, since the two-report layout is this page's own invention, not flattened to the plain `Panel`), `SubHeading` for every sub-heading ("Something here isn't right", "The team's report", "Since then, in the latest check-in"), `Note` for every small/muted line, `Stack` for the gaps between them, and `gwui-button-row` for "Start a new check-in" beside "Copy the link". `gw-print-none` (an old, non-`gwui-` print-only class) is kept, now on its own wrapping `div` around the "What now?" `Section`. No wording or behaviour changed. |
| **WhatToProbeThemOn, rebuilt from the shared parts** (`gwui-inferred-mark`, `gwui-panel-private`, group 3 drift list, piece 1) | 35 inline styles, a bordered tinted `<section>` | no prototype screen (lead-only) | now a `Panel` (tinted `gwui-panel-private`, since this is lead-only private material like the private half elsewhere) with a real `Tag` reading "Yours as the lead" beside its `SubHeading`, every block label (including each `Block`'s own title) a `SubHeading`, body text `gwui-panel-text`/`gwui-panel-text-muted`, every small caption a `Note`, and `Stack` for every gap. The small "inferred" provenance mark next to a worked-out line is not a `Tag` (a `Tag` is a short fact about a thing; this is a footnote on where a sentence came from), so it keeps its own tiny `gwui-inferred-mark`, at the 13px floor rather than the old 11px. The soft-spot items' left accent bar is the existing `gwui-rule-left` (3px, not the old 2px) with no side padding, a small simplification of the old `borderLeft`+`paddingLeft` pair. Every word, every block and the whole role-map fairness pairing (`protectAgainst`, `noticed`/`lookingLike`) are unchanged. |
| **WhatToWorkOnNext, rebuilt from the shared parts** (group 3 drift list, piece 1) | 22 inline styles, a navy-bordered tinted `<section>` | no prototype screen for the coaching note | now a `Panel` with a real `Tag` reading "Only you" beside its `SubHeading`, each short block label (`Where you stand`, `What keeps showing up`, `Before the next session` and the rest) its own `SubHeading`, body text `gwui-panel-text`, the empty-role-map line a `Note`, and `Stack` for the gaps - the same pattern SessionReportPage's own private half uses. The navy border and tinted background are gone, folded into the plain `Panel` it now sits inside (SessionReportPage's own private surface already carries the tint); every word and every block is unchanged. |
| **"Fills in as you talk", rebuilt from the shared parts** (group 3 drift list, piece 1) | box, name/count row, each row's mark | one-off `gwui-fit-aside` (`10px` corners, `16px` inside), `gwui-fit-name`/`gwui-fit-count` (`15px`/`13px` bold), `gwui-fit-row`/`-label`/`-value`/`-mark*` (`13px`, a flex row) | now a shared `Panel` (the house `12px`/`20-22px`, not the sidebar's own narrower box), the name and its tag in a `gwui-sentence-row` with a real `Tag`, the situation and help sentence each a `Note`, and the four rows a `RowList` of `Row`s at the Row's own `14.5px` (not the old `13px` one-off); the ✓/○ mark, its label and its value have no existing shared equivalent, so they keep their own small classes - `gwui-setrow-mark`, `gwui-setrow-mark-set`, `gwui-setrow-mark-unset`, `gwui-setrow-label`, `gwui-setrow-value`, `gwui-setrow-value-name`, `gwui-setrow-more` - documented here rather than carried over as a page-only sheet |
| **PasswordField's rules list** (`PasswordRulesList`, `gwui-password-rule-met`, group 3 drift list, piece 1) | the ticked rule's colour | `--rec` (green) - the prototype draws this inline in its own JS, no named class | one-off `gwui-rule-met` on `auth-kit.tsx`'s `PasswordRules` | moved into the shared `PasswordField` part as `PasswordRulesList`, with its own `gwui-password-rule-met` class so the tick style is not a page-only rule any more; `auth-kit.tsx`'s `PasswordRules` now only works out which rules are met and hands the list to this shared renderer |
| **Toast** | position/size | `bottom:90px`, `12px 18px`, radius `10px`, `15px` | same | same |
| **Modal** | width/padding/radius | `520px` max, `24px` inside, `14px` | same | same |
| **Mark** (the three bars, `.brand`) | size | `17px`/700 wordmark, navy, `22x17` mark (lines 210-211, the SVG bars) | `18px`/700 (`gwui-mark`) - a small, deliberate difference from the prototype's `17px` sidebar brand, since this part is also used at a slightly larger scale on the invitation and sign-in pages | unchanged; noted, not fixed, since the difference is a size choice for a different context, not a stray number |
| **SubHeading** | size/weight | no direct class (the prototype writes these by hand in its JS at `14.5px`/700, the same as `.f` labels) | `14.5px`/700 | same |
| | **dark tone** (`gwui-subheading-dark`, group 3, piece 5) | no prototype class; follows `kit.tsx`'s own `Sec on="dark"`, which used `rgba(255,255,255,.45)` for the same faint label-on-dark | n/a (new) | added: replaces `Sec title=... on="dark"` on `GroundAdminPage.tsx`'s private-report preview, the one old-kit import left in that file after this group's earlier parts |
| **Steps** | row height / marks | no direct class; a `Panel`-shaped list (`20px 22px` pad, `12px` radius) with rows on a hand-picked `38px` pitch and `16px`/700 marks, following the prototype's own step lists in its JS at the same sizes | `38px` row, `16px`/700 mark | unchanged |
| **Stack** | gaps | the prototype's `.stack` sets no gap of its own (`display:flex;flex-direction:column`) - spacing between children is set ad hoc in its JS per screen; this part's numeric gaps (`0/10/12/18/19px`) are taken from those per-screen numbers, not one prototype rule | as listed | unchanged |
| **Bubble** (`.bub`) | max width / radius / padding | `82%`, `16px`, `12px 16px` | same | same |
| **QuickReplies** (`.chip`) | height / radius | `40px`, `20px` | same | same |
| **Composer** (`.input` in a chat) | height | `48px` | `48px` | same |
| **ConversationCard** (`.ci-focus`, `.ci-card`) | width / radius | `560px` max, `16px` | same | same |
| **Folded** (a closed `.panel`) | padding / marker | `20px 22px`; prototype hides the `<summary>` marker with nothing put back (a bug, per the file's own comment); ours draws a `▶`/`▼` in its place | `20px 22px`, `▶`/`▼` | same - again a documented fix, not a value to copy back |
| **StageTrack** | pill shape | no prototype class (`.stages`, the nearest, is a plain flex row of labels, not pills); this is the product's own shape for "the shape of the work" | `13px` pill, `11px` radius | unchanged, nearest equivalent |
| **PatternPanel** | - | no prototype screen shows this panel's shape directly; built from `Panel` + `Section` sizes throughout | n/a | n/a |
| **The numeric utility scale** (`gwui-fs-*`, `gwui-mt-*`, etc.) | floor | the prototype's own smallest real text, `.t-tiny` at `13px` | floor enforced at `13px` by the guard test | same |
| **Stat row / plan cards / code block / check list / numbered steps / More rows / board classes** (group 1-2 rebuild) | - | none of these have a named prototype class; each was built at the prototype's existing type sizes (`16px`/700 names, `14.5px` muted captions, `13px`/700 tiny labels) and its existing spacing scale, not a new one | as listed in `gw-ui.css`, "GROUP 1 REBUILD" section onward | unchanged - all already drawn from the sizes above, no floating numbers of their own |

## The second pass (30 September, the screen-by-screen picture check)

A picture check of the rebuilt screens not yet checked (the check-in page and conversation, Done,
between check-ins, My work, People, one person, the board, Connections, WhatsApp, More) against
`docs/prototype/screens/*/*.jpg`, one screen at a time. Most rebuilt screens already match closely
(the srow rows, panels, tags and buttons the first pass fixed are holding up); the one real
page-level fault found was not in a shared part at all:

- **A party's "My work", "Report", "Context and resources" and "People and setup" tabs were all
  capped at 600px** (`GroundParticipantPage.tsx`), the width meant for the conversation itself. The
  lead's own equivalent page (`GroundAdminPage.tsx`) already widens its own settings tab to the
  page's full 1150px, by a documented decision (`the-dashboard-uses-the-screen.spec.ts`) - "People
  and setup" is a page of tiles and lists, not prose to read top to bottom, so it gets the screen.
  `my-record.jpg` shows exactly the same shape for "My work" (the stat tiles and any deals beside
  a right-hand column: the pattern, what was promised, and the reports) - a two-column layout that
  cannot fit, and so silently collapsed to one column, inside 600px. Fixed by widening `record` the
  same way `settings` already widens, in both the page (`GroundParticipantPage.tsx`) and
  `YourWork.tsx`'s own layout (a `grid-template-columns: repeat(auto-fit, minmax(320px, 1fr))`,
  the same responsive pairing BoardPage.tsx already uses for its own side-by-side cards). `Report`
  and `Context and resources` are unchanged and still read at 600px; nothing in this pass found
  either of those two to be wrong. The guard test was updated to match (see its own comment,
  30 September, for why).
- **The People page's no-seat warning** (corrected after this pass). The builder first rebuilt it
  after `s11.js`, with a "Free a seat" and a "Move to a larger plan" button on each person's row.
  But the prototype's People screen as it finally reads (`screens/A4-people-roles-and-access/people.txt`)
  does not show this warning at all, so under Hafsah's rule its action is one quiet text link:
  "Move to a larger plan" when the plan is full, "Send their invitations" when there is room. The
  rows keep the prototype's shape and wording, with no buttons. The live button test counts a
  `.gwui-plain-link` as a link, the way it never counted the prototype's own plain links, and
  People passes.
- Everything else checked in this pass (the check-in conversation, Done, between check-ins, People,
  one person, Connections, WhatsApp, More) already matched the prototype's own use of the shared
  parts closely enough that no further part or page change was made.

## Group 2, piece 1 (Today and the check-ins list): the parts this piece added

Rebuilding Today (`TodayPage.tsx`, `YouAreIn.tsx`) and the check-ins list (`GroundsListPage.tsx`,
`an-admin-lands-on-a-check-in-list.tsx`) from the shared parts needed four small additions to
`components/gw/ui`, each read from `docs/prototype/source/app.css`:

| Part | Property | Prototype's value | Ours |
| --- | --- | --- | --- |
| **Greeting** (new; `.t-greet`, app.css line 12) | heading font/size | Literata, `clamp(30px,4vw,38px)`, weight 500, line-height 1.12, letter-spacing -.01em | same, plus a `17px`/1.5 muted subtitle line under it (the prototype's own `t-body`-sized line under the greeting, e.g. "Wednesday 23 September. …") |
| **ComingUp** (new; Today's own sidebar list, app.css `.side`) | the two-column layout | `.side { grid-template-columns: minmax(0,1fr) 340px; gap: 44px }`, `@media (max-width:1100px)` collapses to one column | same, as `.gwui-side`, used by Today; each row a `120px` time column (bold) beside a plain link, a line above the first and under each |
| **CheckInsTable** / **CheckInRow** (new; check-ins.txt's own table) | column widths, row height | no dedicated prototype CSS class for this exact table (the screen's own markup); built at the same sizes the page already used before the rebuild (`17px`/700 name, `14.5px` muted "about" line, `13px` "also" line) | unchanged - a straight rename into the shared kit (`gw-ci-table*` -> `gwui-ci-table*`), not a value change |
| **Callout** `tone="success"` (extends the existing shared part) | colour | no dedicated prototype rule ("You are in." is this product's own line, not one of the prototype's screens); nearest is the prototype's own green, `--rec`/`--rec-soft` | `var(--gw-green-bg)`/`var(--gw-green-t)`, the same green `Tag tone="proven"` already uses |

`Stack` also gained a `gap={30}` option, matching `Page`'s own flat 30px stacking rule
(`.gwui-page-wrap > * + *`), for a two-column layout's own single column - not a new value, the
existing one made available where a `Page` cannot be nested.

## Group 2, piece 2 (the You board): the parts this piece added

Rebuilding the You board (`YouPage.tsx`) needed two small additions to `components/gw/ui`, both
read from the prototype's own values (app.css, and the You board's own screens):

| Part | Property | Prototype's value | Ours |
| --- | --- | --- | --- |
| **Panel** `as="section"` / `heading` (extends the existing shared part) | heading font/size | `.t-h3`: `18px`, weight 700, line-height 1.3 | same, as `.gwui-panel-heading` - the You board's own titled cards ("Your goals", "Your to-dos", "Coaching" and the rest) are now a real `<section>` with this heading, in place of the page's own `Card` |
| **RowList** / **Row** (new; the You board's own plain lists, no dedicated prototype class) | row shape | no dedicated prototype CSS class (the screen's own markup); built at the sizes the page already used before the rebuild (`14.5px`/1.45, a line above the first row and under each) | unchanged - a straight rename into the shared kit (`gw-you-row*` -> `gwui-row`), not a value change |

The page's own `gw-you-*` classes stay in `index.css` - several Suites pages and the Company page
still use them, and rebuilding those is a separate task. Only `YouPage.tsx` itself, and the one
function of `Suggestions.tsx` it draws (`WhereYouStand`, the person's own "Where you stand"), stop
using them.

**The subtitle now varies with the reader, as the prototype's four screens do**
(`theYouSubtitle`, `YouPage.tsx`): one check-in or none reads as the shorter sentence
(you-board-daniel.txt, you-board-kwame.txt); more than one names the scope, either "every check-in
you're in" (a participant, you-board-miriam.txt) or "all N check-ins" (someone who runs at least
one, you-board-wairimu.txt). This was a real gap in the page before this rebuild - it always showed
the shortest sentence, to every reader.

**A picture check found a live second primary button** (Juma, an admin with two check-ins each
needing a first session, both "Start it" on "Your turn"): fixed by making the "Your turn" row's
action `kind="secondary"`, the same rule already applied to repeated rows elsewhere (piece 1's
"Approve" and "Try again" on the check-ins list).

## What this pass found, in one line

Out of every part checked, only **Button's `danger` kind** actually diverged from the prototype's own value (an outline instead of the prototype's one solid red, plus two extra variants). Everything else already matches, because this stylesheet was built by copying `app.css`'s numbers directly and has been checked against it, part by part, in `the-parts-match-the-prototypes-exact-values.spec.tsx`, through several earlier sessions. The parts with **no prototype rule at all** (Toggle, FieldRow, StageTrack, SubHeading, Steps, Stack's gaps, and the whole "group 1-2 rebuild" set) are named above so nobody mistakes "no exact source line" for "not checked" - each is built from the prototype's own type and colour scale, just without one specific CSS rule to point at.

## Group 2, piece 3 (the Company page and company context): the parts this piece added

Rebuilding the Company page (`CompanyPage.tsx`) and company context (`CompanyContextPage.tsx`) from the shared parts needed three small additions to `gw-ui.css`, all built at sizes this kit already uses elsewhere (neither screen has a dedicated prototype class for them - `docs/prototype/source/app.css` draws these shapes by hand in its own per-screen JS, and never writes a real `<table>` at all):

| Part | Property | Prototype's value | Ours |
| --- | --- | --- | --- |
| **`.gwui-priority-top`** (a priority card's "Priority N" beside its tag, before the title) | layout | no dedicated rule; built from the sizes the rest of a `Panel` card already uses | `flex`, `space-between`, `6px` margin below - unchanged from the product's own prior value |
| **`.gwui-team-col`** ("Named by more than one team": one team's own column, company.jpg) | the thick top rule | no dedicated rule (the product's own shape) | `3px solid` ink, `8px` padding above - unchanged from the product's own prior value (`gw-company-team`) |
| **`.gwui-compare-table`** ("What you say, and where the time goes") | - | the prototype never draws a real `<table>` for this (app.css has no table rule anywhere, only a mobile note that "tables become stacked cards" for its own `.row`-based lists); this is the product's own shape | `14.5px` body text, a `1px` top rule between rows, collapsing to stacked blocks under 900px - unchanged from the product's own prior value (`gw-company-table`), renamed into the shared kit |

Both pages otherwise reuse parts already in the kit: `Page`/`PageTitle` (the title, and `PageTitle`'s own `crumbs` for "Company / Baridi Appliances" on company context, in place of the page's own nav), `Section` for every heading, `Panel` (`as="section"`) for each priority card and the "Named by more than one team" card, `Tag`, `Note`/`Empty` for the loading, error and empty-state lines, and `RowList`/`Row` for "Where the strategy isn't reaching the work" and company context's handbook, resources and "what the company has learned" lists. The head row of buttons ("Ask about the whole organisation" beside "Company context"/"Ask about the strategy") reuses `.gwui-sentence-row`, the same row `YouPage`'s "Your data" already uses - no new layout class was needed for it.

**What was checked live, and what it found.** `the-company-page-as-each-reader-sees-it.spec.tsx` (30 tests) passes unchanged in substance - only the markup underneath moved to the shared parts, the wording and what each reader is served did not. Pictures at 1440 and 375, as Rukia (lead, and an organisation owner so she reads everything an admin does), Amani (participant) and Juma (admin), before and after, read identically to the prototype's own `company.jpg`/`company-context.jpg` layout: the button row, the "Is the strategy moving?" heading, and the empty-priorities sentence line up the same way; a participant correctly reads "6 people." with no check-in count, never the admin's "6 people, 21 check-ins this week." The one thing neither picture shows is the priority cards' own grid (`.gwui-cards-3`) or the comparison table with real rows, because the shared e2e test organisation ("Kilima Traders U8") has no company priorities synced into it yet (`Subject` rows of type `OBJECTIVE`) - inserting that data needed a direct write to the local dev database, which this session's sandbox permissions refused outright as "modify shared resources", so it was left exactly as found rather than worked around. `e2e/the-prototype-count-of-buttons.spec.ts`'s new `CompanyContextPage.tsx` entry passes; the new `CompanyPage.tsx` entry fails only the generic "the page shows real content" sanity floor (300 characters) for this reason - the page itself renders correctly (confirmed by the pictures: the true, documented empty state, "No priorities have come in from your organisation's own systems yet."), so this is a data gap in the shared test organisation, not a defect in the rebuild. Both screens pass `the-page-is-cream.spec.ts` (all three readers, #FDFBF6 throughout) and the guard test `the-rebuilt-pages-use-only-the-new-parts.spec.ts`.

(The button test's floor was later given a `mustShow` escape hatch for exactly this situation - a page whose true state on this Mac's data is a short, genuine empty or refused sentence - see `bfab015f`. `CompanyPage.tsx`'s entry, and every suite board below that needs it, now uses that instead of failing the generic floor.)

## Group 2, piece 4 (the Suites page and every suite's board): the parts this piece added

Rebuilding `SuitesPage.tsx` and all ten boards (`OnboardingBoardPage`, `LeaveBoardPage`, `TimeSheetsPage`, `ReviewsBoardPage`/`ReviewPage`, `LeavingBoardPage`, `RoleMapPage`, `SpendingPage`, `TodosPage`, `CustomersPage`, `EquipmentPage`) needed five small additions to `gw-ui.css`, every one carried over unchanged from this product's own prior classes (the prototype draws each of these shapes by hand per screen, or - for a real `<table>` - not at all):

| Part | Property | Where it came from | Ours |
| --- | --- | --- | --- |
| **`.gwui-suite-head`/`.gwui-suite-switch`** (a suite card's own two-column layout, title and body left, On/Off tag and its `Toggle` right) | layout | `gw-suite-head`/`gw-suite-switch` | unchanged |
| **`.gwui-suite-ask`/`.gwui-suite-q`** (the small form a suite's own questions open into) | layout | `gw-suite-ask`/`gw-suite-q` | unchanged |
| **`.gwui-record-table`** (a record table: time sheets, equipment, spending, customers, the role map) | sizes | `gw-suite-table`, `gw-time-table` | unchanged, merged into one name since both were the same shape |
| **`.gwui-time-bar`** (a progress bar against an agreed amount, time sheets' own "Hours against what each client agreed") | sizes/colour | `gw-time-bar` | unchanged |
| **`.gwui-quoted-text`** (a review's own quoted words) | font/size | `gw-review-said` | unchanged |
| **`ProofMark`** (new component; a noticed line's proof dot) | - | kit.tsx's `Mark` - renamed so it is never confused with this kit's own `Mark` wordmark | same `gw-mk-*` colours, renamed `gwui-mk-*` |

Every page otherwise reuses parts already in the kit: `Page`/`PageTitle` (crumbs, subtitle - its shared `aria-label="Where you are"` replaces each page's prior `"Breadcrumb"`, updated in every spec that checked it, with the reason given in each commit), `Section` for every heading, `Panel` for every card, `Tag`/`Toggle`/`Button` for every control, `FieldLabel`/`TextField`/`TextArea`/`Select` for every form field, `RowList`/`Row` for every list, and `Note`/`Empty` for loading, error and empty states. "Open its board" and "Open it" (purely navigational) became plain links (`.gwui-plain-link`), not buttons - the leave and spending boards' row-lookups in their own specs moved from a page-local CSS class to the shared `RowList`'s own accessible name for the same reason.

**Protected, and left alone.** `RoleMapPage.tsx`: every role, what it owns, who holds it, and every "Nobody owns ..." line are unchanged - only the surrounding markup moved. `LeavingBoardPage.tsx`'s handover stays linked only by who and when, never what was in it, and every one of its ten steps still writes to the same server actions.

**A real regression, found by the picture check, fixed before this piece was done.** `SuitesPage.tsx`'s "Money" group (just "Spending and budgets", on its own) had shrunk to one third of the row inside `gwui-cards-3`, where the prototype (`suites-admin.jpg`) and the page's own prior `gw-suites-one` class both give a lone suite the full width. Fixed by skipping the grid wrapper for a group of exactly one suite.

**The guard test caught a second real regression no per-page spec could.** `EquipmentPage.tsx`'s row-level "Save" defaulted to a primary (navy) button, same as "Add an item"'s "Add it" - both default when no `kind` is given - so editing a row while the add form was open showed two navy buttons on screen together. Neither board's own spec could catch this (each only renders one state at a time); `the-rebuilt-pages-use-only-the-new-parts.spec.ts`'s static count, run across every listed page the moment `EquipmentPage.tsx` joined the list, did. Fixed by making the row's "Save" secondary, the rule every other board already applies to a row-level action beside the page's one primary form.

**What was checked live, and what it found.** All eleven specs pass (114 tests), none with an assertion changed beyond the "Where you are"/row-lookup updates named above. Pictures at 1440 and 375, as Juma (admin) for every board, and Rukia and Amani once each to confirm the reader rule, read identically to the prototype's own screens once the "Money" fix above landed. Juma and Rukia read the same admin view throughout (she is an organisation owner, marked `ADMIN` in this test org, the same finding as the Company page); Amani, a member, is refused everywhere ("That one is not yours to open."). None of Kilima Traders U8's ten suites is switched on, so every board shows its own true "not switched on" sentence rather than real rows - turning one on would be adding data, which this piece was told not to do, so each was left exactly as found. `e2e/the-prototype-count-of-buttons.spec.ts` gained all eleven entries (`ReviewPage.tsx` excepted - it needs a real review id, which only exists once a review has been started, so it is marked `null` the same way a panel-of-one-screen is); eight boards needed `mustShow` for their own "not switched on" sentence, the same mechanism `CompanyPage.tsx` already uses. `the-page-is-cream.spec.ts` gained the Suites page and every board for the admin, and the Suites page for the lead. The whole client suite (3674 tests) passes but for the one pre-existing Yoda-count regression (62 from 60, request 95), unrelated to this piece - none of its newly-flagged lines are in a file this piece touched.

## Group 3, piece 1 (signing in and joining): the parts this piece added

Rebuilding `AuthPage.tsx`, its kit `auth-kit.tsx`, `MagicVerifyPage.tsx` and `JoinPage.tsx` from the shared parts needed three real additions to `components/gw/ui` (the prototype draws the sign-in screen's own two-column layout once, nowhere else, so nothing earlier needed it) and two small widenings of parts that already existed:

| Part | Property | Prototype's value | Ours |
| --- | --- | --- | --- |
| **`PasswordField`** (new component, `components/gw/ui/PasswordField.tsx`) | the box, and the "Show"/"Hide" button inside it | `password.jpg`/`signup.jpg`/`reset.jpg`'s own password field | carried over unchanged from `auth-kit.tsx`'s old, page-local version (`.gw-auth-pw`/`.gw-auth-show`), renamed `.gwui-password-wrap`/`.gwui-password-show` |
| **`SplitPage`/`SplitPanelLine`/`SplitPanelList`** (new component, `components/gw/ui/SplitPage.tsx`) | the sign-in screen's two halves: the form, and the dark panel beside it | `signin.jpg`, the one A2 screen drawn this way | carried over unchanged from `auth-kit.tsx`'s old `AuthSplit` (`.gw-auth-split`/`.gw-auth-split-panel`/`.gw-auth-panel-line`/`.gw-auth-dot-*`), renamed `.gwui-split*`/`.gwui-split-panel-line`/`.gwui-split-dot-*` |
| **The password rules list and strength bar** (`.gwui-rules`/`.gwui-strength-bar`, CSS only, drawn by `auth-kit.tsx`'s `PasswordRules`/`PasswordStrength`, which stay there since they are built from this product's own password rules, not a shared shape) | the ticked list under a new password, and the bar over "Strong enough" | `password.jpg`/`signup.jpg`/`reset.jpg` | carried over unchanged from the old `.gw-auth-rules`/`.gw-auth-strength-bar` |
| **`Callout`'s `tone="warning"`** (widened; `NoteEmpty.tsx`) | the amber tint a passwordless account or an expired session is told in | no dedicated prototype class (an amber notice is this product's own addition, not drawn in A2) | `.gwui-callout-warning`, the same amber as every other "something to know" surface elsewhere in the kit |
| **`PageTitle`'s `subtitle`** (widened from `string` to `React.ReactNode`) | a sentence with a bold address inside it ("We'll send sign-in links and reports to **wairimu@baridi.co.ke**.") | - | no new CSS; a plain string still renders exactly as before |

`AuthNotice` (the passwordless-account and session-expired notices) kept its own two-line shape - a bold title above the sentence under it - rather than `Callout`'s single paragraph, so `AuthPage`'s own text ("Check your email") stays its own addressable line; it uses the same `gwui-callout gwui-callout-warning` classes directly, with two new small rules, `.gwui-callout-title`/`.gwui-callout-body`, to carry that shape.

Every other part these four files use was already in the kit: `Page`/`Mark`/`PageTitle` for every narrow screen (forgot, reset, "check your email", Google did not finish, signed out, create an account, the broadcast join landing), `FieldLabel`/`TextField` for every plain field, `Note`/`Callout`/`Button`/`Stack` throughout, and `Choices` for "How would you like to sign in?" at sign-up - a radio choice the old page drew by hand with native `<input type="radio">`s, now the same segmented control the People page's filters already use.

**`auth-kit.tsx` keeps every export's name**, so `LinkExpired.tsx`, `EmailConfirmed.tsx`, `LinkSentPanel.tsx`, `GoogleFailedPage.tsx`, `SignOutPage.tsx` and `ChoosePasswordPage.tsx` - none of them named in this task - draw the new parts too, the moment `AuthCard`/`AuthField`/`AuthError`/`PasswordField`/`PasswordRules`/`PasswordStrength` changed underneath them. Each of those six files also had its own `Button` import and old wrapper classnames (`gw-auth-actions`, `gw-auth-links`, `gw-auth-small`, `gw-auth-link`, a raw `gw-b gw-b-quiet` anchor) swapped for the shared `Button`/`Stack`/`.gwui-fine`/`.gwui-auth-links`, so none of the six auth screens mixes old and new button styles inside the same rebuilt card.

**What was checked live, and what it found.** `cd client && npx tsc -b` is clean. Every spec touching sign-in or auth-kit passes (one test's helper needed `.gwui-sr-only` added beside the old `.gw-sr-only` it already stripped, two needed `getByRole('radio', ...)` in place of `getByLabelText(...)` now that the sign-in choice is `Choices` rather than a native radio with a wrapping `<label>`, and a few pinned exact old DOM shapes - the password-manager `htmlFor` count, a merged welcome sentence, a straight vs typographic apostrophe, a missing "✓" - were updated with the reason in each commit). The whole client suite (3671 tests) passes but for one pre-existing, unrelated failure (`the-reveal-row-names-who-you-are-waiting-on.spec.ts`, confirmed present before this task's first commit by stashing it and re-running). The wording guard (`copy-does-not-sound-like-yoda.spec.ts`) stayed at 60: moving `MagicVerifyPage`'s "we couldn't find your session" text from JSX children into a `PageTitle` `subtitle` string briefly exposed an existing "If you finished your session..." sentence to the guard for the first time (it had never been inside a quoted string literal before), so that sentence was rewritten rather than excused. The eight API specs that read these files pass unchanged. `e2e/the-page-is-cream.spec.ts` passes for all three readers, proving the emailed sign-in link still works end to end through the rebuilt pages. `e2e/the-prototype-count-of-buttons.spec.ts` passes unchanged (26 tests); `auth-kit.tsx`, `AuthPage.tsx`, `MagicVerifyPage.tsx` and `JoinPage.tsx` are marked `null` there, since every one of them is a signed-out screen and this test signs a reader in before opening anything - their one-primary-button rule is instead checked by the static `primaryButtonCount` in `the-rebuilt-pages-use-only-the-new-parts.spec.ts`, which now covers all four.

## Group 3, piece 2 (the reports): the parts this piece added

Rebuilding `SessionReportPage.tsx` (the live per-session report, `/checkin/:checkInId/report`)
from the shared parts needed a small set of additions to `gw-ui.css`, all at the sizes this page
already used before the rebuild (the prototype's own B4 screens - `docs/prototype/screens/
B4-reports-and-sharing/` - draw a session's own report by hand per screen, with no dedicated CSS
rule for most of these shapes):

| Part | Property | Where it came from | Ours |
| --- | --- | --- | --- |
| **`.gwui-fs-20`/`.gwui-fs-22`** (the session heading, "Session 4") | font-size | the page's own prior `fontSize: 20` | unchanged |
| **`.gwui-rule-left`/`-amber`/`-green`** (a found-area's own left edge marker) | border-left | the page's own prior one-off `borderLeft` values | unchanged |
| **`.gwui-ink-green-soft`** | colour | `var(--gw-green-t-soft)`, a token already defined and already referenced inline elsewhere on this page | unchanged |
| several `mt`/`mb`/`pt`/`pl`/`gap` numeric classes (24, 30, 32, 40, 1, 3, 5, 11, 20, 22, 34, 17, 2, 18) | spacing | the page's own prior inline values | unchanged |

**`ReportPage.tsx`'s own `ReportBody`** (everything below its three-line `ReportPage` redirect) is
not mounted by any route today - confirmed against the file's own regression tests
(`the-sharp-part-first.spec.ts`, `no-label-is-the-leads-note.spec.tsx`, `one-report-not-two.spec.ts`
and others, each of which says so in its own comment) and against every caller of `GroundAdminPage`/
`GroundParticipantPage`, which draw `TheSessionsReport`/`SoloReportBody` directly and never
`ReportBody`. Rebuilding dead markup to match the prototype pixel for pixel serves no reader, so
this piece left it as it was rather than churn ~250 lines of regression-locked source for a screen
nobody opens - see the morning report for the recommendation to delete it (and its own tests) in a
later task, once Hafsah confirms nothing still links to it from an old email or a bookmark.

**Two things this piece found and fixed, not specific to the report screens**: `oldClassesUsed()`
(`the-rebuilt-pages-use-only-the-new-parts.spec.ts`) matched the CSS custom property
`var(--gw-card)` as the old class `gw-card` by plain substring - true of several already-correct
components (`HowSpecificThisSessionWas.tsx`, `WhatToWorkOnNext.tsx`, `TheReportYouSawAtTheEnd.tsx`,
`TheCheckInYouJustFinished.tsx`) that this piece was the first to import from a listed page.
Narrowed the match to not fire inside a `--` token. And `TheCheckInHeader.tsx` (drawn by the
session report page, the board, and every other check-in page) passed two style objects through as
`style={}` - moved to `.gwui-ci-link-btn`/`.gwui-ci-tab`/`.gwui-ci-tab-on` in `index.css`, same
pixel values, because this is a shared component many unlisted pages still draw and a value change
there was out of scope for this piece.

**What was checked live, and what it found.** `cd client && npx tsc -b` is clean. The guard test and
every spec touching `ReportPage.tsx`, `SessionReportPage.tsx` or `TheCheckInHeader.tsx` pass (39
spec files, 246+ tests), none with an assertion changed beyond the guard's own false-positive fix
above.

## Group 3, piece 5 (the lead's check-in page): a part moved into the shared parts

| Part | Where it is used | What it follows |
| --- | --- | --- |
| `gwui-person-head` | The roster row on the lead's check-in page (`GroundAdminPage.tsx`): the status dot, the avatar and the name kept on one line | The prototype's own avatar-to-name gap, 10px (app.css `.person`). It was first added to the old stylesheet as `ga-row-head`, outside both class guards; it is now a shared part, and the old stylesheet is frozen too. |

## Group 3, piece 5 (last piece): Context and resources

`ContextPage.tsx` (drawn by both `GroundAdminPage.tsx` and `GroundParticipantPage.tsx` as the
"Context and resources" tab) was the last file in the product still importing `kit.tsx`'s `Sec`,
including `Sec`'s own numbering (`n={band()}`, a counter incremented once per band actually drawn).
Checked against the prototype's own Context screens
(`docs/prototype/screens/B2-context/context.txt`, `company-context.txt`) and
`docs/prototype/source/app.css`: neither numbers a heading anywhere, on this screen or any other.
The numbering is a product invention with no prototype source, so it is dropped rather than carried
into `Section` as a named option - every heading on this page now reads as a plain `Section`
heading/note, the same as every other rebuilt page.

Six small parts were added to `gw-ui.css` for shapes this page needed, none with a dedicated
prototype class (the prototype draws each of these by hand, the same basis the rest of this file
already uses for a one-off shape):

| Part | Property | Where it came from | Ours |
| --- | --- | --- | --- |
| `.gwui-doc-grid` | the documents, as cards | the page's own prior `display:grid, gridTemplateColumns: repeat(auto-fill, minmax(200px,1fr)), gap:10` | unchanged values, moved into a named class |
| `.gwui-line-row` | a line of text with inline meta beside it | the page's own prior `display:flex, alignItems:baseline, gap:10, flexWrap:wrap`, repeated at several call sites (ready for reuse; not yet drawn from in this piece - see the note below) | unchanged |
| `.gwui-group-head` | a named bucket's own header strip inside a Panel list ("How we work", "Notes") | the page's own prior `background:var(--gw-bg), padding:'8px 13px 6px'` | padding rounded to the page's own 10px/16px scale |
| `.gwui-tag-control` | a `<select>`/`<button>` styled with `.gwui-tag` instead of a `<span>` - who can read a document | new: resets a native control's own border/font/cursor so only `Tag`'s look shows | n/a (new) |
| `.gwui-busy` | the upload dropzone while a file is on its way in | the page's own prior `cursor:'progress', opacity:.6` | unchanged |
| `.gwui-inline-fold-summary` | a `<details>` folded under a quote or a card, not its own boxed panel ("What you wrote", "What Groundwork took from it") | the page's own prior `cursor:'pointer'` on a bare `<summary>` | unchanged - deliberately NOT `Folded`, which draws its own 20/22px-padded, bordered, triangle-marked panel meant for a closed panel in a list, not a short aside folded under a quote |

Document cards, the brief's quote panel, the empty and editing states, the privacy notices, and the
outstanding-work warning now draw from `Panel`, `Section`, `Button`, `TextArea`, `Tag`, `SubHeading`,
`Note` and `Callout` rather than inline styles. Every text size under 13px (the small "Used to
check"/"What we read from it" labels, the "photo" tag, the visibility pill) now reads at 13px or
above, per the floor every rebuilt page keeps. `.gwui-line-row` is written up here because it was
added for the lines under "What people are down as doing" and "Strategy, notes and how we work" in
this same piece's next commit - see that commit for where it is actually drawn from.

## Group 3 review, batch B (1 October): two small parts added

| Part | Property | Where it came from | Ours |
| --- | --- | --- | --- |
| `.gwui-auth-card` | spacing between a narrow account screen's mark, heading and form | `Page narrow`'s own `.gwui-page-narrow > * + * { margin-top: 30px }` (gw-ui.css), for a `Page narrow`'s direct children | the same 30px, moved one level deeper: `AuthCard` (auth-kit.tsx) now wraps its mark, heading and form in the shared `Panel` - the white card signup.jpg and verify-expired.jpg both draw and `AuthCard` had been missing entirely - so those three are no longer `Page narrow`'s own direct children, and need the same rhythm restated on the panel that now holds them |
| `.gwui-mark-row` | the mark, with one action beside it | no prototype class; a plain flex row (`space-between`, `12px` gap, `16px 0` padding) for the one place the product needs `Mark` beside something else - a signed-out reader's "Sign in" on `/start` (`EntryChatPage.tsx`), now that that screen draws no sidebar of its own (start.jpg draws none either, and the sidebar used to be the only thing putting a mark and a way to sign in on that screen) | as listed |

## Group 3's drift-list review, part 1 (1 October): `TheSessionsReport.tsx` rebuilt

Hafsah's 1 October review of group 3's own earlier pages found about fifty one-off utility classes
(`gwui-fs-*`, `gwui-gap-*`, `gwui-ink-*`, `gwui-m*`, `gwui-p*`, plus `gwui-rule-blue` and
`gwui-rule-top`) still carrying this one session report's own values, alongside the inline styles
sitting beside them. Rebuilt from `Panel`, `SubHeading`, `Stack`, `EdgeList`/`EdgeRow`, `Callout`
and `Note` (B4-reports-and-sharing: team-report.txt, one-session.txt,
team-report-as-participant.txt):

- The outer card is now `Panel` (`pad={false}`, since the card needs full-bleed colour bands the
  finding and the conversation-worth-having both use - a padded `Panel` would have padded those
  bands too, which the prototype's own full-width tinted strips never do).
- `withheldUntilYouAnswer`'s box - the one literally named `gwui-rule-blue` - and "The conversation
  worth having now" are both now `Callout` (`tone="info"`), each with its own `title`, in place of a
  hand-built tinted `<div>` with a hand-built label above a paragraph.
- The loading line ("Reading everybody's side of this session...") is now `Note` (`role="status"`),
  the same pattern `SessionReportPage.tsx`'s own "Getting your report…" already uses.
- Each "still open" topic under "Where things stand" is now an `EdgeList`/`EdgeRow` (`kind="look"`,
  amber), its accent spur standing in for the dot this file used to paint by hand with an inline
  `style={{width:6,height:6,...}}`; everything the topic used to carry - each person's position as
  its own sentence, the "why this matters"/"what would settle it" captions, and the folded "lines
  this comes from" - now lives in the row's `detail`.
- The local `Row` component (used for every other block - the cascade, the objective band, "what
  people said this session", "the picture from everybody", "not raised again", "what this is built
  from") keeps its exact name and its `label`/`n` props: `the-order-comes-from-one-place.spec.ts`
  reads this file's own source for a literal `<Row ... label=...>` tag to prove the block order, so
  renaming it or dropping its shape would have broken a test that is right to exist. It now draws
  its label with `SubHeading` rather than a bespoke bold, muted span.
- What is left after that is content this report alone has no other shared part for yet - the
  quote-and-citation pairing (`Quotes`/`Cite`), the at-a-glance tiles, and the amber finding band.
  Each now lives in one purpose-named local class scoped under `.gw-sr` in the component's own
  `<style>` tag (`.gw-sr-quote`, `.gw-sr-cite`, `.gw-tile-grid`, `.gw-sr-row`, and the rest) - the
  same pattern this file already used, before this rebuild, for `.gw-find`/`.gw-tile*` - rather than
  a combination of atomic one-off utility classes. None of these are in `gw-ui.css`, so they add
  nothing to either frozen class list; they are local to this one component, the same as the two
  classes that were already there.
- `Section` and `Tag` are deliberately not used here. This component has no page-level heading of
  its own - every page that draws it (`SessionReportPage.tsx`, `RoundReportPage.tsx`) already
  supplies one above it - and nothing on this screen is the short, unpunctuated fact `Tag` is for.
  "Shared with the team." is a full sentence the prototype prints as plain text under the session
  line (one-session.txt: "Shared with the team that evening"), not a pill, so it stays plain text
  rather than being forced into a `Tag` just to use the part.

`gwui-rule-blue` and `gwui-rule-top` are still used elsewhere (`TheJudgement.tsx`,
`WhatTheRecordShows.tsx`, `ContextPage.tsx`, `WhatToWalkInWith.tsx`, `WhatSuccessLooksLike.tsx`,
`where-to-focus.tsx`, `ResolutionPanel.tsx`, `split-one-total-across-people.tsx`, `BoardPage.tsx`,
`WorkRecords.tsx`, `two-accounts-side-by-side.tsx`), so neither rule nor name comes off
`one-off-style-classes.ts` yet.

## Group 3's drift-list review, part 2 (1 October): `TheSessionsReport.tsx`'s own `<style>` tag removed

Its 46 classes lived in a component-local stylesheet (a template string, injected with a `<style>`
element), which neither class guard reads - the same drift as a one-off utility class, just hidden
in a different place (Hafsah, 1 October). They are now ordinary named classes in `gw-ui.css`,
`gwui-` prefixed like every other shared part, with every value carried over unchanged. The file
and its class list come off `the-style-tags-there-were-on-1-october.ts`.

Each followed the values below before this move, and follows them still - nothing changed but
where the rule lives:

| Class | What it draws | Where it came from |
| --- | --- | --- |
| `gwui-sr` | the report card's own overflow clip, so the full-bleed finding and tile bands do not escape the panel's rounded corners | the card's own shape (no dedicated prototype class; this product's own invention for a card with full-bleed internal bands) |
| `gwui-sr-head`, `gwui-sr-head-title`, `gwui-sr-head-shared` | the masthead line ("Session 37. 6 of 6 people checked in.") and, once released, "Shared with the team." under it | one-session.txt's own masthead sentence and share line |
| `gwui-sr-counted`, `gwui-sr-counted-item`, `gwui-sr-muted` | the row naming who is counted and who has or has not checked in | one-session.txt: "You have checked in.", "Omar has not checked in yet." |
| `gwui-sr-finding`, `gwui-sr-finding-label` | the amber finding band at the top of the card | the marketing example report's own finding band (no screen in `docs/prototype/screens` carries this card; the marketing site's example reports are the nearest prototype source, as the file's own top comment says) |
| `gwui-find`, `gwui-find-why`, `gwui-find-why-basis`, `gwui-find-why-also` | the finding's own sentence, and its basis/also-would-have-surfaced captions underneath, in amber | the same marketing example report |
| `gwui-sr-row` | one numbered block of the card (the cascade, the objective band, "what people said", "the picture from everybody", "not raised again", "what this is built from") | the marketing example report's own row rhythm, a rule above and padding around each block |
| `gwui-tile-grid`, `gwui-tile`, `gwui-tile-n`, `gwui-tile-txt`, `gwui-tile-good`, `gwui-tile-watch` | the "at a glance" row of four tiles, each a sentence rather than a bare figure (U.9 third review, item 2) | the marketing example report's own four-state row |
| `gwui-sr-parent`, `gwui-sr-why` | the cascade block: the bigger goal this one sits under, and why | one-session.txt's "This is part of a bigger goal" block |
| `gwui-sr-quotes`, `gwui-sr-quote`, `gwui-sr-cite` | a quote, and the sentence under it naming who said it (or, for a document, what kind of file it is) | one-session.txt's quoted lines, each with its own source line underneath |
| `gwui-sr-statement`, `gwui-sr-position` | a plain sentence row (the picture from everybody; what went quiet; a person's own position on an open topic) | one-session.txt's own prose rows |
| `gwui-sr-caption-label`, `gwui-sr-caption-text` | a small caption above its own sentence ("Why this matters", "What would settle it") | one-session.txt's "why it matters"/"what settles it" captions, re-read (U.9 review fix 12) as a caption over a sentence rather than a label joined by a colon |
| `gwui-sr-source-line` | the folded "lines this comes from", under an open topic | one-session.txt's own sourcing line |
| `gwui-sr-toggle-row`, `gwui-sr-muted-inline` | the row holding "Each person's own work, in their own words." beside the "Group by person"/"Group by theme" link | the card's own control row (no dedicated prototype class; the prototype does not carry this toggle) |
| `gwui-sr-item-title`, `gwui-sr-muted-prose` | a themed or per-person heading, and the sentence said when a group has nothing in it | one-session.txt's own grouped headings |
| `gwui-sr-grouped`, `gwui-sr-lines-gap`, `gwui-sr-picture-list`, `gwui-sr-definitions`, `gwui-sr-built-from`, `gwui-sr-rests-on-item`, `gwui-sr-agree-wrap` | the spacing between items inside a folded or grouped list | the card's own vertical rhythm, 8 to 16px between rows, the same scale every other shared part uses |
| `gwui-sr-section-note` | a short note under a themed group ("the lines this comes from" style of aside) | one-session.txt's own section notes |
| `gwui-sr-person-saying`, `gwui-sr-person-finding` | a person's own summary line, and (grouped by person) the product's own finding about their work, with an amber edge when there is a gap | one-session.txt's per-person material, grouped |
| `gwui-sr-footer`, `gwui-sr-footer-line` | the closing line: when it was last updated, and whether it is still forming or closed | team-report.txt's own "Last updated on..." line |

## Group 3's drift-list review, part 2 (continued): `Note` gains three tones

| Part | Property | Where it came from | Ours |
| --- | --- | --- | --- |
| `Note` `tone="amber"`/`"green"`/`"navy"` (`.gwui-note-amber`, `.gwui-note-green`, `.gwui-note-navy`) | colour | the check-in header's own one-sentence state line ("Your turn. It is 1 day late.", "Ended well.", "2 of 6 have not answered yet.") used page-only classes (`gwui-ink-amber`/`-green`/`-navy`/`-sub` combined with `gwui-fs-14`/`gwui-fs-13-5`) on `GroundAdminPage.tsx` for exactly this; `Note`'s own 13.5px size already matches the prototype's note size, so `amber`/`green` are the same colours `Tag`'s own `attention`/`proven` tones already draw from (`var(--gw-amber-t)`, `var(--gw-green-t)`), and `navy` is the same ink `Button`'s own primary colour already uses (`var(--gw-navy)`), each named as an option on the part that already exists for a plain sentence | added |

## Group 3's drift-list review, part 2 (continued): one centred-column class for two pages

| Part | Property | Where it came from | Ours |
| --- | --- | --- | --- |
| `.gwui-centered-column` | layout | `GroundAdminPage.tsx`'s and `GroundParticipantPage.tsx`'s own content column each carried a page-only `gwui-ml-auto gwui-mr-auto` pair (plus a one-off `gwui-pt-12`/`gwui-pt-16`) to centre the conversation's own narrow 600px reading column inside the page's wider, full-width header - the only width `Page` itself does not already cap, since this column sits a level under `Page`'s own 1150px wrap. One class, used by both pages identically, replaces the pair; the extra top padding is dropped, since `Page`'s own 30px rule between its direct children (the header, any notices, and this column) already gives the gap the one-off padding was adding a second time. | added |

## Group 3's drift-list review, part 2 (continued): `GroundParticipantPage.tsx`'s own header row

| Part | Property | Where it came from | Ours |
| --- | --- | --- | --- |
| `.gwui-status-row` | font-size, colour, padding | the participant's own check-in header row carried a page-only `gwui-fs-13 gwui-ink-muted gwui-pt-10 gwui-pb-12` combination for its one muted sentence plus the badges beside it (a guest check-in's own organisation, how it ended) | added, one named class in place of four one-off ones |
| `.gwui-note-navy`/`.gwui-note-green` reused as plain spans | colour | the same row's two badges (`gwui-ink-navy`, `gwui-ink-green`) used the same colours `Note`'s new tones already carry (see above); rather than keep the `gwui-ink-*` utility pair for these two spans, they use the already-documented `Note` tone classes directly | changed to reuse the existing part |

## Board task, batch 3 (Hafsah, 1 October: "the board's one-off classes become shared parts")

| Part | Property | Where it came from | Ours |
| --- | --- | --- | --- |
| `Stack` `gap={2}`/`gap={4}`/`gap={6}`/`gap={8}` (`.gwui-stack-2`, `.gwui-stack-4`, `.gwui-stack-6`, `.gwui-stack-8`) | spacing | the board's own tight runs inside one row or one panel each carried a one-off `gwui-mt-2`/`gwui-mt-4`/`gwui-mt-6`/`gwui-mt-8` on the element that followed (`where-each-person-is.tsx`'s target/says/ask lines, `TheSwitchboardsSections.tsx`'s sentence-and-caption rows, `PatternPanel.tsx`'s own paragraph run) | added, at the exact pixel values those classes already held |
| `Note` `tone="muted"` (`.gwui-note-muted`) | colour | several board rows carried a one-off `gwui-fs-13-5 gwui-ink-muted` pair for a caption fainter than `Note`'s own default `--gw-sub` (a person's "ask"/"finding" line, a blocker's history, a record row's caption, a switchboard section's because/also-waiting line) | added, the same 13.5px line in `--gw-muted` in place of the utility pair |
| `SubHeading` `tone="kicker"` (`.gwui-subheading-kicker`) | size, colour, spacing | `WhatTheRecordShows.tsx`'s own local `Head` component drew a 13.5px `--gw-sub` kicker, 18px above and 7px below, over each block of the lead's across-every-session read ("Settle these before deciding anything", "What people said they would do") | added, the same values as a named option on the existing heading part |

## Board task, batch 3, part 3 (Hafsah: "one-off value classes and page-only copies become the proper shared parts")

| Part | Property | Where it came from | Ours |
| --- | --- | --- | --- |
| `Callout` `tone="emphasis"` (`.gwui-callout-emphasis`) | size, colour, padding | `TheJudgement.tsx`'s own "the gap" box - the one sentence on the whole board a reader is meant to remember - carried a one-off blue tint, panel-level padding (20/22px) and a larger, bolder body (16px/600) than `Callout`'s own plain-sentence shape (10/14px padding, 14.5px body); the values are the box's own, not invented, since no prototype screen pictures this box (it answers a customer complaint about the report, not a pictured screen) | added, a named option in place of the one-off box |

## Board task, batch 3, part 5 (Hafsah: `Row` gets a named side-inset, in place of a wrapper div reusing one-off classes)

`Row` (`RowList`'s own row, no dedicated prototype class - see "batch 3" above) carries no side
padding of its own: `.gwui-row` is `padding: 12px 0`. Part 4 (`WorkRecords.tsx`, commit `d4cbeb2b`)
and part 4's own `BoardPage.tsx` work had each caller add that padding back by wrapping the row's
own content in a `<div className="gwui-pl-NN gwui-pr-NN">` - reusing the one-off utility classes
`gwui-pl-14`/`gwui-pr-14`/`gwui-pl-15`/`gwui-pr-15`/`gwui-pl-22`/`gwui-pr-22` the 1 October review
exists to clear, not a shared part. `Row` now takes an `inset` prop instead
(`client/src/components/gw/ui/Rows.tsx`), named for where each value comes from rather than its
pixel size, each its own class so none of them matches the one-off utility shape:

| Part | Property | Where it came from | Ours |
| --- | --- | --- | --- |
| `Row` `inset="panel"` (`.gwui-row-inset-panel`) | padding-left/right: 22px | the plain Panel's own inside, `.pad` in app.css (`padding: 20px 22px`) - for a row sitting directly under a `Panel` with no header strip of its own ("Where people differ"'s divergence items and agreements, `BoardPage.tsx`) | added, replacing the wrapper `div`'s one-off `gwui-pl-22 gwui-pr-22` pair |
| `Row` `inset="list"` (`.gwui-row-inset-list`) | padding-left/right: 15px | a sub-panel's own list, under its own 15px header strip ("What people are trying to do", "Places named", "What it is about", `BoardPage.tsx`) - the rows take the same 15px inset the header above them already uses, so the two line up | added, replacing the wrapper `div`'s one-off `gwui-pl-15 gwui-pr-15` pair |
| `Row` `inset="record"` (`.gwui-row-inset-record`) | padding-left/right: 16px | the board's own work-record lists (`WorkRecords.tsx`'s "Every deadline", "The parties", "Where next, ranked", "Your own ... day by day") | added, replacing the wrapper `div`'s one-off `gwui-pl-16 gwui-pr-16` pair |
| `Row` `inset="kicker"` (`.gwui-row-inset-kicker`) | padding-left/right: 14px | a `Panel` introduced by a kicker-toned `SubHeading` rather than its own header strip (`TheJudgement.tsx`'s "What the numbers say", "What to do", "What this cannot tell you") | added, replacing the wrapper `div`'s one-off `gwui-pl-14 gwui-pr-14` pair |

Where the wrapper `div` carried no other class or style, it is gone entirely (the content is `Row`'s
own direct children); where it also carried a style or an ARIA role (`WorkRecords.tsx`'s three
`role="row"`/`aria-label` rows), the `div` stays for that, with only the padding classes removed.
No wording or behaviour changed anywhere this touched - the four values are exactly what each
wrapper already held.

## Board task, batch 3, part 6 (Hafsah: `TargetsBand.tsx`'s own list gets `Row`'s `panel` inset, in place of a wrong one-off pair)

`TargetsBand.tsx`'s "Targets" list (`docs/prototype/screens/B2-context/context.txt`'s own targets
table, and G1's "Where each target stands") wrapped each row's content in a one-off
`gwui-pl-13 gwui-pr-13` pair - 13px, not read from the prototype. The prototype's own source
(`docs/prototype/source/s20.js`, the "Where each target stands" panel) wraps its target rows in
`.panel.pad` - app.css's `.pad { padding: 20px 22px }`, 22px side inset - with the row itself given
an inline `padding:10px 0` that removes its own side padding, so the panel's 22px is what actually
shows. That is exactly `Row`'s own `inset="panel"` (`client/src/components/gw/ui/Rows.tsx`, part 5
above), so no new named value was needed - `TargetsBand.tsx`'s row now takes `inset="panel"`,
replacing its one-off `gwui-pl-13 gwui-pr-13` pair. The row's own vertical padding (`gwui-pt-9
gwui-pb-9`, a value distinct from `Row`'s 12px rhythm) stays on the inner `div`, as the other insets
already do. No wording or behaviour changed.

## Board task, batch 3, part 7 (Hafsah: "What we are aiming for" onto RowList/Row and Callout, in BoardPage.tsx)

The targets section's own list (`BoardPage.tsx`, "What we are aiming for") drew each objective as a
plain `<div className="gwui-panel-row">` sibling (`.gwui-panel-row`, `padding: 20px 22px`, a border
between consecutive rows) rather than the shared `RowList`/`Row`. Each objective, and the lead's own
"Add target" form row, now sits inside a `RowList` as a `Row` with `inset="panel"` - the same named
value part 5 and part 6 already use for a row sitting directly under a `Panel` with no header strip
of its own. As with the "Where people differ" rows part 4/5 already converted this way, the vertical
rhythm becomes `Row`'s own 12px (from `.gwui-row`), not `gwui-panel-row`'s 20px: the same accepted
trade read off that earlier conversion, not a new decision. No row's wording or its controls (Lower,
Raise, Remove, Change, Confirm, "Use N") changed.

The two amber notices above the list (`b.targetsNobodyOwns`, `b.objectivesPrompt` - sentences the
server computes, not a pictured prototype screen) were a one-off box: `gwui-rule-amber` plus
`gwui-pt-10 gwui-pr-14 gwui-pb-10 gwui-pl-14` padding, an inline amber background and 10px radius,
15px text at 1.5 line-height. `Callout`'s own plain `tone="warning"` shape (`gw-ui.css`:
`background: var(--gw-amber-bg)`, `color: var(--gw-amber-t)`, `border-radius: 10px`, `padding: 10px
14px`, `font-size: 14.5px`, `line-height: 1.45`) already matches this box on every property but the
text's own size and line-height, each half a pixel and a hundredth off (15px/1.5 against 14.5px/1.45)
- not a value read from any pictured screen (this box answers a server computation, not a screen
`docs/prototype/screens` pictures), and `Callout` `tone="warning"` is already the part dozens of
other pages use for exactly this kind of amber instruction. It moves a pixel, as the task allows,
rather than adding a new named option for a difference nothing pictures. Both notices are now plain
`<Callout tone="warning">` calls, with no wrapper div.

Their own 8px gap (`gwui-mb-8` on each, when either or both are present, and before the `Panel`
below) is `Stack` `gap={8}` (`client/src/components/gw/ui/Stack.tsx`) - the named part for exactly
this run, not a one-off margin class or a wrapper div: `Stack` wraps the two conditional notices and
the targets `Panel` together, so the 8px lands between whichever of the three are actually rendered,
same as the per-element margins did, with nothing added before the first of them (`SplitOneTotalAcrossPeople`,
outside the `Stack`, keeps its own unchanged, margin-free spot in front).

## Board task, batch 3, part 8 (Hafsah: `TheParticipantsOwnView` and `MaybeFolded`, checked against the shared parts)

`MaybeFolded` (`client/src/pages/board/BoardPage.tsx`) draws nothing of its own - only `Folded`,
already a shared part - so it is unchanged.

`TheParticipantsOwnView` wrapped its `Panel` and `YourOwnRecordsSections` in a `<div
className="gwui-mt-16">` purely to carry one top margin before the whole block - a margin wrapper
with no other purpose, the pattern "never add... a margin wrapper" exists to stop. `Panel` already
takes a `className` (merged onto its own `gwui-panel`/`gwui-panel-pad` classes, `Panel.tsx`), so the
`gwui-mt-16` one-off class now sits directly on the `Panel` itself and the wrapper `div` is gone, in
favour of a plain fragment. Nothing else in either function reuses a one-off class in place of a
named part, or carries a style this batch's shared parts (`Row`'s insets, `Callout`, `Stack`) already
cover - the remaining one-off classes (`gwui-fs-16`/`gwui-ink-dark` with an inline `fontWeight: 700`,
`gwui-fs-15`/`gwui-ink-sub` with an inline `lineHeight`, `gwui-mt-4`/`gwui-mt-10`) are the same plain
text-and-spacing convention used the same way everywhere else on this board, not a wrapper standing
in for a part that already exists, so they are left as they were. No wording or behaviour changed.

## Board task, batch 3, part 7 (follow-up): a bare `Button` inside `Row` kept its own width

The picture check after part 7 caught a real regression `the-rebuilt-pages-use-only-the-new-parts`
and the vitest run could not: on a target with no edit controls open, "Change" (the quiet button
that opens them) stretched edge to edge of the row and sat centred in the middle of the line,
instead of left-aligned under the target's own name. `Row`'s grid defaults every direct child to
`justify-items: stretch` - needed so a plain `div` of stacked content (every other row on this
board) fills the row's own width - but a bare `Button` has no content needing the full width, and
its own `justify-content: center` (`gw-ui.css`'s `.gwui-btn`) then centred its label inside the
stretched box. This is the same symptom `.gwui-person-row`'s own `justify-items: start` already
names a few hundred lines up ("a Tag or a short line keeps its own natural width - the grid must
not stretch it across the whole column"), on a part this batch is the first to put a bare button
inside. Fixed with `.gwui-row > .gwui-btn { justify-self: start; }` - scoped to `.gwui-btn` only,
so it touches nothing else that already relies on `Row`'s own stretch. Checked against the 1440px
picture of the sales board (`boards-after3e`, rukia and amani) and both u7lead founder's-own-targets
boards: "Change" now sits under the target's name exactly as the prototype and the pre-change
product both draw it.

## Board task, batch 3, part 9 (Hafsah: "The team today" checked against the shared parts)

`BoardPage.tsx`'s "The team today" section (`Section heading="The team today"`, around
`WhereEachPersonIs`) was already rebuilt from the shared parts in an earlier pass (commit
`1e7a8108`, "Board (c1): the insides, top down to `The team today`, from the shared parts") - it is
only a `Section` wrapping `WhereEachPersonIs` (`components/gw/where-each-person-is.tsx`), with no
one-off class of its own anywhere in `BoardPage.tsx`. Checked again for this batch, against
`board-as-lead.txt`'s own "The team today / Each person's line, their last 10 check-ins, and what
keeps coming up": the heading, the note and the row-by-row content (name, summary, reason tag, last
ten squares, "what keeps coming up") all match. Nothing in `BoardPage.tsx` changed - the section
already has nothing left for this task to do. (`where-each-person-is.tsx` itself still carries a
handful of one-off classes of its own - out of scope here, since that file is not `BoardPage.tsx`
and this task's count only tracks `BoardPage.tsx`.)


## Board task, batch 3, part 10 (Hafsah: "What keeps coming up" onto RowList/Row and SubHeading)

`BoardPage.tsx`'s "What keeps coming up" section (board-as-lead.txt: "Named after three check-ins
in a row, never after one. Each describes the work") drew its empty state, each group's bold label,
and each pattern as plain `<div className="gwui-panel-row">` siblings - the same drift parts 5-7
already found and fixed in "Where people differ" and "What we are aiming for". The empty state and
each `PatternPanel` now sit inside a `RowList` as a `Row` with `inset="panel"`, the same named value
used throughout this batch for a row sitting directly under a `Panel` with no header strip of its
own. Every piece stays, for exactly the readers it already reaches - both parts ("About each
person's work" and "How what people say can run ahead of what happened"), the lead's own "coach
towards" and "one step" (inside `PatternPanel`, unchanged), and the second read and "talked through"
notes (also inside `PatternPanel`, unchanged) - this task only touches the list structure around
each pattern in `BoardPage.tsx`, never `PatternPanel.tsx` itself.

Each group's bold label ("About each person's work", "How what people say can run ahead of what
happened") was a one-off `gwui-fs-13-5 gwui-ink-dark` pair with an inline `fontWeight: 700` - a
label over one fact inside a panel, exactly what `SubHeading` (`components/gw/ui/SubHeading.tsx`)
already names ("the prototype's other kind of heading... used for a short label over one fact
inside a panel rather than over a whole page section"). No new tone was needed: the label is now a
plain `<SubHeading>`, which also matches the prototype's own source for this panel more closely
than the one-off pair did (`docs/prototype/source/s7.js`'s `patternsSec`: `<b class="t-small mut"
style="padding-bottom:6px">`, a bold label with space below and no space above it - `SubHeading`'s
own default margin is `0 0 6px`, nothing above, the same shape). The trailing italic footer note
("Patterns about the work only...") is unchanged, including its own remaining one-off classes,
which are a dashed rule and padding this batch's shared parts do not name and which this task does
not touch.

The footer note sits outside the `RowList`, as a sibling inside the same `Panel`, same as the
"Where people differ" section's own structure (part 5) keeps its extra content (the central
question) outside that section's `RowList` too. No wording, no behaviour and nothing any reader
sees changed - only the markup each row and label is built from.

## Board task, batch 3, part 11 (Hafsah: Blockers and the switchboard sections drawn inline in BoardPage.tsx)

`BlockersSection` (`client/src/pages/board/TheSwitchboardsSections.tsx`) is already built from the
shared parts: one `Stack gap={10}` of `Panel` cards, unchanged by this task. What was still in
BoardPage.tsx was its own close cousin, "Waiting on" (board-as-lead.txt's own `dependencies`, drawn
inline here rather than extracted to that file): the same one card per handoff, wrapped in a plain
`<div className="gwui-gap-10" style={{display: 'flex', flexDirection: 'column'}}>` - the one-off
version of exactly the `Stack` `BlockersSection` already uses for the same shape of list, one card
after another with a 10px gap. That wrapper is now `Stack gap={10}`, nothing else - each card's own
contents (the status pill, "Waiting on:", the sentence, the blue "then" quote) stay exactly as they
were, matching `BlockersSection`'s own remaining one-off classes for its equivalent fields (`Note`
with a bold label, a flex header row for the title and tag), which this task leaves alone since the
"done" reference file keeps them the same way.

BoardPage.tsx's one-off count drops from 597 to 596 (one-off-uses-per-file.ts updated to match). No
wording or behaviour changed.

## Phone check, item 6: `.gwui-work-group-row` (sales deal grid group heading)

The sales deal grid's group heading row ("Possible", "Won", each with its reason - board-as-lead.txt)
sat flush on the card's left border and ran into its rounded corner at 375px: `Panel pad={false}`
leaves the grid unpadded, and every row above and below the group heading carries its own 16px
left/right inset (`SalesDealGridHead`'s `WORK_HEAD_CLASS`, `SalesDealGridRow`), but the group row
itself had none. New part `.gwui-work-group-row` (gw-ui.css, by `WORK RECORDS TABLE`): `padding: 10px
16px 6px`, the same 16px each side as the header row, 10px above and 6px below. Used once, on the
group row in `WorkRecords.tsx` (`dealGroups.map`). Not an inline style - `WorkRecords.tsx` is a
rebuilt page, where `the-rebuilt-pages-use-only-the-new-parts.spec.ts` fails any inline
`padding`/`margin`/`color`/`fontSize`/`gap` - and not one of the atomic one-off `gwui-pt-*` etc.
classes, which `one-off-uses-only-go-down.spec.ts` freezes the per-file count of.
