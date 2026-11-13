# Folio

Web app that recommends books from the user's interests and ratings, explains each recommendation, and includes an AI librarian chat and a book of the day.

Folio is a service, not a self-hosted product. This repository is the source code of that service, written for a school competition. You may host it, and the licenses allow it, but its architecture is not built for that: one Node process, one SQLite file, an in-memory vector index, no migration framework, no administration interface and no deployment automation. Hosting it yourself means working around those limits on your own, and there is no support for it.

You are not restricted to running it as is. If you need only a part, take it: the recommendation model (`server/recommend`), the bundled catalog dataset (`catalog/`, CC BY-SA 4.0) or the interface (`web/`). If you do not like how Folio works, fork it. The code is under GNU AGPL 3.0 and the catalog under CC BY-SA 4.0, and those licenses are the only conditions.

## Dependencies

- Node.js 24 or newer and npm
- Optional, for the chat and generated descriptions: an OpenAI-compatible LLM endpoint (DeepSeek or Qwen) and an OpenAI-compatible embeddings endpoint (for example Qwen `text-embedding-v3`)
- Optional, for a larger catalog than the bundled one: Open Library data dumps (ratings, editions, works, authors)

## Build

```sh
npm ci
npm run lint
npm run typecheck
npm test

cd web
npm ci
npm run typecheck
npm test
npm run build
```

The web interface is in `web/`: SolidJS, Tailwind CSS 4, Material Web components and Material Color Utilities. For development run `npm run dev` in `web/` with the server running on port 3000; Vite proxies `/api` to it.

The Legal section of the settings shows the licenses of the code, the catalog and the font, and reads their full texts from `LICENSE`, `catalog/LICENSE` and `web/src/assets/fonts/OFL.txt`. To show a link to the source code there, which AGPL-3.0 section 13 requires for a modified version offered over a network, set `VITE_SOURCE_URL` to the repository address when building, for example `VITE_SOURCE_URL=https://example.org/folio npm run build`.

`THIRD_PARTY_NOTICES.md` lists every component that ships with or is required by the application, with its license and the full license text. It is also shown in the Legal section of the settings, where the acknowledgements are. Regenerate both after changing dependencies:

```sh
npm run notices
```

The previous Flutter interface is kept in `archive/flutter-app/` and is not built or tested by CI.

## End-to-end tests

`npm run e2e` builds the web interface, starts the server on port 3200 with a temporary database and runs the Playwright tests in `e2e/` in Chromium. Install the browser once with `npx playwright install chromium`, or point the tests at an installed one with `E2E_CHROMIUM=/usr/bin/chromium`. The server is started with `RATE_LIMITS=off` so that the tests can register many accounts.

## Run

The server stores data in one SQLite file and serves both the API and the built web app from `web/dist`.

```sh
npm start
```

Open http://localhost:3000. On the first start with an empty database the server loads the bundled catalog.

## Accounts and private mode

Without an account the app runs in a private mode: the server creates no user, sets no cookie and stores nothing. Search, popular books and book pages are available. Ratings, personal recommendations, the book of the day, the chat and the wishlist need an account.

An account is a username and a password, and creating one requires accepting the terms of service. The version and time of acceptance are stored with the account. The terms are shown on `/terms` and in the Legal section; their text and version live in `web/src/i18n/terms.ts`, and `server/shared/terms.ts` must carry the same version (a test checks it). When the version is raised, every signed in user whose stored version differs is asked to accept the new one in a dialog before continuing (`POST /api/auth/terms`). No email is collected. Passwords are hashed with scrypt and never stored in plain text. Registration returns a one-time recovery code, the only way to reset a forgotten password. A recovery resets the password, issues a new code and closes all sessions. Failed logins, recoveries, password changes and confirmations are limited to 5 per 15 minutes per username or user.

Each book can be put on one shelf: want to read, reading or read (`/api/shelf`, which also backs the older `/api/wishlist`). The library page (`/library`) lists the shelves and the liked and disliked books. The chat history is stored per user, shown again when the chat is opened and can be cleared.

Settings let a signed in user change the username (password required), see the creation date of the account, list the devices signed in with their last activity and end any of those sessions, change the password, get a new recovery code (password required), sign out on all devices, switch personalization and AI descriptions, view all stored data, and delete the account (password required). Users without an account that were created by older versions are removed when the server starts.

## Appearance

The settings have an Appearance section modeled on Material You: a theme (system, light or dark), a seed color (the Folio brand, eleven presets or any color from the picker), a palette style (vibrant, calm, neutral, expressive, match the color) and a contrast level (standard, medium, high). The palette is generated from the seed with `@material/material-color-utilities` and applied at once; the choice is stored on the device in `localStorage`. The default is the Folio brand color with its coral accent.

Book pages show the overview, the first publication year, the reading level, the length, the themes (each links to the catalog filtered by that theme, `/catalog?theme=...`) and up to six similar books from `GET /api/books/:id/similar`, ranked by shared themes (twice the weight), shared genres and the same author. Not every book has an overview yet: the facts and themes are filled in for the whole catalog, the overviews are added in batches.

## Age filter

Folio does not check age. The user can switch on an age filter in the settings and pick a level (6+, 12+, 16+, 18+) to hide books marked older than that. For a visitor without an account the choice is kept on the device and sent as the `X-Max-Age` header. For a signed in user it is saved in the profile (`maxAge`) and the server applies it to search, popular books, the catalog, recommendations, the book of the day and the chat candidates. A direct link to a book opens regardless of the filter.

## Configuration

Variables are read from the environment and from `.env.local` in the project root (ignored by git). All of them are optional.

- `PORT` (default 3000)
- `DATABASE_PATH` (default `data/folio.db`)
- `WEB_ROOT` (default `web/dist`)
- `RATE_LIMITS` (set to `off` to disable the registration, sign-in and recovery limits, meant for automated tests only)
- `TRUST_PROXY` (set to `1` behind a reverse proxy so that the client address is taken from `X-Forwarded-For`)
- `LLM_BASE_URL`, `LLM_API_KEY`, `LLM_MODEL`
- `EMBEDDINGS_BASE_URL`, `EMBEDDINGS_API_KEY`, `EMBEDDINGS_MODEL`, `EMBEDDING_DIM`

Without the LLM and embeddings variables the chat answers with an error and book descriptions come from the catalog. Recommendations by taste use embeddings stored in the database. Without embeddings the app recommends by popularity within the selected interests.

## Security and operation

Every response carries a Content-Security-Policy that allows only same-origin resources, plus `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy` and, behind HTTPS, `Strict-Transport-Security`. API responses are `no-store`; hashed files under `/assets/` are cached for a year. State-changing API requests whose `Origin` differs from the `Host` are rejected. Registration is limited to 5 per hour, sign-in to 30 per 15 minutes and recovery to 10 per hour per client address, in addition to the per-username failure limits.

The database schema is upgraded on start by the ordered list in `server/db/migrations.ts`; the applied version is kept in `pragma user_version`.

To back up the database run `node scripts/backup.ts`. It writes a consistent copy to `data/backups/folio-YYYYMMDD-HHMMSS.db` with `VACUUM INTO` and keeps the newest 14; `--out` and `--keep` change the directory and the count. Run it from cron or a timer.

## Bundled catalog

`catalog/books.jsonl` holds about 470 books, one JSON object per line: a stable `id` slug, `genres` (the eight interest genres), `year`, `original` (`ru` or `en`), `popularity` (1 to 100), `minAge` (0, 6, 12, 16 or 18, our own subjective mark, not an official classification), `themes` (2 to 5 of a fixed list of 28), `difficulty` (`easy`, `medium`, `hard`), `length` (`short` under 200 pages, `medium` up to 400, `long` up to 700, `epic` above) and two variants, `ru` and `en`, each with `title`, `authors`, a short `description` and an optional `overview` of 8 to 10 sentences without spoilers. The server answers in the language of the `Accept-Language` header (Russian for `ru`, English for anything else). Search matches titles and authors in both languages. The descriptions are written by hand and kept to the plot premise.

Book ids are UUIDs derived from the slug, so a book has the same id in every database. The server loads the file when the database has no books or no translations. To reload it after editing, run:

```sh
node scripts/load-catalog.ts
```

Existing rows are updated by slug. Rows written by the earlier format of the file (keys with a `|` in `source_key`) are removed, together with ratings and wishlist entries that point to them. Books have no embeddings, so recommendations use popularity and the chosen interests until the embeddings are generated with `scripts/ingest-catalog.ts`.

## Full catalog

Download the dumps from https://openlibrary.org/developers/dumps and check the selection without writing anything:

```sh
node scripts/ingest-catalog.ts \
  --ratings ol_dump_ratings.txt.gz \
  --editions ol_dump_editions.txt.gz \
  --works ol_dump_works.txt.gz \
  --authors ol_dump_authors.txt.gz \
  --dry-run
```

Run the same command without `--dry-run` and with the embeddings variables exported to embed the books and write them to the database. Add `--no-embeddings` to store the books without vectors. Options: `--limit` (default 25000), `--candidates` (default 80000), `--batch-size` (default 10), `--delay-ms` (default 300), `--progress` (default `~/.folio/ingest-progress.txt`). An interrupted run with embeddings continues from the progress file.

The genre mapping is in `server/catalog/genre-map.ts` and the excluded topics are in `server/catalog/banned-topics.ts`.

## Evaluation

```sh
node scripts/evaluate.ts --ratings ratings.csv
```

`ratings.csv` has the columns `user_id`, `isbn`, `value` (1 or -1). Books are read from the database by ISBN. To use a local file instead, pass `--books books.jsonl` with one JSON object per line: `isbn`, `embedding`, and optionally `title`, `authors`, `genres`, `popularity`. The script prints Precision@K and NDCG@K for K = 5 and 15 for popularity, cosine similarity and the MLP with the final score.

## Fonts and icons

The app bundles Roboto Flex from https://github.com/googlefonts/roboto-flex under the SIL Open Font License 1.1 (`web/src/assets/fonts/OFL.txt`). Icons come from the official Material Symbols Rounded variable font (Apache 2.0, the `material-symbols` package), reduced to the icons in use with the fill and optical size axes kept. To add an icon, add its name to `web/src/components/icons.ts` and run `python3 web/tools/subset-icons.py <new names>` from `web/` in an environment with `fonttools` and `brotli`.

## License

The code is under the [GNU Affero General Public License v3.0](LICENSE). The bundled catalog in `catalog/` is under the [Creative Commons Attribution-ShareAlike 4.0 International](catalog/LICENSE) license.
