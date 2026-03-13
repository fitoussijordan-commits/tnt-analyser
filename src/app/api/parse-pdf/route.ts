import { NextRequest, NextResponse } from 'next/server'
import PDFParser from 'pdf2json'

interface TextRun {
  x: number
  y: number
  R: Array<{ T: string }>
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

    const buffer = Buffer.from(await file.arrayBuffer())

    const rows = await new Promise<ReturnType<typeof parseFedexLines>>((resolve, reject) => {
      const parser = new PDFParser()

      parser.on('pdfParser_dataError', (err: { parserError: string }) => reject(err.parserError))

      parser.on('pdfParser_dataReady', (data: { Pages: Array<{ Texts: TextRun[] }> }) => {
        const allLines: string[] = []

        for (const page of data.Pages) {
          // Grouper par Y arrondi (pdf2json utilise des unités 0.0xxx)
          const byY: Record<number, Array<[number, string]>> = {}

          for (const text of page.Texts) {
            const y = Math.round(text.y * 100) // arrondir à 2 décimales * 100
            const str = text.R.map(r => decodeURIComponent(r.T)).join('')
            if (!byY[y]) byY[y] = []
            byY[y].push([text.x, str])
          }

          const ys = Object.keys(byY).map(Number).sort((a, b) => a - b) // Y croissant = haut en bas
          for (const y of ys) {
            const sorted = byY[y].sort((a, b) => a[0] - b[0])
            allLines.push(sorted.map(([, s]) => s).join(' '))
          }
        }

        resolve(parseFedexLines(allLines))
      })

      parser.parseBuffer(buffer)
    })

    return NextResponse.json({ rows, total: rows.length })

  } catch (err) {
    console.error('PDF parse error:', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
