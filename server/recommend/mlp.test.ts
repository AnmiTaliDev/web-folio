import { describe, expect, it } from 'vitest'
import { trainMlp, type TrainingExample } from './mlp.ts'

const examples: TrainingExample[] = [
  { embedding: [1, 0, 0, 0], label: 1 },
  { embedding: [0.9, 0.1, 0, 0], label: 1 },
  { embedding: [0.8, 0, 0.2, 0], label: 1 },
  { embedding: [0, 1, 0, 0], label: 0 },
  { embedding: [0, 0.9, 0, 0.1], label: 0 },
  { embedding: [0.1, 0.8, 0.1, 0], label: 0 },
]
const probes = [
  [1, 0, 0, 0],
  [0, 1, 0, 0],
  [0.5, 0.5, 0, 0],
]

describe('trainMlp', () => {
  it('produces identical predictions for the same seed', async () => {
    const first = (await trainMlp(examples, 4, 7))(probes)
    const second = (await trainMlp(examples, 4, 7))(probes)
    expect(second).toEqual(first)
  })

  it('learns to separate liked and disliked examples', async () => {
    const predict = await trainMlp(examples, 4, 7)
    const [liked, disliked] = predict(probes)
    expect((liked ?? 0) > (disliked ?? 1)).toBe(true)
    expect(liked).toBeGreaterThan(0.5)
    expect(disliked).toBeLessThan(0.5)
  })

  it('returns probabilities between 0 and 1', async () => {
    const predict = await trainMlp(examples, 4, 7)
    for (const value of predict(probes)) {
      expect(value).toBeGreaterThanOrEqual(0)
      expect(value).toBeLessThanOrEqual(1)
    }
  })
})
