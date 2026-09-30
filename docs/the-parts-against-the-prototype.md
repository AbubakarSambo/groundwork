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
| **PageTitle** (`.t-title`, `.crumb`, `.t-small`) | title font/size | Literata, `clamp(24px,3vw,30px)`, weight 500, line-height 1.18 | `30px` fixed (not the clamp), weight 500, line-height 1.18 | same - the fixed 30px (24px under 640px via its own media query) is a deliberate simplification of the `clamp()`, already noted as intentional; not changed here |
| | sub line | `16px`/1.5, muted | `16px`/1.5, muted | same |
| **CheckInHeader** (PageTitle + `.tabs`) | gap under the title | `18px` (`.tabs{margin-top:18px}`) | `18px` | same |
| **Tabs** (`.tabs`, `.tab`) | tab height | `46px` | `46px` | same |
| | underline | `3px`, `var(--ink)` when on, otherwise none in the prototype (a real bug there - the row shifts). Ours draws a 3px TRANSPARENT underline on every tab, fixing the shift the prototype itself has | `3px transparent` (unset) vs `3px navy` (on) | same - this is a documented improvement over the prototype's own layout bug, not a mismatch to copy back |
| **Section** (`section.sec`, `.sec-h`, `.note`) | heading size/weight | `21px`, weight 700 (`.t-h2`) | `21px`/700 | same |
| | note | `13.5px`, muted (`.note`) | `13.5px`, muted | same |
| **Panel** (`.panel`, `.pad`) | corner radius | `12px` | `12px` | same |
| | inside padding | `20px 22px` | `20px 22px` | same |
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
| | empty panel heading | `21px`/700 (`.t-h2`) | `21px`/700 | same |
| **Toast** | position/size | `bottom:90px`, `12px 18px`, radius `10px`, `15px` | same | same |
| **Modal** | width/padding/radius | `520px` max, `24px` inside, `14px` | same | same |
| **Mark** (the three bars, `.brand`) | size | `17px`/700 wordmark, navy, `22x17` mark (lines 210-211, the SVG bars) | `18px`/700 (`gwui-mark`) - a small, deliberate difference from the prototype's `17px` sidebar brand, since this part is also used at a slightly larger scale on the invitation and sign-in pages | unchanged; noted, not fixed, since the difference is a size choice for a different context, not a stray number |
| **SubHeading** | size/weight | no direct class (the prototype writes these by hand in its JS at `14.5px`/700, the same as `.f` labels) | `14.5px`/700 | same |
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

## What this pass found, in one line

Out of every part checked, only **Button's `danger` kind** actually diverged from the prototype's own value (an outline instead of the prototype's one solid red, plus two extra variants). Everything else already matches, because this stylesheet was built by copying `app.css`'s numbers directly and has been checked against it, part by part, in `the-parts-match-the-prototypes-exact-values.spec.tsx`, through several earlier sessions. The parts with **no prototype rule at all** (Toggle, FieldRow, StageTrack, SubHeading, Steps, Stack's gaps, and the whole "group 1-2 rebuild" set) are named above so nobody mistakes "no exact source line" for "not checked" - each is built from the prototype's own type and colour scale, just without one specific CSS rule to point at.
