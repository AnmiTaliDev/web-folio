export type LlmConfig = { baseUrl: string; apiKey: string; model: string }

export type EmbeddingsConfig = { baseUrl: string; apiKey: string; model: string; dim: number }

export type Config = {
  port: number
  databasePath: string
  webRoot: string
  llm: LlmConfig | null
  embeddings: EmbeddingsConfig | null
}

type Env = Record<string, string | undefined>

export function readLlmConfig(env: Env): LlmConfig | null {
  const baseUrl = env.LLM_BASE_URL
  const apiKey = env.LLM_API_KEY
  const model = env.LLM_MODEL
  return baseUrl && apiKey && model ? { baseUrl, apiKey, model } : null
}

export function readEmbeddingsConfig(env: Env): EmbeddingsConfig | null {
  const baseUrl = env.EMBEDDINGS_BASE_URL
  const apiKey = env.EMBEDDINGS_API_KEY
  const model = env.EMBEDDINGS_MODEL
  const dim = Number(env.EMBEDDING_DIM)
  return baseUrl && apiKey && model && Number.isInteger(dim) && dim > 0 ? { baseUrl, apiKey, model, dim } : null
}

export function readConfig(env: Env): Config {
  return {
    port: Number(env.PORT ?? 3000),
    databasePath: env.DATABASE_PATH ?? 'data/folio.db',
    webRoot: env.WEB_ROOT ?? 'app/build/web',
    llm: readLlmConfig(env),
    embeddings: readEmbeddingsConfig(env),
  }
}
