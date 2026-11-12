export const COLD_START_MIN_RATINGS = 8
export const CANDIDATE_COUNT = 200
export const TOP_N = 15
export const MAX_BOOKS_PER_AUTHOR = 3
export const NEGATIVE_WEIGHT = 0.5
export const SIMILAR_READERS_MAX_USERS = 500

export const WEIGHTS = {
  signal: 0.6,
  genre: 0.25,
  readers: 0.15,
}

export const MLP = {
  hiddenUnits: 16,
  epochs: 80,
  learningRate: 0.01,
  seed: 42,
}
