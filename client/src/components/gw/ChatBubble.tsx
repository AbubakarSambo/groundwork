interface ChatBubbleProps {
  role: 'AI' | 'PERSON'
  content: string
  loading?: boolean
}

export function ChatBubble({ role, content, loading }: ChatBubbleProps) {
  if (loading) {
    return <div className="gw-msg gw-msg-loading">Thinking…</div>
  }
  return (
    <div className={`gw-msg ${role === 'AI' ? 'gw-msg-ai' : 'gw-msg-user'}`}>
      {content}
    </div>
  )
}
