import { z } from 'zod'
import { runChat } from '../chat/chat.ts'
import { clearChatHistory, countRecentUserMessages, loadChatHistory, loadChatProfile, saveExchange } from '../chat/chat-store.ts'
import { MAX_MESSAGE_LENGTH } from '../chat/constants.ts'
import { assertWithinLimit } from '../chat/rate-limit.ts'
import { formatSse } from '../chat/sse.ts'
import { blockedBookIds, loadBooks, localizeBooks, matchBooks } from '../shared/books-store.ts'
import { loadProfile } from '../shared/user-store.ts'
import { ApiError } from '../shared/errors.ts'
import { readJson, requestLanguage, requireUser, type RouteContext } from './context.ts'
import { toSummary } from './serialize.ts'

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
  const hiddenIds = [...ratedIds, ...blockedBookIds(db, (await loadProfile(db, userId)).maxAge)]
  const events = runChat(
    {
      embed,
      findCandidates: (embedding, count) => matchBooks(db, embedding, count, hiddenIds, null),
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

const HISTORY_LIMIT = 60

export async function getChatHistory(ctx: RouteContext): Promise<Response> {
  const userId = requireUser(ctx)
  const { db } = ctx.deps
  const messages = await loadChatHistory(db, userId, HISTORY_LIMIT)
  const hidden = new Set(blockedBookIds(db, (await loadProfile(db, userId)).maxAge))
  const ids = [...new Set(messages.flatMap((message) => message.bookIds))].filter((id) => !hidden.has(id))
  const books = await localizeBooks(db, await loadBooks(db, ids), requestLanguage(ctx))
  const byId = new Map(books.map((book) => [book.id, toSummary(book)]))
  return Response.json({
    messages: messages.map((message) => ({
      id: message.id,
      role: message.role,
      text: message.text,
      createdAt: message.createdAt,
      books: message.bookIds.flatMap((id) => byId.get(id) ?? []),
    })),
  })
}

export async function deleteChatHistory(ctx: RouteContext): Promise<Response> {
  await clearChatHistory(ctx.deps.db, requireUser(ctx))
  return new Response(null, { status: 204 })
}
