export function precisionAtK(ranked: string[], relevant: Set<string>, k: number): number {
  const hits = ranked.slice(0, k).filter((id) => relevant.has(id)).length
  return hits / k
}

export function ndcgAtK(ranked: string[], relevant: Set<string>, k: number): number {
  let dcg = 0
  ranked.slice(0, k).forEach((id, index) => {
    if (relevant.has(id)) {
      dcg += 1 / Math.log2(index + 2)
    }
  })
  let ideal = 0
  for (let index = 0; index < Math.min(k, relevant.size); index++) {
    ideal += 1 / Math.log2(index + 2)
  }
  return ideal === 0 ? 0 : dcg / ideal
}
