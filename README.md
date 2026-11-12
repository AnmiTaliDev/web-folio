# Folio

Web app that recommends books from the user's interests and ratings, explains each recommendation, and includes an AI librarian chat and a book of the day.

## Dependencies

- Node.js 24 or newer and npm
- Flutter 3.47 or newer (3.47.9 is used in CI)
- Optional, for the chat and generated descriptions: an OpenAI-compatible LLM endpoint (DeepSeek or Qwen) and an OpenAI-compatible embeddings endpoint (for example Qwen `text-embedding-v3`)
- Open Library data dumps (ratings, editions, works, authors) for the full catalog

## Build

```sh
npm ci
npm run lint
npm run typecheck
npm test

cd app
flutter pub get
flutter analyze
flutter test
flutter build web --release --no-web-resources-cdn
```

The Flutter analyzer fails when the project path contains non-ASCII characters. Run it from an ASCII path in that case.

## Run

The server stores data in one SQLite file and serves both the API and the built web app from `app/build/web`.

```sh
node scripts/seed-sample.ts
npm start
```

Open http://localhost:3000. `scripts/seed-sample.ts` adds 12 sample books so the app has something to show. Use the Catalog section for the full catalog.

## Configuration

Variables are read from the environment and from `.env.local` in the project root (ignored by git). All of them are optional.

- `PORT` (default 3000)
- `DATABASE_PATH` (default `data/folio.db`)
- `WEB_ROOT` (default `app/build/web`)
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

The app bundles Roboto Flex from https://github.com/googlefonts/roboto-flex under the SIL Open Font License 1.1 (`app/assets/fonts/OFL.txt`).

## License

[GNU Affero General Public License v3.0](LICENSE)
