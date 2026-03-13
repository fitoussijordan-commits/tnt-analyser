// ─── Types ────────────────────────────────────────────────────────────────────

export interface TNTRow {
  ref: string        // S58606
  dest: string       // Destinataire
  dept: string       // 75
  weight: number     // kg
  transportHT: number // €
  date: string
}

export interface OdooRow {
  ref: string        // S58606
  client: string
  commandeHT: number
  rawRef: string
}

export interface CrossedRow {
  ref: string
  client: string
  dept: string
  weight: number
  transportHT: number
  commandeHT: number
  pct: number         // % transport / commande
  matched: boolean
  odooOnly?: boolean
}

// ─── Département map ─────────────────────────────────────────────────────────

export const DEPT_NAMES: Record<string, string> = {
  '01':'Ain','02':'Aisne','03':'Allier','04':'A-de-H-Provence','05':'Hautes-Alpes',
  '06':'Alpes-Maritimes','07':'Ardèche','08':'Ardennes','09':'Ariège','10':'Aube',
  '11':'Aude','12':'Aveyron','13':'Bouches-du-Rhône','14':'Calvados','15':'Cantal',
  '16':'Charente','17':'Charente-Maritime','18':'Cher','19':'Corrèze','20':'Corse',
  '21':'Côte-d\'Or','22':'Côtes-d\'Armor','23':'Creuse','24':'Dordogne','25':'Doubs',
  '26':'Drôme','27':'Eure','28':'Eure-et-Loir','29':'Finistère','30':'Gard',
  '31':'Haute-Garonne','32':'Gers','33':'Gironde','34':'Hérault','35':'Ille-et-Vilaine',
  '36':'Indre','37':'Indre-et-Loire','38':'Isère','39':'Jura','40':'Landes',
  '41':'Loir-et-Cher','42':'Loire','43':'Haute-Loire','44':'Loire-Atlantique','45':'Loiret',
  '46':'Lot','47':'Lot-et-Garonne','48':'Lozère','49':'Maine-et-Loire','50':'Manche',
  '51':'Marne','52':'Haute-Marne','53':'Mayenne','54':'Meurthe-et-Moselle','55':'Meuse',
  '56':'Morbihan','57':'Moselle','58':'Nièvre','59':'Nord','60':'Oise',
  '61':'Orne','62':'Pas-de-Calais','63':'Puy-de-Dôme','64':'Pyrénées-Atl.','65':'H-Pyrénées',
  '66':'Pyrénées-Or.','67':'Bas-Rhin','68':'Haut-Rhin','69':'Rhône','70':'H-Saône',
  '71':'Saône-et-Loire','72':'Sarthe','73':'Savoie','74':'Haute-Savoie','75':'Paris',
  '76':'Seine-Maritime','77':'Seine-et-Marne','78':'Yvelines','79':'Deux-Sèvres','80':'Somme',
  '81':'Tarn','82':'Tarn-et-Garonne','83':'Var','84':'Vaucluse','85':'Vendée',
  '86':'Vienne','87':'Haute-Vienne','88':'Vosges','89':'Yonne','90':'T-de-Belfort',
  '91':'Essonne','92':'Hauts-de-Seine','93':'Seine-St-Denis','94':'Val-de-Marne','95':'Val-d\'Oise',
}

// ─── TNT Parser ───────────────────────────────────────────────────────────────

export function parseTNT(text: string): TNTRow[] {
  const lines = text.split('\n').map(l => l.trim()).filter(l => l)
  const refMap: Record<string, TNTRow> = {}

  for (const line of lines) {
    const dateM = line.match(/^(\d{2}\/\d{2})/)
    if (!dateM) continue

    const refs = line.match(/S\d{5}/g)
    if (!refs) continue

    const deptM = line.match(/FR(\d{2})\s/)
    const dept = deptM ? deptM[1] : '??'

    // Poids : dernier nombre xx,xx avant fin de ligne
    const weightM = line.match(/([\d]{1,2}[,.][\d]{2})\s*E?\s*$/)
    const weight = weightM ? parseFloat(weightM[1].replace(',', '.')) : 0

    // Destinataire : texte entre BONDY et FR\d{2}
    const destM = line.match(/BONDY\s+([A-ZÉÀÜÎÔÙÛ][A-ZÉÀÜa-zéàüîôùû\s'&\-\.]+?)\s+FR\d{2}/)
    const dest = destM ? destM[1].trim() : ''

    const date = dateM[1]

    for (const ref of refs) {
      if (!refMap[ref]) {
        refMap[ref] = { ref, dest, dept, weight: 0, transportHT: 0, date }
      }
      // Tarification simplifiée TNT France : ~7€ base + 0.4€/kg (approximation)
      // On utilise le poids pour estimer; le montant réel sera dans la facture agrégée
      refMap[ref].weight += weight
      refMap[ref].transportHT += weight > 0 ? Math.round((6.5 + weight * 0.35) * 100) / 100 : 6.5
      if (!refMap[ref].dest && dest) refMap[ref].dest = dest
    }
  }

  return Object.values(refMap).sort((a, b) => a.ref.localeCompare(b.ref))
}

// ─── Odoo CSV Parser ──────────────────────────────────────────────────────────

export function parseOdoo(text: string): OdooRow[] {
  const lines = text.split('\n').filter(l => l.trim())
  if (lines.length < 2) return []

  const sep = lines[0].split(';').length > lines[0].split(',').length ? ';' : ','
  const rawHeaders = lines[0].split(sep).map(h => h.trim().replace(/['"]/g, '').toLowerCase())

  const findCol = (...keys: string[]) =>
    rawHeaders.findIndex(h => keys.some(k => h.includes(k)))

  const refIdx    = findCol('référence', 'reference', 'commande', 'order', 'name', 'numero', 'numéro')
  const amtIdx    = findCol('montant', 'amount', 'total', 'prix', 'untaxed', 'ht')
  const clientIdx = findCol('client', 'partner', 'partenaire', 'customer', 'nom')

  const rows: OdooRow[] = []

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(sep).map(c => c.trim().replace(/^["']|["']$/g, ''))
    const rawRef = cols[refIdx >= 0 ? refIdx : 0] || ''
    const refM = rawRef.match(/S\d{5}/)
    if (!refM) continue

    const amtStr = cols[amtIdx >= 0 ? amtIdx : 1] || '0'
    const amount = parseFloat(amtStr.replace(',', '.').replace(/[^\d.]/g, '')) || 0
    const client = cols[clientIdx >= 0 ? clientIdx : 2] || rawRef

    rows.push({ ref: refM[0], rawRef, client, commandeHT: amount })
  }

  return rows
}

// ─── Cross-join ───────────────────────────────────────────────────────────────

export function crossData(tntRows: TNTRow[], odooRows: OdooRow[]): CrossedRow[] {
  const odooMap: Record<string, OdooRow> = {}
  odooRows.forEach(r => { odooMap[r.ref] = r })

  const tntMap: Record<string, TNTRow> = {}
  tntRows.forEach(r => { tntMap[r.ref] = r })

  const result: CrossedRow[] = []
  const seen = new Set<string>()

  // TNT rows
  for (const tnt of tntRows) {
    seen.add(tnt.ref)
    const odoo = odooMap[tnt.ref]
    const commandeHT = odoo?.commandeHT ?? 0
    const pct = commandeHT > 0 ? (tnt.transportHT / commandeHT) * 100 : 0
    result.push({
      ref: tnt.ref,
      client: odoo?.client || tnt.dest,
      dept: tnt.dept,
      weight: tnt.weight,
      transportHT: tnt.transportHT,
      commandeHT,
      pct,
      matched: !!odoo,
    })
  }

  // Odoo-only rows
  for (const odoo of odooRows) {
    if (!seen.has(odoo.ref)) {
      result.push({
        ref: odoo.ref,
        client: odoo.client,
        dept: '??',
        weight: 0,
        transportHT: 0,
        commandeHT: odoo.commandeHT,
        pct: 0,
        matched: false,
        odooOnly: true,
      })
    }
  }

  return result.sort((a, b) => b.pct - a.pct)
}

// ─── Stats ────────────────────────────────────────────────────────────────────

export interface Stats {
  totalColis: number
  totalTransport: number
  totalCommande: number
  avgPct: number
  avgTransportParColis: number
  matchedCount: number
  tntOnlyCount: number
  odooOnlyCount: number
  over10Pct: number
  over20Pct: number
  topDepts: Array<{ dept: string; name: string; count: number; transport: number }>
  topClients: Array<{ client: string; count: number; transport: number; commande: number; pct: number }>
  distrib: Record<string, number>
}

export function computeStats(crossed: CrossedRow[]): Stats {
  const matched = crossed.filter(r => r.matched)

  const totalTransport = matched.reduce((s, r) => s + r.transportHT, 0)
  const totalCommande  = matched.reduce((s, r) => s + r.commandeHT, 0)
  const avgPct         = totalCommande > 0 ? (totalTransport / totalCommande) * 100 : 0
  const avgTransportParColis = matched.length > 0 ? totalTransport / matched.length : 0

  // Dept map
  const deptMap: Record<string, { count: number; transport: number }> = {}
  matched.forEach(r => {
    if (!deptMap[r.dept]) deptMap[r.dept] = { count: 0, transport: 0 }
    deptMap[r.dept].count++
    deptMap[r.dept].transport += r.transportHT
  })
  const topDepts = Object.entries(deptMap)
    .map(([dept, v]) => ({ dept, name: DEPT_NAMES[dept] || dept, ...v }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 20)

  // Client map
  const clientMap: Record<string, { count: number; transport: number; commande: number }> = {}
  matched.forEach(r => {
    const k = r.client || r.ref
    if (!clientMap[k]) clientMap[k] = { count: 0, transport: 0, commande: 0 }
    clientMap[k].count++
    clientMap[k].transport += r.transportHT
    clientMap[k].commande  += r.commandeHT
  })
  const topClients = Object.entries(clientMap)
    .map(([client, v]) => ({ client, ...v, pct: v.commande > 0 ? (v.transport / v.commande) * 100 : 0 }))
    .sort((a, b) => b.transport - a.transport)
    .slice(0, 15)

  // Distribution
  const distrib: Record<string, number> = { '<3%': 0, '3–5%': 0, '5–8%': 0, '8–12%': 0, '12–20%': 0, '>20%': 0 }
  matched.forEach(r => {
    const p = r.pct
    if (p < 3) distrib['<3%']++
    else if (p < 5) distrib['3–5%']++
    else if (p < 8) distrib['5–8%']++
    else if (p < 12) distrib['8–12%']++
    else if (p < 20) distrib['12–20%']++
    else distrib['>20%']++
  })

  return {
    totalColis: matched.length,
    totalTransport,
    totalCommande,
    avgPct,
    avgTransportParColis,
    matchedCount: matched.length,
    tntOnlyCount: crossed.filter(r => !r.matched && !r.odooOnly).length,
    odooOnlyCount: crossed.filter(r => r.odooOnly).length,
    over10Pct: matched.filter(r => r.pct > 10).length,
    over20Pct: matched.filter(r => r.pct > 20).length,
    topDepts,
    topClients,
    distrib,
  }
}

// ─── Demo data ────────────────────────────────────────────────────────────────

export const DEMO_TNT = `02/02 WALA France FR93 BONDY BIO&CO LE MARCHE FR13 SALON DE PROVENCE A V S58606 5,34 E
02/02 WALA France FR93 BONDY BIOCOOP LES 7 EPIS FR56 LORIENT A V S58612 8,68 E
02/02 WALA France FR93 BONDY BRIN D HERBE FR74 ANNECY A V S58396 5,51 E
02/02 WALA France FR93 BONDY GRANDE PHARMACIE FR59 CAMBRAI A V S58619 9,02 E
02/02 WALA France FR93 BONDY HERBES ET BIENFAITS FR69 ST GENIS LAVAL A V S58555 5,34 E
03/02 WALA France FR93 BONDY ATELIER BIOTY FR60 GOUVIEUX A V S58594 8,68 E
03/02 WALA France FR93 BONDY COTE NATURE HORBOURG FR68 HORBOURG WIHR A S59273 13,90 E
03/02 WALA France FR93 BONDY LE SOIN FR35 VITRE A V S58665 8,68 E
04/02 WALA France FR93 BONDY BIOCOOP BIOSAVEURS FR50 COUTANCES A V S59340 8,68 E
04/02 WALA France FR93 BONDY GRANDE PHARMACIE DE W FR59 LILLE A V S58556 8,68 E
04/02 WALA France FR93 BONDY MADRE BIO FR13 ST REMY A V S59345 8,68 E
05/02 WALA France FR93 BONDY BIOMONDE HOLYSPHERA FR73 BOURG ST MAURICE A S59379 7,10 E
05/02 WALA France FR93 BONDY HARMONIE NATURE FR59 LILLE A S59346 9,90 E
05/02 WALA France FR93 BONDY TERRES ESSENTIELLES FR44 NANTES A S59315 5,51 E
09/02 WALA France FR93 BONDY ABC BIO FR59 MARLY A V S59584 5,34 E
09/02 WALA France FR93 BONDY ETIK ET BIO A167 FR45 ST DENIS EN VAL A V S59588 9,02 E
10/02 WALA France FR93 BONDY COOP NATURE TOURS FR37 TOURS A V S59581 5,51 E
10/02 WALA France FR93 BONDY LA FERMIERE A017 FR31 PORTET SUR GARONNE A V S59608 9,02 E
10/02 WALA France FR93 BONDY LE RETOUR A LA TERRE FR75 PARIS 05 A V S59524 8,68 E
11/02 WALA France FR93 BONDY HERBORIS JACOBINS FR69 LYON 02 A S59712 11,50 E
11/02 WALA France FR93 BONDY LA VIE CLAIRE CROZON FR29 CROZON A S50642 5,34 E
12/02 WALA France FR93 BONDY COTE NATURE HORBOURG FR68 HORBOURG WIHR A S59794 9,20 E
12/02 WALA France FR93 BONDY L ESPRIT BIO FR68 COLMAR A V S59323 5,51 E
13/02 WALA France FR93 BONDY LA MAISON DR HAUSCHKA FR75 PARIS 11 A V S55533 8,52 E
13/02 WALA France FR93 BONDY PHARMACIE KERGROIX FR56 HENNEBONT A V S58448 9,02 E
16/02 WALA France FR93 BONDY COOP NATURE CHAMBRAY FR37 CHAMBRAY LES TOURS A V S58240 1,84 E
16/02 WALA France FR93 BONDY GRANDE PHARMACIE DE R FR35 RENNES A V S58055 8,68 E
16/02 WALA France FR93 BONDY LUBERON BIO FR84 APT A S58463 8,68 E
17/02 WALA France FR93 BONDY DEPOT FLOIRAC FR33 FLOIRAC A S58357 11,60 E
17/02 WALA France FR93 BONDY LA VIE CLAIRE GRENOBL FR38 GRENOBLE A V S58636 8,68 E
18/02 WALA France FR93 BONDY HERBORIS JACOBINS FR69 LYON 02 A V S58532 5,51 E
18/02 WALA France FR93 BONDY LE MARCHE DE LEOPOLD FR33 GUJAN MESTRAS A V S59992 8,68 E
19/02 WALA France FR93 BONDY AROMA BEAUTE FR69 LYON 04 A V S58471 8,68 E
19/02 WALA France FR93 BONDY COTE NATURE HORBOURG FR68 HORBOURG WIHR A S59292 8,85 E
20/02 WALA France FR93 BONDY LA MAISON DR HAUSCHKA FR75 PARIS 11 A S60104 11,10 E
23/02 WALA France FR93 BONDY BIOCOOP MAUGES VAL FR44 ST GEREON A V S60143 8,85 E
23/02 WALA France FR93 BONDY ENTREPOT PHARMACIE FR59 VILLENEUVE D ASCQ A V S58622 5,34 E
24/02 WALA France FR93 BONDY PHARMACIE DU POLYGONE FR34 CASTELNAU LE LEZ A S60217 10,30 E
25/02 WALA France FR93 BONDY ATITLAN FR29 QUIMPER A V S60264 9,19 E
26/02 WALA France FR93 BONDY UNIVEDA FR07 AUBENAS A V S60297 9,19 E`

export const DEMO_ODOO = `Référence;Client;Montant HT
S58606;BIO&CO LE MARCHE SALON;145.50
S58612;BIOCOOP LES 7 EPIS LORIENT;289.00
S58396;BRIN D HERBE ANNECY;78.30
S58619;GRANDE PHARMACIE CAMBRAI;520.00
S58555;HERBES ET BIENFAITS LYON;95.60
S58594;ATELIER BIOTY GOUVIEUX;210.00
S59273;COTE NATURE HORBOURG;445.00
S58665;LE SOIN VITRE;312.00
S59340;BIOCOOP BIOSAVEURS COUTANCES;178.50
S58556;GRANDE PHARMACIE LILLE;680.00
S59345;MADRE BIO ST REMY;234.00
S59379;BIOMONDE HOLYSPHERA;156.00
S59346;HARMONIE NATURE LILLE;298.00
S59315;TERRES ESSENTIELLES NANTES;445.80
S59584;ABC BIO MARLY;123.00
S59588;ETIK ET BIO ORLEANS;267.00
S59581;COOP NATURE TOURS;389.00
S59608;LA FERMIERE PORTET;412.00
S59524;LE RETOUR A LA TERRE PARIS;678.00
S59712;HERBORIS JACOBINS LYON;534.00
S50642;LA VIE CLAIRE CROZON;189.00
S59794;COTE NATURE HORBOURG;223.00
S59323;L ESPRIT BIO COLMAR;312.00
S55533;LA MAISON DR HAUSCHKA PARIS;1245.00
S58448;PHARMACIE KERGROIX HENNEBONT;345.00
S58240;COOP NATURE CHAMBRAY;289.00
S58055;GRANDE PHARMACIE RENNES;567.00
S58463;LUBERON BIO APT;198.00
S58357;DEPOT FLOIRAC;890.00
S58636;LA VIE CLAIRE GRENOBLE;423.00
S58532;HERBORIS JACOBINS LYON;534.00
S59992;LE MARCHE DE LEOPOLD GIRONDE;267.00
S58471;AROMA BEAUTE LYON;312.00
S59292;COTE NATURE HORBOURG;198.00
S60104;LA MAISON DR HAUSCHKA PARIS;1567.00
S60143;BIOCOOP MAUGES VAL DE;345.00
S58622;ENTREPOT PHARMACIE ASCQ;789.00
S60217;PHARMACIE DU POLYGONE;456.00
S60264;ATITLAN QUIMPER;234.00
S60297;UNIVEDA AUBENAS;178.00`
