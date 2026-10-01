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
  'components/gw/TheCheckInYouJustFinished.tsx': [],
  'components/gw/AskGroundwork.tsx': [],
  'components/gw/AppShell.tsx': ['focus', 'gw-ask-drawer', 'gw-fb-overlay', 'gw-fb-panel', 'gw-focus', 'gw-main-content', 'gw-sidebar-desktop', 'gw-sidebar-mobile', 'tabbar'],
}
