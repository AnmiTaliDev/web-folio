import { cosine, profileVector } from './math.ts'
import { trainMlp } from './mlp.ts'
import type { Mode } from './mode.ts'
import { contributions, genreMatch, popularityValue, totalScore, type ActiveComponents, type Components } from './scoring.ts'
import type { Book, Profile } from '../shared/types.ts'

export type ScoredBook = {
  book: Book
  score: number
  mode: Mode
  interests: string[]
  active: ActiveComponents
  components: Components
  contributions: Components
  likedMatch: { bookId: string; title: string } | null
}

export type PipelineInput = {
  mode: Mode
  profile: Profile
  liked: Book[]
  disliked: Book[]
  candidates: Book[]
  readers: Map<string, number>
  dim: number
  seed?: number
}

function withEmbedding(books: Book[]): (Book & { embedding: number[] })[] {
  return books.filter((book): book is Book & { embedding: number[] } => book.embedding !== null)
}

function nearestLiked(embedding: number[], liked: (Book & { embedding: number[] })[]): { bookId: string; title: string } | null {
  let best: { bookId: string; title: string } | null = null
  let bestSimilarity = -Infinity
  for (const book of liked) {
    const similarity = cosine(embedding, book.embedding)
    if (similarity > bestSimilarity) {
      bestSimilarity = similarity
      best = { bookId: book.id, title: book.title }
    }
  }
  return best
}

async function signalValues(input: PipelineInput, candidates: Book[]): Promise<number[]> {
  const liked = withEmbedding(input.liked)
  const disliked = withEmbedding(input.disliked)
  if (input.mode === 'popular') {
    const maxPopularity = Math.max(0, ...candidates.map((book) => book.popularity))
    return candidates.map((book) => popularityValue(book.popularity, maxPopularity))
  }
  const embeddings = candidates.map((book) => book.embedding ?? [])
  if (input.mode === 'profile') {
    const vector = profileVector(
      liked.map((book) => book.embedding),
      disliked.map((book) => book.embedding),
      input.dim,
    )
    return embeddings.map((embedding) => Math.max(0, cosine(vector, embedding)))
  }
  const examples = [
    ...liked.map((book) => ({ embedding: book.embedding, label: 1 as const })),
    ...disliked.map((book) => ({ embedding: book.embedding, label: 0 as const })),
  ]
  const predict = await trainMlp(examples, input.dim, input.seed)
  return predict(embeddings)
}

export async function scoreCandidates(input: PipelineInput): Promise<ScoredBook[]> {
  const candidates = input.mode === 'popular' ? input.candidates : withEmbedding(input.candidates)
  const signals = await signalValues(input, candidates)
  const liked = withEmbedding(input.liked)
  const active: ActiveComponents = {
    signal: true,
    genre: input.profile.interests.length > 0,
    readers: input.mode !== 'popular' && input.readers.size > 0,
  }

  return candidates.map((book, index) => {
    const components: Components = {
      signal: signals[index] ?? 0,
      genre: genreMatch(book.genres, input.profile.interests),
      readers: input.readers.get(book.id) ?? 0,
    }
    const parts = contributions(components, active)
    return {
      book,
      score: totalScore(parts, active),
      mode: input.mode,
      interests: input.profile.interests,
      active,
      components,
      contributions: parts,
      likedMatch: input.mode === 'popular' || !book.embedding ? null : nearestLiked(book.embedding, liked),
    }
  })
}
