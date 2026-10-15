import './gw-ui.css'

/**
 * "UPDATED WED 23 SEP, 6PM ⓘ" (light prototype, s71; approved rename in
 * docs/light-rebuild/sales-first.md). The short line under the tabs, with the whole sentence
 * ("Last updated on Wednesday 23 September at 6pm. The board only changes when ...") one tap away
 * behind the ⓘ. Nothing is lost: the full sentence is the same one every reader read before.
 *
 * `short` is null when the record holds no time yet; then the full sentence is said as it is,
 * because there is nothing short to say.
 */
export function UpdatedLine({ short, full }: { short: string | null; full: string }) {
  if (!short) return <p className="gwui-upd-plain">{full}</p>
  return (
    <details className="gwui-upd">
      <summary>
        Updated {short} <span aria-hidden="true">ⓘ</span>
      </summary>
      <span className="gwui-upd-full">{full}</span>
    </details>
  )
}
