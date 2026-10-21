/**
 * THE CONTEXT TAB'S NAME (Release 1B, pull request 2 of 3; Hafsah, 18 October 2026: "The Context tab is renamed 'References
 * and resources'"). Renamed only where the organisation's Release 1B switch is on, which the server says on GET /grounds/:id
 * (`release1bTabsOn`); off, every page names the tab exactly as before.
 */
export const REFERENCES_AND_RESOURCES = 'References and resources'

export function theContextTabsName(ground: { release1bTabsOn?: boolean } | null | undefined, asBefore: string): string {
  return ground?.release1bTabsOn === true ? REFERENCES_AND_RESOURCES : asBefore
}
