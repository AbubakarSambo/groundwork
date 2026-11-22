import { Choices } from '@/components/gw/ui'

/** A choice between two, drawn with the shared Choices: each option's label and the sentence that says what it means. */
export function AChoiceOfTwo({ label, value, options, onChange }: {
  label: string; name?: string; value: string; options: [string, string, string][]; onChange: (key: string) => void; disabled?: boolean
}) {
  return <Choices label={label} stacked quiet value={value} onChange={(k) => k !== value && onChange(k)} options={options.map(([key, l, description]) => ({ key, label: l, description }))} />
}
