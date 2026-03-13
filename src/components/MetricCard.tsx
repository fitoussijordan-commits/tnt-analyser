import clsx from 'clsx'

interface Props {
  label: string
  value: string
  sub?: string
  accent?: boolean
  danger?: boolean
}

export default function MetricCard({ label, value, sub, accent, danger }: Props) {
  return (
    <div className="bg-white/[0.04] rounded-xl border border-white/[0.07] p-4">
      <p className="text-xs text-white/40 mb-1.5 font-medium tracking-wide uppercase">{label}</p>
      <p className={clsx(
        'text-2xl font-semibold',
        accent ? 'text-accent' : danger ? 'text-red-400' : 'text-white'
      )}>
        {value}
      </p>
      {sub && <p className="text-xs text-white/30 mt-1">{sub}</p>}
    </div>
  )
}
