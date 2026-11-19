export function encodeEmbedding(vector: number[]): Uint8Array {
  return new Uint8Array(new Float32Array(vector).buffer)
}

export function decodeEmbedding(blob: unknown): number[] | null {
  if (!(blob instanceof Uint8Array)) {
    return null
  }
  return Array.from(new Float32Array(Uint8Array.from(blob).buffer))
}
