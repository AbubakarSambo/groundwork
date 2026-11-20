import { Modal, Stack, Note, Button } from '@/components/gw/ui'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { apiClient } from '@/api/client'
import { A_FAILURE, whatRemovingSays } from './people-here'

/**
 * ASKING FIRST, IN THE PAGE (end-to-end run 5, 19 November: a real click on Remove did nothing, because the browser's own confirm box is
 * swallowed by the app's pane, and a person on a phone or in an embedded view never sees one either). One dialog, the product's own
 * Modal, for every choice on the People pages that cannot be undone by choosing again: making somebody an admin, handing the
 * organisation over, and removing somebody.
 */
export function AskFirst({ title, question, detail, yes, working, pending, onYes, onClose }: {
  title: string
  question: string
  detail?: string
  yes: string
  working: string
  pending: boolean
  onYes: () => void
  onClose: () => void
}) {
  return (
    <Modal title={title} onClose={onClose}>
      <Stack gap={18}>
        <Note>{question}</Note>
        {detail && <Note>{detail}</Note>}
        <Stack gap={10}>
          <Button onClick={onYes} disabled={pending}>{pending ? working : yes}</Button>
          <Button kind="secondary" onClick={onClose} disabled={pending}>Cancel</Button>
        </Stack>
      </Stack>
    </Modal>
  )
}

/**
 * Removing somebody from the organisation, asked first. The same words and the same request wherever it is reached from: their own page,
 * and the People list.
 */
export function RemoveFromTheOrganisation({ id, name, orgName, alsoIn, onClose, onRemoved }: {
  id: string
  name: string
  orgName: string
  alsoIn?: string[]
  onClose: () => void
  onRemoved?: () => void
}) {
  const qc = useQueryClient()
  const says = whatRemovingSays(name, orgName, alsoIn)
  const remove = useMutation({
    mutationFn: () => apiClient.delete(`/users/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['org-members'] })
      toast.success(`${name} no longer has access to ${orgName}.`)
      onClose()
      onRemoved?.()
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? A_FAILURE),
  })
  return (
    <AskFirst title={`Remove ${name}`} question={says.question} detail={says.detail} yes="Remove" working="Removing…" pending={remove.isPending} onYes={() => remove.mutate()} onClose={onClose} />
  )
}
