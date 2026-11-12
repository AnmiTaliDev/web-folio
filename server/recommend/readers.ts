export function similarReaderShares(
  likedByUser: Set<string>,
  likesByOtherUser: Map<string, Set<string>>,
  candidateIds: string[],
): Map<string, number> {
  const overlapping: Set<string>[] = []
  for (const likes of likesByOtherUser.values()) {
    for (const id of likedByUser) {
      if (likes.has(id)) {
        overlapping.push(likes)
        break
      }
    }
  }
  const shares = new Map<string, number>()
  if (overlapping.length === 0) {
    return shares
  }
  for (const id of candidateIds) {
    let count = 0
    for (const likes of overlapping) {
      if (likes.has(id)) {
        count++
      }
    }
    shares.set(id, count / overlapping.length)
  }
  return shares
}
