import { Component, type ErrorInfo, type ReactNode } from 'react'

/**
 * ONE PART OF A PAGE FAILING IS NOT THE PAGE FAILING (Hafsah, 15 November 2026: "fix why the page
 * keeps cracking").
 *
 * The only error boundary used to be the one round all the routes (PageCrash), so a single section
 * that could not draw took the whole page with it. This is the small one under it: it wraps one
 * independent part (a section, a panel) and, when that part throws while drawing, says one plain
 * line in its place and lets the rest of the page keep working. The technical message goes to the
 * console only, never to the person.
 *
 * `Section` and `Panel` wrap their own bodies in it, so every titled part on every page already has
 * one; use it directly only round a part that is neither.
 */
export const THIS_PART_COULD_NOT_BE_SHOWN = 'This part could not be shown.'

export class PartBoundary extends Component<{ children: ReactNode; quiet?: boolean }, { failed: boolean }> {
  state = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[groundwork] a part of the page failed to render', error, info.componentStack)
  }

  render() {
    if (!this.state.failed) return this.props.children
    if (this.props.quiet) return null
    return <p className="note">{THIS_PART_COULD_NOT_BE_SHOWN}</p>
  }
}
