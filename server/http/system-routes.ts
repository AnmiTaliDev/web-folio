import type { RouteContext } from './context.ts'

export async function getCapabilities(ctx: RouteContext): Promise<Response> {
  return Response.json({ ai: ctx.deps.llm !== null && ctx.deps.embed !== null })
}
