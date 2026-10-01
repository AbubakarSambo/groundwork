/**
 * THE ONLY FILES THAT DRAW THEIR OWN <style>, AND THE CLASSES IN THEM, FROZEN ON 1 OCTOBER 2026.
 *
 * A class written inside a component's own <style> tag slips past both class guards, which read
 * gw-ui.css and index.css. It is the same drift (Hafsah, 1 October). No other file may add a
 * <style>, and these files may add no new class to theirs; a new part goes in gw-ui.css and is
 * written up in the parts table. When a class here is gone, take its name off. The lists only shrink.
 */
export const THE_STYLE_TAGS_THERE_WERE: Record<string, readonly string[]> = {
  'components/gw/TheReportYouSawAtTheEnd.tsx': ['gw-entry-report'],
  'pages/ops/OpsLayout.tsx': ['gw-ops-rail', 'gw-ops-shell'],
  'components/gw/TheSessionsReport.tsx': ['gw-find', 'gw-find-why', 'gw-find-why-also', 'gw-find-why-basis', 'gw-sr', 'gw-sr-agree-wrap', 'gw-sr-built-from', 'gw-sr-caption-label', 'gw-sr-caption-text', 'gw-sr-cite', 'gw-sr-counted', 'gw-sr-counted-item', 'gw-sr-definitions', 'gw-sr-finding', 'gw-sr-finding-label', 'gw-sr-footer', 'gw-sr-footer-line', 'gw-sr-grouped', 'gw-sr-head', 'gw-sr-head-shared', 'gw-sr-head-title', 'gw-sr-item-title', 'gw-sr-lines-gap', 'gw-sr-muted', 'gw-sr-muted-inline', 'gw-sr-muted-prose', 'gw-sr-parent', 'gw-sr-person-finding', 'gw-sr-person-saying', 'gw-sr-picture-list', 'gw-sr-position', 'gw-sr-quote', 'gw-sr-quotes', 'gw-sr-rests-on-item', 'gw-sr-row', 'gw-sr-section-note', 'gw-sr-source-line', 'gw-sr-statement', 'gw-sr-toggle-row', 'gw-sr-why', 'gw-tile', 'gw-tile-good', 'gw-tile-grid', 'gw-tile-n', 'gw-tile-txt', 'gw-tile-watch'],
  'components/gw/TheCheckInYouJustFinished.tsx': [],
  'components/gw/AskGroundwork.tsx': [],
  'components/gw/AppShell.tsx': ['focus', 'gw-ask-drawer', 'gw-fb-overlay', 'gw-fb-panel', 'gw-focus', 'gw-main-content', 'gw-sidebar-desktop', 'gw-sidebar-mobile', 'tabbar'],
}
