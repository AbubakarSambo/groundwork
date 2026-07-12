// The Groundwork mark: two interlocking accounts with a shared overlap.
// Used to label the SHARED report (the cross-account view showing where
// everyone's accounts agree or differ). Not a data chart.
export function VennIcon({ size = 20, navy = '#141B34', overlap = '#3B5BDB' }: { size?: number; navy?: string; overlap?: string }) {
  return (
    <svg width={size} height={(size * 40) / 64} viewBox="0 0 64 40" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <defs>
        <clipPath id="gw-venn-lens">
          <circle cx="24" cy="20" r="13" />
        </clipPath>
      </defs>
      {/* shared overlap lens */}
      <circle cx="40" cy="20" r="13" fill={overlap} clipPath="url(#gw-venn-lens)" />
      {/* the two accounts */}
      <circle cx="24" cy="20" r="13" fill="none" stroke={navy} strokeWidth="4" />
      <circle cx="40" cy="20" r="13" fill="none" stroke={navy} strokeWidth="4" />
    </svg>
  )
}
