import { FieldLabel, TextField } from '@/components/gw/ui'

/**
 * "PHONE NUMBER", WHEREVER A PERSON IS ADDED OR JOINS (Hafsah, 30 October 2026: "phone numbers are always shown and editable,
 * whether WhatsApp is on or off ... Label it plainly 'Phone number'. Only wording that mentions WhatsApp itself stays hidden while
 * WhatsApp is off, so my rule of 26 September still holds for that." This replaces decision 106 item 6, "Leads cannot add numbers
 * when inviting").
 *
 * One field for every form: an admin inviting people, a lead adding somebody to a check-in or setting one up, and somebody joining
 * by a link or an invitation. It is always optional. The sentence under it says WhatsApp only while WhatsApp is on: the caller passes
 * what useWhatsAppIsOn answers, or false where nobody is signed in yet, which is what that hook answers then.
 */
export const PHONE_NUMBER_PLACEHOLDER = '+254 712 345 678'

export function PhoneNumberField({ id, value, onChange, whose, whatsappOn }: {
  id: string
  value: string
  onChange: (value: string) => void
  /** Your own number (joining), or the number of somebody you are adding. */
  whose: 'yours' | 'theirs'
  whatsappOn: boolean
}) {
  const help = !whatsappOn
    ? 'Optional.'
    : whose === 'yours'
      ? 'Optional. With it, your check-ins can also reach you on WhatsApp.'
      : 'Optional. With it, their check-ins can also reach them on WhatsApp.'
  return (
    <div>
      <FieldLabel htmlFor={id}>
        Phone number
        <TextField id={id} type="tel" autoComplete={whose === 'yours' ? 'tel' : 'off'} value={value} onChange={(e) => onChange(e.target.value)} placeholder={PHONE_NUMBER_PLACEHOLDER} maxLength={40} />
      </FieldLabel>
      <p className="gwui-field-help">{help}</p>
    </div>
  )
}
