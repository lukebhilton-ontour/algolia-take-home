# TableFinder — Algolia Restaurant Discovery Demo

A restaurant discovery search experience built with [Algolia](https://algolia.com) and [InstantSearch.js](https://www.algolia.com/doc/guides/building-search-ui/what-is-instantsearch/js/), for the Algolia Solutions Engineer take-home assignment.

## What's here

- **Data prep** ([scripts/prepare-data.cjs](scripts/prepare-data.cjs)) — joins the provided `restaurants_list.json` and `restaurants_info.csv` on `objectID`, cleans the inconsistently-formatted phone numbers, and parses `price_range` into numeric `price_min`/`price_max` for range filtering. See the file's header comment for the full list of assumptions verified against the data.
- **Indexing** ([scripts/index-data.cjs](scripts/index-data.cjs)) — pushes the prepared restaurant records into an Algolia `restaurants` index, plus a small curated `iconic_2014_moments` dataset into a second index, configuring searchable attributes, facets, and custom ranking for each.
- **Search UI** ([src/main.js](src/main.js), [src/style.css](src/style.css)) — a mobile-first InstantSearch.js UI with search, cuisine/price/dining-style facets, geo ("near me") search, and pagination.
- **Way Back When Machine** — a toggle in the header that swaps to a retro 2014-themed UI (the year OpenTable launched), searching only fun 2014 milestones (games, movies, tech) from the second index. A playful way to show search working over any dataset, not just restaurants.

## Setup

```bash
npm install
cp .env.example .env   # fill in your Algolia credentials
```

`.env` needs:

- `ALGOLIA_APP_ID` / `ALGOLIA_WRITE_API_KEY` — used server-side only, by the indexing script. Never committed, never shipped to the browser.
- `VITE_ALGOLIA_APP_ID` / `VITE_ALGOLIA_SEARCH_API_KEY` — the `VITE_` prefix is what Vite exposes to client code, so only the search-only key ever reaches the browser bundle.

Prepare and index the data (only needed once, or whenever the source data changes):

```bash
npm run prepare-data
npm run index-data
```

Run the dev server:

```bash
npm run dev
```

Build for production:

```bash
npm run build
```

## Deploying

Configured for Netlify via [netlify.toml](netlify.toml) (`npm run build`, publishes `dist/`). Set `VITE_ALGOLIA_APP_ID` and `VITE_ALGOLIA_SEARCH_API_KEY` as environment variables in the Netlify site settings — they're not committed to the repo.

## Architecture notes

- **InstantSearch.js** over building on the raw `algoliasearch-helper` directly — it ships accessible, mobile-responsive widgets out of the box (search box, facets, pagination) rather than hand-building widget state sync, which let the time budget go toward relevance tuning and the retro feature instead of UI plumbing.
- **Two Algolia indices** rather than one — `restaurants` and `iconic_2014_moments` are unrelated datasets with different searchable attributes and facets, so they're modeled as separate indices rather than forcing a shared schema.
- **Vite** replaces the original `parcel-bundler@1.9.7` boilerplate, which predates and doesn't run cleanly on current Node versions.
