/**
 * A NOTICE ON A SCENARIO BOARD (prototype: matter.jpg, "More confident than the evidence allows" in a heavy dark frame,
 * and "This may change the strategy. It needs your review." in the ordinary one): a bold title, the sentences, and a
 * quieter line under them.
 */
export function ScenarioNotice({ title, text, note, strong }: { title: string; text: string; note: string; strong?: boolean }) {
  return (
    <section className={strong ? 'panel gwui-scn-notice gwui-scn-notice-strong' : 'panel gwui-scn-notice'} aria-label={title}>
      <h3 className="gwui-scn-notice-h">{title}</h3>
      <p className="gwui-panel-text gwui-scn-notice-text">{text}</p>
      <p className="gwui-panel-text-muted">{note}</p>
    </section>
  )
}
