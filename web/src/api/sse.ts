export type SseFrame = { event: string; data: string }

export function parseFrames(buffer: string): { frames: SseFrame[]; rest: string } {
  const frames: SseFrame[] = []
  let rest = buffer
  for (;;) {
    const end = rest.indexOf('\n\n')
    if (end < 0) {
      break
    }
    const block = rest.slice(0, end)
    rest = rest.slice(end + 2)
    let event = ''
    const data: string[] = []
    for (const line of block.split('\n')) {
      if (line.startsWith('event: ')) {
        event = line.slice(7)
      } else if (line.startsWith('data: ')) {
        data.push(line.slice(6))
      }
    }
    if (event && data.length > 0) {
      frames.push({ event, data: data.join('\n') })
    }
  }
  return { frames, rest }
}

export async function* readSse(body: ReadableStream<Uint8Array>): AsyncGenerator<SseFrame> {
  const reader = body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  for (;;) {
    const { done, value } = await reader.read()
    if (done) {
      break
    }
    buffer += decoder.decode(value, { stream: true }).replaceAll('\r\n', '\n')
    const parsed = parseFrames(buffer)
    buffer = parsed.rest
    yield* parsed.frames
  }
}
