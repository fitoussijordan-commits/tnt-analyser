import { NextRequest, NextResponse } from 'next/server'

interface TextItem {
  str: string
  transform: number[]
}

function parseFedexLines(lines: string[]) {
  const refMap: Record<string, {
    ref: string; dest: string; dept: string; weight: number; transportHT: number; date: string
  }> = {}

  for (const line of lines) {
    const refMatch = line.match(/\b(S\d{5,})\b/)
    if (!refMatch) continue
    const totalMatch = line.match(/EXP\s+[\d,]+\s+RS\s+[\d,]+\s+([\d,]+)\s*$/)
    if (!totalMatch) continue

    const ref = refMatch[1]
    const total = parseFloat(totalMatch[1].replace(',', '.'))
    const deptM = line.match(/FR(\d{2})\b/)
    const dept = deptM ? deptM[1] : '??'
    const dateM = line.match(/(\d{2}\/\d{2})/)
    const date = dateM ? dateM[1] : ''
    const destM = line.match(/BONDY\s+(.+?)\s+FR\d{2}/)
    const dest = destM ? destM[1].trim() : ''
    const weightM = line.match(/V?\s+([\d,]+)\s+EXP/)
    const weight = weightM ? parseFloat(weightM[1].replace(',', '.')) : 0

    if (!refMap[ref]) refMap[ref] = { ref, dest, dept, weight: 0, transportHT: 0, date }
    refMap[ref].weight = Math.round((refMap[ref].weight + weight) * 100) / 100
    refMap[ref].transportHT = Math.round((refMap[ref].transportHT + total) * 100) / 100
    if (!refMap[ref].dest && dest) refMap[ref].dest = dest
  }

  return Object.values(refMap).sort((a, b) => a.ref.localeCompare(b.ref))
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File
    if (!file) return NextResponse.json({ error: 'No file' }, { status: 400 })

    const buffer = new Uint8Array(await file.arrayBuffer())

    // pdfjs-dist côté serveur Node (pas de worker nécessaire)
    const pdfjs = await import('pdfjs-dist/legacy/build/pdf.js')
    const pdf = await pdfjs.getDocument({ data: buffer, useWorkerFetch: false, isEvalSupported: false, useSystemFonts: true }).promise

    const allLines: string[] = []

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i)
      const tc = await page.getTextContent()
      const items = tc.items as TextItem[]

      // Grouper par Y arrondi
      const byY: Record<number, Array<[number, string]>> = {}
      for (const item of items) {
        const y = Math.round(item.transform[5])
        if (!byY[y]) byY[y] = []
        byY[y].push([item.transform[4], item.str])
      }

      // Reconstituer les lignes
      const ys = Object.keys(byY).map(Number).sort((a, b) => b - a)
      for (const y of ys) {
        const sorted = byY[y].sort((a, b) => a[0] - b[0])
        allLines.push(sorted.map(([, s]) => s).join(' '))
      }
    }

    const rows = parseFedexLines(allLines)
    return NextResponse.json({ rows, total: rows.length })

  } catch (err) {
    console.error('PDF parse error:', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
