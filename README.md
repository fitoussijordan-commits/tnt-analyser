# TNT × Odoo — Analyse Transport

Outil d'analyse pour croiser les factures TNT/FedEx avec les commandes Odoo et mesurer l'impact du coût de livraison.

## Fonctionnalités

- 📄 **Import facture TNT** — Fichier texte extrait du PDF TNT/FedEx
- 📊 **Import export Odoo** — CSV avec références commandes (S…), montants HT, clients
- 🔗 **Croisement automatique** — Via numéro de commande `S_____`
- 📈 **Dashboard complet** :
  - % transport moyen sur commande
  - Coût moyen par colis
  - Commandes avec transport > 10% ou > 20%
  - Top clients par coût transport
  - Distribution par département
  - Graphiques (distribution, top depts, couverture)
- ⬇️ **Export CSV** des résultats croisés

## Stack

- Next.js 14 (App Router)
- TypeScript
- Tailwind CSS
- Chart.js + react-chartjs-2
- react-dropzone
- papaparse

## Déploiement Vercel (rapide)

1. **Fork / clone ce repo sur GitHub**

2. **Connecter à Vercel**
   - Aller sur [vercel.com](https://vercel.com)
   - New Project → Import depuis GitHub
   - Sélectionner ce repo
   - Framework : Next.js (auto-détecté)
   - Cliquer **Deploy** ✓

C'est tout. Aucune variable d'environnement requise — l'app est 100% client-side.

## Développement local

```bash
npm install
npm run dev
```

Ouvrir [http://localhost:3000](http://localhost:3000)

## Format des fichiers

### Facture TNT (TXT)
Fichier texte issu de l'export PDF TNT. Chaque ligne de livraison doit contenir :
- Une date `DD/MM`
- Un département `FR\d\d`
- Une référence commande `S\d\d\d\d\d`
- Un poids `x,xx`

Exemple :
```
02/02 WALA France FR93 BONDY BIOCOOP LES 7 EPIS FR56 LORIENT A V S58612 8,68 E
```

### Export Odoo (CSV)
CSV avec séparateur `;` ou `,`, colonnes :

| Référence | Client | Montant HT |
|-----------|--------|------------|
| S58606 | BIO&CO LE MARCHE | 145.50 |

Exporter depuis Odoo : **Ventes → Commandes → Exporter → Référence + Partenaire + Montant non taxé**

## Licence

Usage interne Dr. Hauschka / WALA France
