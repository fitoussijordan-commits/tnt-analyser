'use client'
import {
  Chart as ChartJS, CategoryScale, LinearScale, BarElement,
  Title, Tooltip, Legend, ArcElement
} from 'chart.js'
import { Bar, Doughnut } from 'react-chartjs-2'
import type { Stats } from '@/lib/parsers'

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement)

const CHART_OPTS = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { display: false } },
  scales: {
    x: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: 'rgba(255,255,255,0.4)', font: { size: 11 } } },
    y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: 'rgba(255,255,255,0.4)', font: { size: 11 } } },
  },
} as const

export function DistribChart({ distrib }: { distrib: Record<string, number> }) {
  const colors = ['#1D9E75', '#5DCAA5', '#FAC775', '#EF9F27', '#F09595', '#E24B4A']
  return (
    <div className="relative h-52">
      <Bar
        data={{
          labels: Object.keys(distrib),
          datasets: [{
            data: Object.values(distrib),
            backgroundColor: colors,
            borderRadius: 6,
            borderSkipped: false,
          }],
        }}
        options={CHART_OPTS}
      />
    </div>
  )
}

export function DeptChart({ topDepts }: { topDepts: Stats['topDepts'] }) {
  const top8 = topDepts.slice(0, 8)
  return (
    <div className="relative h-52">
      <Bar
        data={{
          labels: top8.map(d => d.name.substring(0, 14)),
          datasets: [{
            data: top8.map(d => parseFloat(d.transport.toFixed(2))),
            backgroundColor: '#7F77DD',
            borderRadius: 6,
            borderSkipped: false,
          }],
        }}
        options={{
          ...CHART_OPTS,
          scales: {
            ...CHART_OPTS.scales,
            x: { ...CHART_OPTS.scales.x, ticks: { ...CHART_OPTS.scales.x.ticks, maxRotation: 35 } },
          },
        }}
      />
    </div>
  )
}

export function DonutChart({ matched, tntOnly, odooOnly }: { matched: number; tntOnly: number; odooOnly: number }) {
  return (
    <div className="relative h-52 flex items-center justify-center">
      <Doughnut
        data={{
          labels: ['Croisées', 'TNT seulement', 'Odoo seulement'],
          datasets: [{
            data: [matched, tntOnly, odooOnly],
            backgroundColor: ['#1D9E75', '#E94560', '#7F77DD'],
            borderWidth: 0,
            hoverOffset: 4,
          }],
        }}
        options={{
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              display: true,
              position: 'bottom' as const,
              labels: { color: 'rgba(255,255,255,0.5)', font: { size: 11 }, padding: 12, boxWidth: 10, boxHeight: 10 },
            },
          },
          cutout: '65%',
        }}
      />
    </div>
  )
}
