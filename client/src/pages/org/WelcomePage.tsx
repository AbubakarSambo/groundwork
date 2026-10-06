import { useMutation, useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { authApi } from '@/api/auth'
import { useAuthStore } from '@/stores/auth'
import { WhereDoYouWork } from './WhereDoYouWork'

/**
 * "WHERE DO YOU WORK?" (A3, #/welcome), for somebody signed in. The card is WhereDoYouWork.
 *
 * What is offered comes from the server (GET /auth/where-can-i-join): organisations that let anyone
 * with this person's confirmed email domain join, invitations still open for their exact address,
 * and always "Create a new organisation".
 */
export function WelcomePage() {
  const navigate = useNavigate()
  const setAuth = useAuthStore(s => s.setAuth)
  const [problem, setProblem] = useState('')
  const { data } = useQuery({ queryKey: ['where-can-i-join'], queryFn: authApi.whereCanIJoin, retry: false })

  const join = useMutation({
    mutationFn: (organizationId: string) => authApi.joinByDomain(organizationId),
    onSuccess: (res) => {
      setAuth(res.user, res.accessToken)
      window.location.assign('/today')
    },
    onError: (e: any) => setProblem(e?.response?.data?.message ?? 'That did not work, and you have not joined. Try again.'),
  })

  return (
    <WhereDoYouWork
      byDomain={data?.byDomain ?? []}
      asAGuest={data?.asAGuest ?? []}
      problem={problem || undefined}
      busy={join.isPending}
      onJoin={id => join.mutate(id)}
      onJoinAsAGuest={path => navigate(path)}
      create={{ to: '/org-new' }}
    />
  )
}
