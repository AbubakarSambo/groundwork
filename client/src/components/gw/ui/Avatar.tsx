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
  /* B-066: a plain neutral mark, never initials made out of a placeholder sentence's own first
     words ("Someone who has not given a name yet" read as "SW"). `initialsOf` (people-here.ts)
     returns '' for that case; this is the one spot that turns it into something to look at. */
  return (
    <span
      className="gwui-avatar"
      style={{ width: size, height: size, fontSize }}
      aria-hidden
    >
      {initials || '•'}
    </span>
  )
}
