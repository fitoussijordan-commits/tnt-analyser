import clsx from 'clsx'

export default function PctBadge({ pct }: { pct: number }) {
  return (
    <span className={clsx(
      'inline-block px-2 py-0.5 rounded-full text-xs font-semibold',
      pct > 20 ? 'bg-red-500/15 text-red-400' :
      pct > 10 ? 'bg-orange-500/15 text-orange-400' :
      pct > 5  ? 'bg-amber-500/15 text-amber-400' :
                 'bg-emerald-500/15 text-emerald-400'
    )}>
      {pct.toFixed(1)}%
    </span>
  )
}
