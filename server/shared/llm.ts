import OpenAI from 'openai'
import type { EmbeddingsConfig, LlmConfig } from './config.ts'

export type ChatMessage = { role: 'system' | 'user' | 'assistant'; content: string }

export type Llm = {
  model: string
  completeJson: (messages: ChatMessage[]) => Promise<string>
  complete: (messages: ChatMessage[]) => Promise<string>
  stream: (messages: ChatMessage[]) => AsyncGenerator<string>
}

export type Embedder = (text: string) => Promise<number[]>

export type BatchEmbedder = (texts: string[]) => Promise<number[][]>

export function createLlm(config: LlmConfig): Llm {
  const client = new OpenAI({ apiKey: config.apiKey, baseURL: config.baseUrl })
  const model = config.model

  async function completeJson(messages: ChatMessage[]): Promise<string> {
    const response = await client.chat.completions.create({
      model,
      messages,
      response_format: { type: 'json_object' },
      temperature: 0.2,
    })
    return response.choices[0]?.message.content ?? ''
  }

  async function complete(messages: ChatMessage[]): Promise<string> {
    const response = await client.chat.completions.create({ model, messages, temperature: 0.5 })
    return response.choices[0]?.message.content ?? ''
  }

  async function* stream(messages: ChatMessage[]): AsyncGenerator<string> {
    const response = await client.chat.completions.create({ model, messages, temperature: 0.5, stream: true })
    for await (const chunk of response) {
      const piece = chunk.choices[0]?.delta.content
      if (piece) {
        yield piece
      }
    }
  }

  return { model, completeJson, complete, stream }
}

export function createBatchEmbedder(config: EmbeddingsConfig): BatchEmbedder {
  const client = new OpenAI({ apiKey: config.apiKey, baseURL: config.baseUrl })
  return async (texts) => {
    const response = await client.embeddings.create({
      model: config.model,
      input: texts,
      dimensions: config.dim,
    })
    const sorted = [...response.data].sort((a, b) => a.index - b.index)
    if (sorted.length !== texts.length) {
      throw new Error('Embeddings response size does not match the request')
    }
    return sorted.map((item) => item.embedding)
  }
}

export function createEmbedder(config: EmbeddingsConfig): Embedder {
  const embedBatch = createBatchEmbedder(config)
  return async (text) => {
    const [vector] = await embedBatch([text])
    if (!vector) {
      throw new Error('Embeddings response is empty')
    }
    return vector
  }
}
