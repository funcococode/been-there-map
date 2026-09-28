# Been There

Tap the countries, Indian states or US states you've visited to colour them in, then export a two-tone poster to share.

## Run it

Needs Node 22 (`nvm use`).

```bash
npm install
npm run dev
```

## What's inside

- **Three maps.** World (235 countries and territories), India (states and UTs) and USA (50 states and DC). Tiny places like Singapore, Delhi and DC get a square marker so you can still tap them.
- **Ways to fill it in.** Tap the map, or use the searchable list with its All / Been / Not yet filters. You can zoom with pinch, ctrl + scroll or the +/− buttons, and drag to pan.
- **Stats.** A count for each map, plus the share of the world's land you've covered.
- **Look.** A minimal UI in Geist with neutral greys, one accent colour (6 to choose from) and light/dark mode.
- **Poster studio.** Choose Portrait (4:5), Story (9:16) or Square, a Light or Dark print style and an accent colour, then add your name and the list of places. It exports a 2160px-wide PNG, or opens your phone's share sheet.
- **Share link.** It opens your map read-only for a friend, with a "Make my own" button.
- **Saving.** Everything is saved in the browser (localStorage). There's no backend.

## Files

| Path | What |
| --- | --- |
| `src/data/maps.js` | The three maps: labels, units and the stat shown for each |
| `src/data/maps/*.json` | Pre-projected map shapes (generated) |
| `scripts/build-maps.mjs` | Rebuilds those JSON files: `npm run maps` |
| `src/components/Poster.jsx` | The poster layout (one SVG) |
| `src/lib/exportPoster.js` | SVG → PNG, with fonts embedded |
| `src/lib/themes.js` + `src/index.css` | The neutral palette and accent colours (keep them in sync) |

## Map data

- World: [Natural Earth](https://www.naturalearthdata.com/) via `world-atlas`. Antarctica is left out. Siachen is folded into India, N. Cyprus into Cyprus and Somaliland into Somalia.
- USA: US Census via `us-atlas`.
- India: [`@svg-maps/india`](https://github.com/VictorCazanave/svg-maps) (CC BY 4.0). That map predates 2019, so Ladakh is drawn inside "Jammu & Kashmir and Ladakh". Dadra & Nagar Haveli and Daman & Diu are merged into one UT.
