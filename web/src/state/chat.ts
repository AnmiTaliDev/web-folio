import { createRoot, createSignal } from 'solid-js'
import { ApiError, chatStream } from '../api/client.ts'
import type { Book, ChatContext } from '../api/types.ts'

export type ChatMessage = {
  id: number
  role: 'user' | 'assistant'
  text: string
  books: Book[]
  context: ChatContext | null
}

export type ChatFailure = 'unavailable' | 'limit' | 'generic' | null

export function failureFor(error: unknown): ChatFailure {
  if (error instanceof ApiError) {
    if (error.status === 503 || error.code === 'ai_unavailable') {
      return 'unavailable'
    }
    if (error.status === 429 || error.code === 'rate_limited') {
      return 'limit'
    }
  }
  return 'generic'
}

export const chat = createRoot(() => {
  const [messages, setMessages] = createSignal<ChatMessage[]>([])
  const [busy, setBusy] = createSignal(false)
  const [failure, setFailure] = createSignal<ChatFailure>(null)
  let counter = 0
  let controller: AbortController | null = null

  function patchLast(update: (message: ChatMessage) => ChatMessage): void {
    setMessages((list) => list.map((message, index) => (index === list.length - 1 ? update(message) : message)))
  }

  async function send(text: string): Promise<void> {
    const trimmed = text.trim()
    if (!trimmed || busy()) {
      return
    }
    setFailure(null)
    setBusy(true)
    setMessages((list) => [
      ...list,
      { id: ++counter, role: 'user', text: trimmed, books: [], context: null },
      { id: ++counter, role: 'assistant', text: '', books: [], context: null },
    ])
    controller = new AbortController()
    try {
      for await (const event of chatStream(trimmed, controller.signal)) {
        if (event.event === 'books') {
          patchLast((message) => ({ ...message, books: event.data.books, context: event.data.context }))
        } else if (event.event === 'token') {
          patchLast((message) => ({ ...message, text: message.text + event.data.text }))
        } else if (event.event === 'error') {
          setFailure('generic')
        }
      }
    } catch (error) {
      if (!(error instanceof DOMException && error.name === 'AbortError')) {
        setFailure(failureFor(error))
      }
    } finally {
      controller = null
      setMessages((list) => {
        const last = list[list.length - 1]
        return last && last.role === 'assistant' && last.text === '' && last.books.length === 0 ? list.slice(0, -1) : list
      })
      setBusy(false)
    }
  }

  function reset(): void {
    controller?.abort()
    setMessages([])
    setFailure(null)
    setBusy(false)
  }

  return { messages, busy, failure, send, reset }
})
