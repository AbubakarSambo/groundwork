import './gw-ui.css'

/**
 * AVATAR (prototype: .av, app.css).
 *
 * A circle, 34px by default, `--act-soft` fill (`--gw-blue-bg`), navy initials bold, at the size
 * divided by 2.8 (13.5px for 34, 20px for 56). One colour only - the old `gw-av` six-colour scheme,
 * including a green not in the palette, is not carried over.
 */
export function Avatar({ initials, size = 34 }: { initials: string; size?: number }) {
  const fontSize = Math.round((size / 2.8) * 10) / 10
  return (
    <span
      className="gwui-avatar"
      style={{ width: size, height: size, fontSize }}
      aria-hidden
    >
      {initials}
    </span>
  )
}
