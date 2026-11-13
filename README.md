# Folio

Web app that recommends books from the user's interests and ratings, explains each recommendation, and includes an AI librarian chat and a book of the day.

## Dependencies

- Node.js 24 or newer and npm
- Optional, for the chat and generated descriptions: an OpenAI-compatible LLM endpoint (DeepSeek or Qwen) and an OpenAI-compatible embeddings endpoint (for example Qwen `text-embedding-v3`)
- Open Library data dumps (ratings, editions, works, authors) for the full catalog

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

The previous Flutter interface is kept in `archive/flutter-app/` and is not built or tested by CI.

## Run

The server stores data in one SQLite file and serves both the API and the built web app from `web/dist`.

```sh
node scripts/seed-sample.ts
npm start
```

Open http://localhost:3000. `scripts/seed-sample.ts` adds 12 sample books so the app has something to show. Use the Catalog section for the full catalog.

## Accounts and private mode

Without an account the app runs in a private mode: the server creates no user, sets no cookie and stores nothing. Search, popular books and book pages are available. Ratings, personal recommendations, the book of the day, the chat and the wishlist need an account.

An account is a username and a password. No email is collected. Passwords are hashed with scrypt and never stored in plain text. Registration returns a one-time recovery code, the only way to reset a forgotten password. A recovery resets the password, issues a new code and closes all sessions. Failed logins, recoveries, password changes and confirmations are limited to 5 per 15 minutes per username or user.

Settings let a signed in user change the password, get a new recovery code (password required), sign out on all devices, switch personalization and AI descriptions, view all stored data, and delete the account (password required). Users without an account that were created by older versions are removed when the server starts.

## Configuration

Variables are read from the environment and from `.env.local` in the project root (ignored by git). All of them are optional.

- `PORT` (default 3000)
- `DATABASE_PATH` (default `data/folio.db`)
- `WEB_ROOT` (default `web/dist`)
- `LLM_BASE_URL`, `LLM_API_KEY`, `LLM_MODEL`
- `EMBEDDINGS_BASE_URL`, `EMBEDDINGS_API_KEY`, `EMBEDDINGS_MODEL`, `EMBEDDING_DIM`

Without the LLM and embeddings variables the chat answers with an error and book descriptions come from the catalog. Recommendations by taste use embeddings stored in the database. Without embeddings the app recommends by popularity within the selected interests.

## Catalog

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

## Fonts

The app bundles Roboto Flex from https://github.com/googlefonts/roboto-flex under the SIL Open Font License 1.1 (`web/src/assets/fonts/OFL.txt`).

## License

[GNU Affero General Public License v3.0](LICENSE)
