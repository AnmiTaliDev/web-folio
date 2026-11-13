import { z } from 'zod'
import { runChat } from '../chat/chat.ts'
import { countRecentUserMessages, loadChatProfile, saveExchange } from '../chat/chat-store.ts'
import { MAX_MESSAGE_LENGTH } from '../chat/constants.ts'
import { assertWithinLimit } from '../chat/rate-limit.ts'
import { formatSse } from '../chat/sse.ts'
import { localizeBooks, matchBooks } from '../shared/books-store.ts'
import { ApiError } from '../shared/errors.ts'
import { readJson, requestLanguage, requireUser, type RouteContext } from './context.ts'

const bodySchema = z.object({ message: z.string().trim().min(1).max(MAX_MESSAGE_LENGTH) })

export async function postChat(ctx: RouteContext): Promise<Response> {
  const userId = requireUser(ctx)
  const { db, llm, embed } = ctx.deps
  if (!llm || !embed) {
    throw new ApiError(503, 'ai_unavailable', 'LLM and embeddings are not configured on the server')
  }
  const { message } = await readJson(ctx, bodySchema)
  assertWithinLimit(await countRecentUserMessages(db, userId, ctx.deps.now()))

  const { profile, ratedIds } = await loadChatProfile(db, userId)
  const events = runChat(
    {
      embed,
      findCandidates: (embedding, count) => matchBooks(db, embedding, count, ratedIds, null),
      completeJson: llm.completeJson,
      stream: llm.stream,
      localize: (books) => localizeBooks(db, books, requestLanguage(ctx)),
      saveExchange: (userMessage, answer, bookIds) => saveExchange(db, userId, userMessage, answer, bookIds, ctx.deps.now()),
    },
    message,
    profile,
  )

  const encoder = new TextEncoder()
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      for await (const chatEvent of events) {
        controller.enqueue(encoder.encode(formatSse(chatEvent)))
      }
      controller.close()
    },
  })
  return new Response(stream, {
    headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache, no-transform' },
  })
}
