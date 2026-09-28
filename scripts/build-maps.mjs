// ─────────────────────────────────────────────────────────────
//  Turns the raw map packages into small, pre-projected JSON files
//  in src/data/maps/. Run it again only if you change the maps:
//    npm run maps
//  Output per region: { id, name, d (SVG path), w (weight for "% of") }
// ─────────────────────────────────────────────────────────────
import { geoArea, geoEqualEarth, geoPath } from 'd3-geo'
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { createRequire } from 'node:module'
import { feature, merge } from 'topojson-client'
import { presimplify, quantile, simplify } from 'topojson-simplify'

const require = createRequire(import.meta.url)
const out = new URL('../src/data/maps/', import.meta.url)
mkdirSync(out, { recursive: true })
const json = (p) => JSON.parse(readFileSync(require.resolve(p), 'utf8'))
const save = (name, data) => {
  writeFileSync(new URL(`${name}.json`, out), JSON.stringify(data))
  console.log(`${name}: ${data.regions.length} regions`)
}
const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

/* ── World ─────────────────────────────────────────────────── */
{
  // 50m keeps small island nations; simplify away detail nobody sees at poster size
  const pre = presimplify(json('world-atlas/countries-50m.json'))
  const topo = simplify(pre, quantile(pre, 0.12))
  const geoms = topo.objects.countries.geometries

  // Friendlier names than Natural Earth's abbreviations
  const RENAME = {
    'United States of America': 'United States', 'Dem. Rep. Congo': 'DR Congo', 'Central African Rep.': 'Central African Republic',
    'Bosnia and Herz.': 'Bosnia and Herzegovina', 'Dominican Rep.': 'Dominican Republic', 'Eq. Guinea': 'Equatorial Guinea',
    'S. Sudan': 'South Sudan', 'W. Sahara': 'Western Sahara', 'Solomon Is.': 'Solomon Islands', 'Marshall Is.': 'Marshall Islands',
    'N. Mariana Is.': 'Northern Mariana Islands', 'U.S. Virgin Is.': 'US Virgin Islands', 'British Virgin Is.': 'British Virgin Islands',
    'Cayman Is.': 'Cayman Islands', 'Turks and Caicos Is.': 'Turks and Caicos', 'Falkland Is.': 'Falkland Islands', 'Faeroe Is.': 'Faroe Islands',
    'Cook Is.': 'Cook Islands', 'Pitcairn Is.': 'Pitcairn Islands', 'Fr. Polynesia': 'French Polynesia', 'St. Vin. and Gren.': 'St Vincent and the Grenadines',
    'St. Kitts and Nevis': 'St Kitts and Nevis', 'Antigua and Barb.': 'Antigua and Barbuda', 'St. Pierre and Miquelon': 'St Pierre and Miquelon',
    'Wallis and Futuna Is.': 'Wallis and Futuna', 'S. Geo. and the Is.': 'South Georgia', 'Br. Indian Ocean Ter.': 'British Indian Ocean Territory',
    'Fr. S. Antarctic Lands': 'French Southern Lands', 'Heard I. and McDonald Is.': 'Heard and McDonald Islands', 'eSwatini': 'Eswatini',
    'Macedonia': 'North Macedonia', "Côte d'Ivoire": 'Côte d’Ivoire', 'Czechia': 'Czechia',
  }
  // Pieces folded into a neighbour (so each is one tappable country)
  const FOLD = { 'Siachen Glacier': 'India', 'N. Cyprus': 'Cyprus', Somaliland: 'Somalia' }
  // Too small / uninhabited to be worth a tap, plus Antarctica (keeps the poster tidy)
  const DROP = new Set(['Antarctica', 'Ashmore and Cartier Is.', 'Indian Ocean Ter.'])

  const groups = new Map()
  for (const g of geoms) {
    const raw = g.properties.name
    if (DROP.has(raw)) continue
    const key = FOLD[raw] ?? raw
    if (!groups.has(key)) groups.set(key, { id: null, parts: [] })
    const grp = groups.get(key)
    grp.parts.push(g)
    if (!FOLD[raw]) grp.id = g.id ?? slug(raw)
  }

  const land = { type: 'FeatureCollection', features: [] }
  const items = []
  for (const [name, { id, parts }] of groups) {
    const geometry = parts.length === 1 ? feature(topo, parts[0]).geometry : merge(topo, parts)
    const f = { type: 'Feature', geometry }
    land.features.push(f)
    items.push({ id: String(id), name: RENAME[name] ?? name, f })
  }

  const W = 1000
  const projection = geoEqualEarth().fitWidth(W, land)
  const path = geoPath(projection).digits(1)
  const [[, y0], [, y1]] = path.bounds(land)
  const H = Math.ceil(y1 - y0) + 8
  projection.translate([projection.translate()[0], projection.translate()[1] - y0 + 4])

  const total = items.reduce((s, i) => s + geoArea(i.f), 0)
  const regions = items
    .map(({ id, name, f }) => ({ id, name, d: path(f), w: +(geoArea(f) / total).toFixed(6) }))
    .filter((r) => r.d)
    .sort((a, b) => a.name.localeCompare(b.name))
  save('world', { viewBox: `0 0 ${W} ${H}`, regions })
}

/* ── India (states & union territories) ────────────────────── */
{
  const india = (await import('@svg-maps/india')).default
  const byId = Object.fromEntries(india.locations.map((l) => [l.id, l]))
  const RENAME = { jk: 'Jammu & Kashmir and Ladakh', an: 'Andaman & Nicobar Islands' }
  const regions = india.locations
    .filter((l) => l.id !== 'dd')
    .map((l) =>
      l.id === 'dn'
        ? { id: 'dn', name: 'Dadra & Nagar Haveli and Daman & Diu', d: `${l.path} ${byId.dd.path}` }
        : { id: l.id, name: RENAME[l.id] ?? l.name, d: l.path },
    )
    .map((r) => ({ ...r, w: 1 }))
    .sort((a, b) => a.name.localeCompare(b.name))
  save('india', { viewBox: india.viewBox, regions })
}

/* ── United States (already projected, Albers USA) ─────────── */
{
  const topo = json('us-atlas/states-albers-10m.json')
  const path = geoPath().digits(1)
  const regions = feature(topo, topo.objects.states)
    .features.map((f) => ({ id: f.id, name: f.properties.name, d: path(f), w: 1 }))
    .sort((a, b) => a.name.localeCompare(b.name))
  save('usa', { viewBox: '-4 -4 983 618', regions })
}
