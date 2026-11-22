import { useTheDesignPass } from '@/lib/the-design-pass'

/**
 * A FILE TO CHOOSE, SAID IN WORDS (design pass, 21 November 2026).
 *
 * The browser's own file field reads "Choose File  No file chosen", in its own grey, on the Desk and
 * on a spend request. With the design pass on, the same field is drawn as a secondary button that
 * says "Choose a file", with the chosen file's name beside it, or "No file chosen yet." With the
 * pass off it is the browser's field, exactly as before.
 */
export function ChooseAFile({ id, accept, file, onChoose, inputKey }: {
  id: string
  accept: string
  file: File | null
  onChoose: (file: File | null) => void
  inputKey?: number
}) {
  const on = useTheDesignPass()
  const input = (
    <input key={inputKey} id={id} type="file" accept={accept} onChange={e => onChoose(e.target.files?.[0] ?? null)} />
  )
  if (!on) return input
  return (
    <span className="dp-file">
      {input}
      <label htmlFor={id} className="btn sec">{file ? 'Choose another file' : 'Choose a file'}</label>
      <span className="dp-file-name" aria-live="polite">{file ? file.name : 'No file chosen yet.'}</span>
    </span>
  )
}
