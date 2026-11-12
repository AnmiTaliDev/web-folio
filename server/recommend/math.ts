import { NEGATIVE_WEIGHT } from './constants.ts'

export function dot(a: number[], b: number[]): number {
  let sum = 0
  for (let i = 0; i < a.length; i++) {
    sum += (a[i] ?? 0) * (b[i] ?? 0)
  }
  return sum
}

export function norm(a: number[]): number {
  return Math.sqrt(dot(a, a))
}

export function normalize(a: number[]): number[] {
  const length = norm(a)
  if (length === 0) {
    return a.map(() => 0)
  }
  return a.map((value) => value / length)
}

export function cosine(a: number[], b: number[]): number {
  const denominator = norm(a) * norm(b)
  if (denominator === 0) {
    return 0
  }
  return dot(a, b) / denominator
}

export function sumVectors(vectors: number[][], dim: number): number[] {
  const total = new Array<number>(dim).fill(0)
  for (const vector of vectors) {
    for (let i = 0; i < dim; i++) {
      total[i] = (total[i] ?? 0) + (vector[i] ?? 0)
    }
  }
  return total
}

export function profileVector(liked: number[][], disliked: number[][], dim: number): number[] {
  const positive = sumVectors(liked, dim)
  const negative = sumVectors(disliked, dim)
  return normalize(positive.map((value, i) => value - NEGATIVE_WEIGHT * (negative[i] ?? 0)))
}
