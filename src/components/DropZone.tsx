'use client'
import { useCallback, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import clsx from 'clsx'

interface Props {
  label: string
  sublabel: string
  accept: Record<string, string[]>
  loaded: boolean
  onFile: (content: string | ArrayBuffer, name: string) => void
  icon: React.ReactNode
}

export default function DropZone({ label, sublabel, accept, loaded, onFile, icon }: Props) {
  const [isDragging, setIsDragging] = useState(false)

  const onDrop = useCallback((files: File[]) => {
    setIsDragging(false)
    if (!files[0]) return
    const file = files[0]
    const isExcel = file.name.endsWith('.xlsx') || file.name.endsWith('.xls')
    const reader = new FileReader()
    reader.onload = e => {
      const result = e.target?.result
      if (result !== undefined && result !== null) onFile(result, file.name)
    }
    if (isExcel) reader.readAsArrayBuffer(file)
    else reader.readAsText(file)
  }, [onFile])

  const { getRootProps, getInputProps } = useDropzone({
    onDrop,
    onDragEnter: () => setIsDragging(true),
    onDragLeave: () => setIsDragging(false),
    accept,
    maxFiles: 1,
  })

  return (
    <div
      {...getRootProps()}
      className={clsx(
        'relative flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed',
        'min-h-[140px] cursor-pointer transition-all duration-200 p-6 text-center select-none',
        loaded
          ? 'border-emerald-500/60 bg-emerald-500/5'
          : isDragging
          ? 'border-accent bg-accent/5'
          : 'border-white/10 hover:border-white/25 bg-white/[0.02] hover:bg-white/[0.04]'
      )}
    >
      <input {...getInputProps()} />
      <div className={clsx(
        'flex items-center justify-center w-10 h-10 rounded-lg text-xl transition-colors',
        loaded ? 'bg-emerald-500/15 text-emerald-400' : 'bg-white/5 text-white/50'
      )}>
        {loaded ? '✓' : icon}
      </div>
      <div>
        <p className={clsx('text-sm font-medium', loaded ? 'text-emerald-400' : 'text-white/80')}>
          {label}
        </p>
        <p className="text-xs text-white/40 mt-0.5">{sublabel}</p>
      </div>
    </div>
  )
}
