import { useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/api/client'
import { Section, Button, Note, TextField, Stack, FieldRows, FieldRow, FlexRow } from '@/components/gw/ui'

/**
 * A PERSON'S CV AND EMERGENCY CONTACT (Hafsah, 21 November 2026), on the one-person page and on the person's own You page.
 *
 * What is shown is only what the server sends this reader (GET /person-details/:userId, api/src/modules/users/
 * who-reads-a-persons-details.ts): the CV for the person, an admin and the person's own manager; the emergency contact for the
 * person and an admin only. A row the server did not send is not drawn, so nothing is hidden on screen only.
 *
 * Label and value rows (the shared FieldRows): a bold label, one plain line, and a quiet "Add" or "Change". Nothing folded.
 */
interface Details {
  cv?: { fileName: string; size: number; uploadedAt: string } | null
  mayChangeCv: boolean
  emergencyContact?: { name: string; relationship: string | null; phone: string } | null
  mayChangeEmergencyContact: boolean
}

const DID_NOT_GO = 'That did not save. Try again.'

function aDay(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
}

export function cvLine(cv: Details['cv'], own: boolean): string {
  if (!cv) return own ? 'You have not added a CV yet. A PDF or a Word file.' : 'No CV has been added yet.'
  return `${cv.fileName}, added on ${aDay(cv.uploadedAt)}.`
}

export function contactLine(c: Details['emergencyContact'], own: boolean): string {
  if (!c) return own ? 'You have not added anyone to call in an emergency yet.' : 'Nobody has been added to call in an emergency yet.'
  return c.relationship ? `${c.name}, ${own ? 'your' : 'their'} ${c.relationship}, on ${c.phone}.` : `${c.name}, on ${c.phone}.`
}

export function APersonsDetails({ userId, own = false }: { userId: string; own?: boolean }) {
  const qc = useQueryClient()
  const key = ['person-details', userId]
  const { data } = useQuery({
    queryKey: key,
    queryFn: () => apiClient.get(`/person-details/${userId}`).then((r) => (r.data.data ?? r.data) as Details),
    retry: false,
  })
  const file = useRef<HTMLInputElement>(null)
  const [problem, setProblem] = useState('')
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({ name: '', relationship: '', phone: '' })

  const done = (next: Details) => { setProblem(''); qc.setQueryData(key, next) }
  const failed = (e: any) => setProblem(e?.response?.data?.message ?? DID_NOT_GO)
  const upload = useMutation({
    mutationFn: (f: File) => {
      const body = new FormData()
      body.append('file', f)
      return apiClient.post(`/person-details/${userId}/cv`, body).then((r) => (r.data.data ?? r.data) as Details)
    },
    onSuccess: done,
    onError: failed,
  })
  const save = useMutation({
    mutationFn: () => apiClient.put(`/person-details/${userId}/emergency-contact`, form).then((r) => (r.data.data ?? r.data) as Details),
    onSuccess: (next) => { done(next); setEditing(false) },
    onError: failed,
  })
  const download = async () => {
    try {
      const res = await apiClient.get(`/person-details/${userId}/cv`, { responseType: 'blob' })
      const url = URL.createObjectURL(res.data as Blob)
      const a = document.createElement('a')
      a.href = url
      a.download = data?.cv?.fileName ?? 'CV'
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      setProblem('The CV could not be downloaded just now. Try again.')
    }
  }

  if (!data) return null
  const showsCv = data.cv !== undefined
  const showsContact = data.emergencyContact !== undefined
  if (!showsCv && !showsContact) return null

  const startEditing = () => {
    const c = data.emergencyContact
    setForm({ name: c?.name ?? '', relationship: c?.relationship ?? '', phone: c?.phone ?? '' })
    setEditing(true)
  }

  return (
    <Section heading={own ? 'Your details' : 'Their details'}>
      <FieldRows>
        {showsCv && (
          <FieldRow
            label="CV"
            value={cvLine(data.cv, own)}
            action={(data.cv || data.mayChangeCv) ? (
              <FlexRow gap={10}>
                {data.cv && <Button kind="quiet" size="small" onClick={download}>Download</Button>}
                {data.mayChangeCv && (
                  <>
                    <Button kind="quiet" size="small" onClick={() => file.current?.click()} disabled={upload.isPending}>
                      {upload.isPending ? 'Adding…' : data.cv ? 'Change' : 'Add'}
                    </Button>
                    <input
                      ref={file}
                      type="file"
                      hidden
                      aria-label="Choose a CV"
                      accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                      onChange={(e) => { const f = e.target.files?.[0]; if (f) upload.mutate(f); e.target.value = '' }}
                    />
                  </>
                )}
              </FlexRow>
            ) : undefined}
          />
        )}
        {showsContact && (
          <FieldRow
            label="Emergency contact"
            value={editing ? (
              <Stack gap={10}>
                <label>Their name<TextField value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></label>
                <label>How they are related, for example sister or husband<TextField value={form.relationship} onChange={(e) => setForm({ ...form, relationship: e.target.value })} /></label>
                <label>Their phone number, with the country code<TextField type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></label>
                <FlexRow gap={10}>
                  <Button size="small" onClick={() => save.mutate()} disabled={save.isPending}>{save.isPending ? 'Saving…' : 'Save'}</Button>
                  <Button size="small" kind="secondary" onClick={() => setEditing(false)} disabled={save.isPending}>Cancel</Button>
                </FlexRow>
              </Stack>
            ) : contactLine(data.emergencyContact, own)}
            action={data.mayChangeEmergencyContact && !editing
              ? <Button kind="quiet" size="small" onClick={startEditing}>{data.emergencyContact ? 'Change' : 'Add'}</Button>
              : undefined}
          />
        )}
      </FieldRows>
      {problem && <Note tone="error">{problem}</Note>}
    </Section>
  )
}
