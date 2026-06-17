export function ConfDots({ score, large }: { score?: number; large?: boolean }) {
  const n = score ?? 0
  const sz = large ? 12 : 7
  return (
    <div className="gw-conf-dots">
      {[1,2,3,4,5].map(i => (
        <div key={i} className={`gw-conf-dot${n >= i ? ` f${i}` : ''}`} style={large ? { width: sz, height: sz } : {}} />
      ))}
    </div>
  )
}
