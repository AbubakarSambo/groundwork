import { useRef, useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'
import { documentsApi } from '@/api/documents'
import { AddADocument } from '@/components/gw/AddADocument'
import { Button, FlexRow, Note } from '@/components/gw/ui'
import { UPLOAD_ACCEPT_ATTR } from '@/lib/what-you-can-upload'

/**
 * ATTACH A FILE TO A CHECK-IN: choose it, it uploads private to you, then say what it is for and who can read it (AddADocument).
 * One control for References and resources ("Choose a file") and My work ("Attach something"), so both upload the same way.
 */
export function AttachAFile({ groundId, contextEnabled, label, onDone }: {
  groundId: string
  contextEnabled: boolean
  /** What the button says where it is drawn. */
  label: string
  onDone?: () => void
}) {
  const [reviewing, setReviewing] = useState<{ id: string; name: string } | null>(null)
  const fileInput = useRef<HTMLInputElement>(null)
  const upload = useMutation({
    mutationFn: (f: File) => documentsApi.upload(groundId, f),
    onSuccess: (res: any, f) => { if (res?.id) setReviewing({ id: res.id, name: f.name }) },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'That file did not upload. Nothing was added, so try again.'),
  })
  if (reviewing) {
    return (
      <AddADocument groundId={groundId} docId={reviewing.id} fileName={reviewing.name} contextEnabled={contextEnabled} placeName="References and resources"
        onChooseAnother={() => { setReviewing(null); fileInput.current?.click() }} onClose={() => { setReviewing(null); onDone?.() }} />
    )
  }
  return (
    <FlexRow gap={8} align="center" wrap>
      <input ref={fileInput} type="file" accept={UPLOAD_ACCEPT_ATTR} hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) upload.mutate(f); e.target.value = '' }} />
      <Button kind="secondary" size="small" onClick={() => fileInput.current?.click()} disabled={upload.isPending}>{upload.isPending ? 'Adding…' : label}</Button>
      <Note tone="muted">It starts private to you. You choose who can read it once it is in.</Note>
    </FlexRow>
  )
}
