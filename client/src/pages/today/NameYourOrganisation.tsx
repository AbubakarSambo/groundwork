import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'
import { authApi } from '@/api/auth'
import { useAuthStore } from '@/stores/auth'
import { Panel, Button, Stack } from '@/components/gw/ui'
import { TextField } from '@/components/gw/ui/FormFields'

/**
 * THE NAME GROUNDWORK MADE UP IS NOT THE ORGANISATION'S NAME (Hafsah, 26 October 2026). People signing up, with Google especially, were
 * left as "Hafsah's workspace": a sign-in that came through setup never reached the naming page, and "Cancel" there kept the made-up name.
 * An admin whose organisation still has it is asked for the real one here, on Today, until it is given. The same check as the server's
 * isAMadeUpWorkspaceName (api/src/modules/assistant/ask-name.ts).
 */
export function isAMadeUpWorkspaceName(name?: string | null): boolean {
  const n = (name ?? '').replace(/\s+/g, ' ').trim()
  return !n || /^my workspace$/i.test(n) || /^.+['’]s workspace$/i.test(n)
}

const NOT_NOW = 'gw-name-your-organisation-not-now'

export function NameYourOrganisation() {
  const user = useAuthStore((s) => s.user)
  const updateUser = useAuthStore((s) => s.updateUser)
  const [name, setName] = useState('')
  const [notNow, setNotNow] = useState(() => { try { return sessionStorage.getItem(NOT_NOW) === '1' } catch { return false } })
  const save = useMutation({
    mutationFn: (n: string) => authApi.renameOrganization(n),
    onSuccess: (org) => { updateUser({ organizationName: org.name } as any); toast.success(`Your organisation is now called ${org.name}.`) },
    onError: () => toast.error('The name did not change. Try again.'),
  })
  if (user?.role !== 'ADMIN' || notNow || !isAMadeUpWorkspaceName(user?.organizationName)) return null
  const ok = name.trim().length >= 2
  return (
    <Panel as="section" heading="What is your organisation called?" aria-label="Name your organisation">
      <Stack gap={10}>
        <p className="t-body">
          {user?.organizationName ? `It is called “${user.organizationName}” for now. ` : ''}Give it your organisation’s real name, so your team sees it everywhere.
        </p>
        <TextField value={name} onChange={(e) => setName(e.target.value)} placeholder="For example, Drop Access" aria-label="Your organisation’s name"
          onKeyDown={(e) => { if (e.key === 'Enter' && ok) save.mutate(name.trim()) }} />
        <div className="gwui-invite-actions">
          <Button kind="primary" size="small" onClick={() => save.mutate(name.trim())} disabled={!ok || save.isPending}>{save.isPending ? 'Saving…' : 'Save the name'}</Button>
          <Button kind="quiet" size="small" onClick={() => { try { sessionStorage.setItem(NOT_NOW, '1') } catch { /* kept for this page only */ } setNotNow(true) }}>Not now</Button>
        </div>
      </Stack>
    </Panel>
  )
}
