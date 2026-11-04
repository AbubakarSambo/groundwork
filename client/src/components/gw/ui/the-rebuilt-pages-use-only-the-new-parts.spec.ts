import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'
import { REBUILT_PAGES } from './rebuilt-pages'

/**
 * A REBUILT PAGE USES ONLY THE NEW PARTS (design-audit.md section 4, step 3: "the guard test").
 *
 * `REBUILT_PAGES` (./rebuilt-pages.ts) starts empty and grows one entry at a time, as each screen
 * is rebuilt from `components/gw/ui`. From the moment a page is listed, this spec fails the build
 * if that file imports one of kit.tsx's old parts (`Zone`, `Sec`, `Card`, `Row`, `Pill`, `Stat`,
 * `btn`, `btnGhost`, `miniBtn`) or writes one of the old CSS classes (`gw-btn`, `gw-input`,
 * `gw-ttl`, `gw-pill`, `gw-prow`, `gw-er`, `gw-sub-t`, `gw-sec`, `gw-card`, `gw-label`, `cg-*`)
 * again.
 *
 * THE OLD PARTS ALSO HIDE ONE IMPORT AWAY (Hafsah's first review, U.20 sixth round): `InvitePage`
 * passed every check above while `LinkProblem` - a component it imports and renders directly -
 * still drew a 40px `gw-btn` and a 13px `gw-note`. A page can be clean and still show old parts if
 * something it renders is not. So this now also reads, one level deep, every local component a
 * listed page imports from `@/components/gw/...`, and fails the same way if THAT file uses an old
 * part - which is what caught `LinkProblem` and is what keeps a future import like it from hiding
 * again.
 *
 * NO INLINE SIZE, COLOUR OR SPACING EITHER. The same review found `fontSize: 21`, four
 * `marginBottom`s, a footer's `paddingTop`/`borderTop` and a `display: grid, gap: 14` written
 * straight into `InvitePage.tsx` and `InvitationExpired.tsx` - technically not an old class, but
 * exactly the thing `rebuilt-pages.ts`'s own comment already asked for ("no inline styles for
 * size, colour or spacing"), just never checked. This now fails on `style={{ }}` that sets
 * `fontSize`, `color`, any `margin*`/`padding*`/`border*`, or `gap`/`rowGap`/`columnGap`, on a
 * listed page. `textAlign` is not one of these - it is alignment, not size, colour or spacing.
 *
 * COMMENTS ARE STRIPPED FIRST. A source file that only MENTIONS an old name inside a comment - "do
 * not use gw-btn here" - must not trip this, and a source file that uses the old name for real must
 * not hide behind a comment that happens to contain the new one. See
 * api/src/a-guard-that-a-comment-satisfies-is-not-a-guard.spec.ts for why this matters: a guard
 * that reads comments as code is a guard a stray sentence can satisfy.
 */
const SRC_ROOT = join(__dirname, '..', '..', '..') // client/src

const OLD_KIT_NAMES = ['Zone', 'Sec', 'Card', 'Row', 'Pill', 'Stat', 'btn', 'btnGhost', 'miniBtn']
const OLD_CSS_CLASSES = ['gw-btn', 'gw-input', 'gw-ttl', 'gw-pill', 'gw-prow', 'gw-er', 'gw-sub-t', 'gw-sec', 'gw-card', 'gw-label']
/** `fontSize`, `color`, any `margin*`/`padding*`/`border*`, `gap`/`rowGap`/`columnGap` - never `textAlign`. */
const BANNED_STYLE_PROPS = /^(fontSize|color|margin\w*|padding\w*|border(Top|Bottom|Left|Right)?|gap|rowGap|columnGap)$/

export function stripComments(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^\s*\/\/.*$/gm, ' ')
}

/** Imports from a path ending in `/kit` (kit.tsx), wherever it is written: './kit', '../gw/kit', '@/components/gw/kit'. */
export function namesImportedFromKit(stripped: string): string[] {
  const found: string[] = []
  const re = /import\s*\{([^}]*)\}\s*from\s*['"][^'"]*\/kit['"]/g
  let m: RegExpExecArray | null
  while ((m = re.exec(stripped))) {
    for (const raw of m[1].split(',')) {
      const name = raw.trim().split(/\s+as\s+/)[0].trim()
      if (name) found.push(name)
    }
  }
  return found
}

/**
 * GROUP 3, PIECE 2 FIX: A CSS CUSTOM PROPERTY IS NOT A CLASS.
 *
 * Plain substring matching flagged `var(--gw-card)` - a real, shared colour token several
 * already-rebuilt components reference (`HowSpecificThisSessionWas.tsx`, `WhatToWorkOnNext.tsx`
 * and others `SessionReportPage.tsx` draws) - as the old class `gw-card`, because `--gw-card`
 * contains that exact substring. A token is never a class, so a match preceded by `-` (the custom
 * property's own leading dashes) is not one. Nothing is checked after the name: an old class with
 * a longer name built on it (`gw-card-head`) is still the old kit, and is still caught.
 */
export function oldClassesUsed(stripped: string): string[] {
  const found = OLD_CSS_CLASSES.filter(c => new RegExp(`(?<!-)${c}`).test(stripped))
  if (/\bcg-[\w-]+/.test(stripped)) found.push('cg-*')
  return found
}

/**
 * Local components a page imports from `@/components/gw/...` (never `.../gw/ui`, which is the new
 * kit itself), resolved to a file under `client/src`. One level - what the page itself imports,
 * not what THAT file goes on to import.
 */
export function gwComponentImportPaths(stripped: string): string[] {
  const found: string[] = []
  const re = /from\s*['"]@\/components\/gw\/([^'"]+)['"]/g
  let m: RegExpExecArray | null
  while ((m = re.exec(stripped))) {
    const rel = m[1]
    if (rel === 'ui' || rel.startsWith('ui/') || rel.startsWith('ui.')) continue
    found.push(`components/gw/${rel}`)
  }
  return found
}

function readGwComponent(relNoExt: string): string | null {
  for (const ext of ['.tsx', '.ts']) {
    try {
      return readFileSync(join(SRC_ROOT, `${relNoExt}${ext}`), 'utf8')
    } catch { /* try the next extension */ }
  }
  return null
}

/** Every prop name inside every `style={{ ... }}` in the source, whether or not it is banned. */
export function inlineStylePropNames(stripped: string): string[] {
  const found: string[] = []
  const re = /style=\{\{([^}]*)\}\}/g
  let m: RegExpExecArray | null
  while ((m = re.exec(stripped))) {
    for (const name of m[1].match(/[A-Za-z]+(?=\s*:)/g) ?? []) found.push(name)
  }
  return found
}

export function bannedInlineStyleProps(stripped: string): string[] {
  return inlineStylePropNames(stripped).filter(p => BANNED_STYLE_PROPS.test(p))
}

/** Scans forward from `start` (the char after an opening `{`) to its matching `}`, honouring
    strings and nested braces. Returns the index just past that closing `}`. */
function matchBrace(src: string, start: number): number {
  let depth = 1
  let inStr: string | null = null
  let j = start
  while (j < src.length && depth > 0) {
    const c = src[j]
    if (inStr) {
      if (c === '\\') { j += 2; continue }
      if (c === inStr) inStr = null
      j++; continue
    }
    if (c === "'" || c === '"' || c === '`') { inStr = c; j++; continue }
    if (c === '{') depth++
    else if (c === '}') depth--
    j++
  }
  return j
}

/** Every `style={ ... }` expression's raw text (the part between the outer braces), whatever it
    is - a literal object, a ternary between two, an identifier, or a spread. */
export function styleExprs(stripped: string): string[] {
  const found: string[] = []
  const marker = 'style={'
  let i = 0
  while (true) {
    const idx = stripped.indexOf(marker, i)
    if (idx === -1) break
    const start = idx + marker.length
    const end = matchBrace(stripped, start)
    found.push(stripped.slice(start, end - 1))
    i = end
  }
  return found
}

/** Every top-level `{ ... }` chunk inside a string (brace-balanced, not just up to the first `}` -
    a ternary's two branches, say), each chunk's own inner text. */
function topLevelBraceChunks(s: string): string[] {
  const found: string[] = []
  let i = 0
  while (i < s.length) {
    const idx = s.indexOf('{', i)
    if (idx === -1) break
    const end = matchBrace(s, idx + 1)
    found.push(s.slice(idx + 1, end - 1))
    i = end
  }
  return found
}

/** `const NAME = { ... }` / `const NAME: React.CSSProperties = { ... }`, name -> its own body text,
    read from the whole file (a style constant a listed page, or something it imports, defines and
    then passes as `style={NAME}` or spreads into one - see `bannedStyleReferenceProps`). */
export function localObjectConstants(stripped: string): Record<string, string> {
  const out: Record<string, string> = {}
  const re = /const\s+([A-Za-z_$][\w$]*)\s*(?::[^=]+)?=\s*\{/g
  let m: RegExpExecArray | null
  while ((m = re.exec(stripped))) {
    const start = m.index + m[0].length
    const end = matchBrace(stripped, start)
    out[m[1]] = stripped.slice(start, end - 1)
  }
  return out
}

/**
 * U.10 (g), HER REVIEW: "style={SOME_CONSTANT} (and style={someObject}, or a spread) is not
 * caught, only style={{ }}." `bannedInlineStyleProps` only ever matched a `style={{` immediately
 * followed by `{` - a ternary between two object literals (`style={cond ? {...} : {...}}`), a
 * bare reference to a `const` object (`style={CARD}`), or a spread of one into a literal
 * (`style={{...CARD, cursor: 'pointer'}}`) all read the expression as starting with something
 * other than `{{`, so none of them were ever inspected. This resolves every `style={...}` that
 * ISN'T a plain literal: any object literal branch written directly inside it (a ternary's two
 * sides), and any bare identifier in it that names a local `const` object, checked against that
 * object's own definition wherever it sits in the file.
 */
export function bannedStyleReferenceProps(stripped: string): string[] {
  const consts = localObjectConstants(stripped)
  const bannedKeysIn = (body: string) => (body.match(/[A-Za-z]+(?=\s*:)/g) ?? []).filter(p => BANNED_STYLE_PROPS.test(p))
  const found: string[] = []
  for (const expr of styleExprs(stripped)) {
    const trimmed = expr.trim()
    const chunks = topLevelBraceChunks(expr)
    /* A single plain literal - the whole expression is exactly one `{ ... }`, nothing else beside
       it (no ternary, no spread) - is what `style={{ }}` already means, and `bannedInlineStyleProps`
       above already checks it directly on every LISTED page. Re-flagging it here too would widen
       the one-level-deep check (which this function feeds) to cover every ordinary inline style in
       every file a listed page imports - far beyond the gap HER REVIEW named (a style CONSTANT,
       OBJECT reference, ternary or spread standing in for one). So a lone literal with no spread is
       skipped here; a ternary between two literals, a bare identifier, or a spread is not - none of
       those read as a single plain `{ ... }` covering the whole expression. */
    const isSinglePlainLiteral = chunks.length === 1 && trimmed === `{${chunks[0]}}` && !trimmed.includes('...')
    if (!isSinglePlainLiteral) {
      for (const chunk of chunks) found.push(...bannedKeysIn(chunk))
    }
    for (const ident of expr.match(/[A-Za-z_$][\w$]*/g) ?? []) {
      if (consts[ident]) found.push(...bannedKeysIn(consts[ident]))
    }
  }
  return found
}

/**
 * U.10 (e), HER REVIEW: "moving the old sizes into classes named after their pixel values
 * satisfies the guard's letter, not its purpose... nothing smaller than 13 pixels." Every
 * `font-size` a rebuilt page's source names - inline (already banned above, whatever its value)
 * or as CSS text of its own - and every one gw-ui.css itself declares, must be at least 13px, the
 * prototype's own floor (`t-tiny`, "only for table column names and a person's level").
 */
export function tooSmallFontSizes(stripped: string): number[] {
  const found: number[] = []
  const re = /font-size:\s*([\d.]+)px/g
  let m: RegExpExecArray | null
  while ((m = re.exec(stripped))) {
    const px = parseFloat(m[1])
    if (px < 13) found.push(px)
  }
  return found
}

/**
 * AT MOST ONE PRIMARY (NAVY) BUTTON PER SCREEN (Hafsah, 30 September: "at most one primary
 * button per screen... no more buttons than the prototype's own version of that screen has").
 * The e2e test (e2e/the-prototype-count-of-buttons.spec.ts) checks this live, as each reader,
 * against what actually renders - but it can only run against the screens it opens. This is the
 * cheap, always-on half: a static count of every `<Button`/`<UIButton` OPENING TAG a listed
 * page's own source writes, over `kind="primary"` or no `kind` at all (the shared Button's
 * default, `Button.tsx`: `kind = 'primary'`).
 *
 * A page may still WRITE more than one - two branches of an `if`/ternary that never render
 * together (a "before" and "after" state of the same row) are not two buttons on screen at once.
 * Rather than try to prove that from the source, a file that means this marks it, once, with a
 * plain comment containing the literal text `PRIMARY-BUTTONS-NEVER-TOGETHER:` followed by which
 * ones and why - the marker is the file's own claim, checked by whoever reviews it, not by this
 * script. A file with no such marker must never write more than one.
 */
export function primaryButtonOpenTags(rawSource: string): string[] {
  const stripped = stripComments(rawSource)
  const found: string[] = []
  const re = /<(Button|UIButton)\b/g
  let m: RegExpExecArray | null
  while ((m = re.exec(stripped))) {
    const start = m.index
    let j = m.index + m[0].length
    let depth = 0
    let inStr: string | null = null
    while (j < stripped.length) {
      const c = stripped[j]
      if (inStr) {
        if (c === '\\') { j += 2; continue }
        if (c === inStr) inStr = null
        j++; continue
      }
      if (c === "'" || c === '"' || c === '`') { inStr = c; j++; continue }
      if (c === '{') { depth++; j++; continue }
      if (c === '}') { depth--; j++; continue }
      if (c === '>' && depth === 0) { j++; break }
      j++
    }
    found.push(stripped.slice(start, j))
  }
  return found
}

export function primaryButtonCount(rawSource: string): number {
  return primaryButtonOpenTags(rawSource).filter((tag) => {
    if (/kind\s*=\s*["']primary["']/.test(tag)) return true
    return !/kind\s*=/.test(tag)
  }).length
}

describe('a rebuilt page never falls back to the old parts', () => {
  /*
   * WAS: "the rebuilt-pages list starts empty, and this task adds no page to it" - true of the
   * task that built this guard and nothing else. The invitation task (design-audit.md section 3)
   * is the first screen rebuilt from these parts, so the list now names it; this spec's job is to
   * keep proving that every listed page stays off the old parts, not to keep the list at zero.
   */
  it('names the pages rebuilt so far', () => {
    expect(REBUILT_PAGES).toEqual([
      'pages/invite/InvitePage.tsx',
      'pages/invite/InvitationExpired.tsx',
      'pages/join/WaitingForAnAdminPage.tsx',
      'pages/grounds/OutOfTime.tsx',
      'pages/org/OrgMembersPage.tsx',
      'pages/org/WaitingToBeLetIn.tsx',
      'pages/org/EveryoneHere.tsx',
      'pages/org/InvitePeople.tsx',
      'pages/org/WhoCanJoin.tsx',
      'pages/org/TheInviteLink.tsx',
      'pages/org/WhoCanOpenACheckIn.tsx',
      'pages/org/OnePersonPage.tsx',
      'pages/grounds/CheckInPeopleAndSetup.tsx',
      'pages/grounds/PeopleAndSetupAsPictured.tsx',
      'pages/grounds/YourPeopleAndSetup.tsx',
      'pages/grounds/ReferencesAndResources.tsx',
      'components/gw/ItsEvidence.tsx',
      'pages/grounds/MyWorkPage.tsx',
      'pages/board/BoardPage.tsx',
      'pages/board/WorkRecords.tsx',
      'components/gw/where-each-person-is.tsx',
      'components/gw/WhatTheRecordShows.tsx',
      'components/gw/TheJudgement.tsx',
      'components/gw/WhatTheNetworkSaid.tsx',
      'components/gw/HowThisHasMoved.tsx',
      'components/gw/ResolutionPanel.tsx',
      'components/gw/TheSessionsReport.tsx',
      'components/gw/split-one-total-across-people.tsx',
      'components/gw/WhatSuccessLooksLike.tsx',
      'components/gw/TargetsBand.tsx',
      'components/gw/Suggestions.tsx',
      'components/gw/how-it-is-going.tsx',
      'components/gw/what-to-settle-together.tsx',
      'components/gw/a-second-press-before-it-is-gone.tsx',
      'components/gw/TheOtherBoardsYouAreIn.tsx',
      'pages/settings/SettingsPage.tsx',
      'pages/more/MorePage.tsx',
      'pages/connections/WhatsAppSetupPage.tsx',
      'pages/connections/ConnectionsPage.tsx',
      'pages/billing/BillingPage.tsx',
      /* Group 1's last page (30 September): "Connect your own tools", #/settings/tools - see the
         comment at the top of IntegrationsPage.tsx for what was kept, folded, and left out. */
      'pages/org/IntegrationsPage.tsx',
      /* Group 2's first piece: Today and the check-ins list (C1-today-and-check-ins). See the
         comment on REBUILT_PAGES in rebuilt-pages.ts. */
      'pages/today/TodayPage.tsx',
      'pages/today/YouAreIn.tsx',
      'pages/grounds/GroundsListPage.tsx',
      'pages/grounds/an-admin-lands-on-a-check-in-list.tsx',
      /* Group 2, piece 2: the You board (C2-the-you-board). */
      'pages/you/YouPage.tsx',
      /* Group 2, piece 3: the Company page and company context (D2-company). */
      'pages/company/CompanyPage.tsx',
      'pages/company/CompanyContextPage.tsx',
      /* Group 2, piece 4: the Suites page and each suite's board (E-suites). */
      'pages/suites/SuitesPage.tsx',
      'pages/suites/OnboardingBoardPage.tsx',
      'pages/suites/LeaveBoardPage.tsx',
      'pages/suites/TimeSheetsPage.tsx',
      'pages/suites/ReviewsBoardPage.tsx',
      'pages/suites/ReviewPage.tsx',
      'pages/suites/LeavingBoardPage.tsx',
      'pages/suites/RoleMapPage.tsx',
      'pages/suites/SpendingPage.tsx',
      'pages/suites/FinancePage.tsx',
      'pages/suites/TodosPage.tsx',
      'pages/suites/CustomersPage.tsx',
      'pages/suites/EquipmentPage.tsx',
      /* Group 3's first piece: signing in and joining (A2, A3). See the comment on
         REBUILT_PAGES in rebuilt-pages.ts. */
      'pages/auth/auth-kit.tsx',
      'pages/auth/AuthPage.tsx',
      'pages/auth/MagicVerifyPage.tsx',
      'pages/join/JoinPage.tsx',
      'pages/report/SessionReportPage.tsx',
      /* 'pages/report/ReportPage.tsx' came off this list 1 October 2026 - see rebuilt-pages.ts. */
      /* Group 3, piece 3: the check-in conversation (B3-the-check-in). See the comment on
         REBUILT_PAGES in rebuilt-pages.ts. */
      'pages/chat/ChatPage.tsx',
      'components/gw/checkin/TheCheckInHeader.tsx',
      'components/gw/checkin/TheEndCard.tsx',
      /* Group 3, piece 4: starting a check-in (B1-starting-a-check-in). See the comment on
         REBUILT_PAGES in rebuilt-pages.ts. */
      'pages/home/SaveCard.tsx',
      /* Group 3, piece 4 (continued, 4d-4): EntryChatPage.tsx itself. See the comment on
         REBUILT_PAGES in rebuilt-pages.ts. */
      'pages/enter/EntryChatPage.tsx',
      'pages/grounds/GroundAdminPage.tsx',
      'components/gw/ContextPage.tsx',
      'pages/grounds/GroundParticipantPage.tsx',
      /* Board task, batch 3 (Hafsah, 1 October): "the board's one-off classes become shared
         parts". See the comment on REBUILT_PAGES in rebuilt-pages.ts. */
      'pages/board/CheckInLinks.tsx',
      /* Board task, batch 3, part 2. See the comment on REBUILT_PAGES in rebuilt-pages.ts. */
      'components/gw/where-each-person-is.tsx',
      'pages/board/TheSwitchboardsSections.tsx',
      'components/gw/ui/PatternPanel.tsx',
      'components/gw/WhatTheRecordShows.tsx',
      'components/gw/OutcomeFeedback.tsx',
      /* U.20 (F4-small-states). See the comment on REBUILT_PAGES in rebuilt-pages.ts. */
      'pages/notfound/NotFoundPage.tsx',
      'components/gw/PageCrash.tsx',
      'components/gw/GroundGone.tsx',
    ])
  })

  it('every listed page imports none of the old kit parts, and writes none of the old classes', () => {
    const offenders: string[] = []
    for (const relPath of REBUILT_PAGES) {
      const full = join(SRC_ROOT, relPath)
      const stripped = stripComments(readFileSync(full, 'utf8'))

      const badImports = namesImportedFromKit(stripped).filter(n => OLD_KIT_NAMES.includes(n))
      if (badImports.length > 0) {
        offenders.push(`${relPath}: imports old kit part(s) ${badImports.join(', ')}`)
      }

      const badClasses = oldClassesUsed(stripped)
      if (badClasses.length > 0) {
        offenders.push(`${relPath}: uses old class(es) ${badClasses.join(', ')}`)
      }
    }
    expect(offenders).toEqual([])
  })

  it('nothing a listed page imports from components/gw uses an old part either, one level deep', () => {
    const offenders: string[] = []
    for (const relPath of REBUILT_PAGES) {
      const stripped = stripComments(readFileSync(join(SRC_ROOT, relPath), 'utf8'))
      for (const importedRel of gwComponentImportPaths(stripped)) {
        const src = readGwComponent(importedRel)
        if (src === null) continue // an import that does not resolve to a file is not this guard's problem
        const importedStripped = stripComments(src)

        const badImports = namesImportedFromKit(importedStripped).filter(n => OLD_KIT_NAMES.includes(n))
        if (badImports.length > 0) {
          offenders.push(`${relPath} imports ${importedRel}, which imports old kit part(s) ${badImports.join(', ')}`)
        }
        const badClasses = oldClassesUsed(importedStripped)
        if (badClasses.length > 0) {
          offenders.push(`${relPath} imports ${importedRel}, which uses old class(es) ${badClasses.join(', ')}`)
        }
        /* U.10 (g): the style-reference gap applies one level deep too - a listed page can pass a
           `const` object it imports straight through as another component's `style={}`. */
        const badStyleRefs = bannedStyleReferenceProps(importedStripped)
        if (badStyleRefs.length > 0) {
          offenders.push(`${relPath} imports ${importedRel}, which sets ${[...new Set(badStyleRefs)].join(', ')} through a style reference`)
        }
      }
    }
    expect(offenders).toEqual([])
  })

  it('no listed page sets font size, colour, margin, padding or gap with an inline style', () => {
    const offenders: string[] = []
    for (const relPath of REBUILT_PAGES) {
      const stripped = stripComments(readFileSync(join(SRC_ROOT, relPath), 'utf8'))
      const bad = bannedInlineStyleProps(stripped)
      if (bad.length > 0) offenders.push(`${relPath}: inline style(s) ${[...new Set(bad)].join(', ')}`)
    }
    expect(offenders).toEqual([])
  })

  /**
   * U.10 (g), HER REVIEW: THE SAME RULE, FOR A STYLE THAT IS NOT A PLAIN `{{ }}` LITERAL. A
   * `const` object passed as `style={NAME}`, a ternary between two object literals, or one
   * spread into another (`style={{...NAME, cursor: 'pointer'}}`) can all carry the very same
   * banned properties the test above catches for a plain literal - and none of them were being
   * read at all. See `bannedStyleReferenceProps`.
   */
  it('no listed page sets font size, colour, margin, padding or gap through a style constant, object, ternary or spread either', () => {
    const offenders: string[] = []
    for (const relPath of REBUILT_PAGES) {
      const stripped = stripComments(readFileSync(join(SRC_ROOT, relPath), 'utf8'))
      const bad = bannedStyleReferenceProps(stripped)
      if (bad.length > 0) offenders.push(`${relPath}: style reference(s) carrying ${[...new Set(bad)].join(', ')}`)
    }
    expect(offenders).toEqual([])
  })

  /**
   * U.10 (e): NOTHING SMALLER THAN 13 PIXELS, ANYWHERE A LISTED PAGE'S OWN TEXT SIZE IS SET.
   * Her review: a page can move its old, too-small sizes into named classes and still read as
   * dense as it did before - the guard's letter satisfied, its purpose (a rebuilt page reads like
   * the prototype) missed entirely. A listed page's inline `fontSize` is already banned outright
   * above, whatever its value; this also refuses any `font-size` CSS text the page carries below
   * the prototype's own floor (`t-tiny`, 13px - "only for table column names and a person's
   * level"), so a future class name that happens to hide a smaller number cannot pass either.
   */
  it('no listed page sets a text size smaller than 13 pixels', () => {
    const offenders: string[] = []
    for (const relPath of REBUILT_PAGES) {
      const stripped = stripComments(readFileSync(join(SRC_ROOT, relPath), 'utf8'))
      const small = tooSmallFontSizes(stripped)
      if (small.length > 0) offenders.push(`${relPath}: font-size(s) below 13px: ${[...new Set(small)].join(', ')}`)
    }
    expect(offenders).toEqual([])
  })

  /**
   * AT MOST ONE PRIMARY BUTTON. See `primaryButtonCount` above for what counts and how a page
   * marks a genuine either/or pair as not-really-two.
   *
   * SHRUNK TO EMPTY (Hafsah, 30 September, item 1 of the follow-up task): every page this list once
   * named is now either down to one primary button (`pages/org/OrgMembersPage.tsx`,
   * `pages/org/InvitePeople.tsx`, `pages/grounds/CheckInPeopleAndSetup.tsx`,
   * `pages/billing/BillingPage.tsx` - see each file's own comment for which button stayed primary
   * and why) or carries a `PRIMARY-BUTTONS-NEVER-TOGETHER` marker for a genuine either/or
   * (`pages/invite/InvitePage.tsx`, `components/gw/Suggestions.tsx`). A page added here again means
   * an actual regression, not a backlog item.
   */
  const PAGES_WITH_MORE_THAN_ONE_PRIMARY_BUTTON_TODAY: Record<string, number> = {}
  it('no listed page writes more than one primary button beyond what is already named as not fixed yet', () => {
    const offenders: string[] = []
    for (const relPath of REBUILT_PAGES) {
      const raw = readFileSync(join(SRC_ROOT, relPath), 'utf8')
      const count = primaryButtonCount(raw)
      const knownToday = PAGES_WITH_MORE_THAN_ONE_PRIMARY_BUTTON_TODAY[relPath]
      if (count <= 1 || raw.includes('PRIMARY-BUTTONS-NEVER-TOGETHER:')) continue
      if (knownToday === undefined) {
        offenders.push(`${relPath}: ${count} primary buttons - a NEW offender, not on today's list`)
      } else if (count !== knownToday) {
        offenders.push(`${relPath}: ${count} primary buttons, but the list says ${knownToday} - update the list only by fixing or marking the page`)
      }
    }
    expect(offenders).toEqual([])
  })

  /**
   * NOR DOES THE SHARED STYLESHEET ITSELF. Every rebuilt page's own sizes ultimately live in
   * gw-ui.css (the utility scale, and every shared part's own class) - so the floor has to hold
   * there too, or a page could stay "clean" by naming a class that gw-ui.css quietly sets small.
   */
  it('gw-ui.css itself sets no text size smaller than 13 pixels', () => {
    const css = readFileSync(join(SRC_ROOT, 'components/gw/ui/gw-ui.css'), 'utf8')
    expect(tooSmallFontSizes(css)).toEqual([])
  })
})

describe('the detection itself catches a real offender, not only an empty list', () => {
  it('catches an old part imported from kit.tsx, however it is written', () => {
    expect(namesImportedFromKit("import { Card, Row } from '@/components/gw/kit'"))
      .toEqual(expect.arrayContaining(['Card', 'Row']))
    expect(namesImportedFromKit("import { Button, Tag } from '@/components/gw/kit'"))
      .toEqual(['Button', 'Tag'])
  })

  it('does not flag a comment that only mentions the old names', () => {
    const stripped = stripComments('/* do not use Card or gw-btn here */\nexport const x = 1')
    expect(namesImportedFromKit(stripped)).toEqual([])
    expect(oldClassesUsed(stripped)).toEqual([])
  })

  it('catches an old CSS class name written into the source, including the cg-* wildcard', () => {
    expect(oldClassesUsed('<button className="gw-btn">Go</button>')).toContain('gw-btn')
    expect(oldClassesUsed('<div className="cg-panel">')).toContain('cg-*')
  })

  it('does not confuse the new gwui- classes with the old gw- ones', () => {
    expect(oldClassesUsed('<button className="btn pri">Go</button>')).toEqual([])
  })

  it('catches a text size below 13px, wherever it is written, and passes anything 13 or above', () => {
    expect(tooSmallFontSizes('.gwui-fs-12 { font-size: 12px; }')).toEqual([12])
    expect(tooSmallFontSizes('style={{fontSize: 10.5}}; .x { font-size: 10.5px; }')).toEqual([10.5])
    expect(tooSmallFontSizes('.gwui-fs-13 { font-size: 13px; } .gwui-fs-21 { font-size: 21px; }')).toEqual([])
  })

  it('catches the newly-added old classes too', () => {
    expect(oldClassesUsed('<div className="gw-er">')).toContain('gw-er')
    expect(oldClassesUsed('<p className="gw-sub-t">')).toContain('gw-sub-t')
    expect(oldClassesUsed('<label className="gw-label">')).toContain('gw-label')
  })

  it('finds a component a page imports from components/gw, one level, never from gw/ui', () => {
    expect(gwComponentImportPaths("import { LinkProblem } from '@/components/gw/LinkProblem'"))
      .toEqual(['components/gw/LinkProblem'])
    expect(gwComponentImportPaths("import { Button } from '@/components/gw/ui'")).toEqual([])
    expect(gwComponentImportPaths("import { Page } from '@/components/gw/ui/Page'")).toEqual([])
  })

  it('finds an inline style property, and knows which ones are banned', () => {
    expect(inlineStylePropNames('<h2 style={{ fontSize: 21, marginBottom: 3 }}>')).toEqual(['fontSize', 'marginBottom'])
    expect(bannedInlineStyleProps('<div style={{ textAlign: \'center\' }}>')).toEqual([])
    expect(bannedInlineStyleProps('<div style={{ paddingTop: 14, borderTop: \'1px solid red\' }}>'))
      .toEqual(['paddingTop', 'borderTop'])
    expect(bannedInlineStyleProps('<div style={{ display: \'grid\', gap: 14 }}>')).toEqual(['gap'])
  })

  it('catches a style constant, a ternary between two literals, and a spread - never a plain literal', () => {
    const constUse = `
      const CARD = { fontSize: 13, color: 'var(--gw-sub)' }
      const X = <div style={CARD}>hi</div>
    `
    expect(bannedStyleReferenceProps(stripComments(constUse))).toEqual(expect.arrayContaining(['fontSize', 'color']))

    const ternary = `const X = <div style={cond ? { padding: 4 } : { margin: 6 }}>hi</div>`
    expect(bannedStyleReferenceProps(stripComments(ternary))).toEqual(expect.arrayContaining(['padding', 'margin']))

    const spread = `
      const BASE = { border: '1px solid red' }
      const X = <div style={{...BASE, cursor: 'pointer'}}>hi</div>
    `
    expect(bannedStyleReferenceProps(stripComments(spread))).toEqual(['border'])

    const plainLiteral = `const X = <div style={{ textAlign: 'center' }}>hi</div>`
    expect(bannedStyleReferenceProps(stripComments(plainLiteral))).toEqual([])
  })
})
