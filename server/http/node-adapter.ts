import type { IncomingMessage, ServerResponse } from 'node:http'
import { CLIENT_KEY_HEADER } from './security.ts'

async function readBody(req: IncomingMessage): Promise<Buffer> {
  const chunks: Buffer[] = []
  for await (const chunk of req) {
    chunks.push(chunk as Buffer)
  }
  return Buffer.concat(chunks)
}

export function remoteAddress(req: IncomingMessage, trustProxy: boolean): string {
  const forwarded = req.headers['x-forwarded-for']
  if (trustProxy && typeof forwarded === 'string') {
    const first = forwarded.split(',')[0]?.trim()
    if (first) {
      return first
    }
  }
  return req.socket.remoteAddress ?? 'unknown'
}

export async function toRequest(req: IncomingMessage, port: number, trustProxy = false): Promise<Request> {
  const headers = new Headers()
  for (const [name, value] of Object.entries(req.headers)) {
    if (typeof value === 'string') {
      headers.set(name, value)
    }
  }
  headers.set(CLIENT_KEY_HEADER, remoteAddress(req, trustProxy))
  const method = req.method ?? 'GET'
  const body = method === 'GET' || method === 'HEAD' ? undefined : new Uint8Array(await readBody(req))
  return new Request(`http://localhost:${port}${req.url ?? '/'}`, { method, headers, body })
}

export async function sendResponse(response: Response, res: ServerResponse): Promise<void> {
  const headers: Record<string, string | string[]> = {}
  response.headers.forEach((value, name) => {
    headers[name] = value
  })
  const cookies = response.headers.getSetCookie()
  if (cookies.length > 0) {
    headers['set-cookie'] = cookies
  }
  res.writeHead(response.status, headers)
  if (!response.body) {
    res.end()
    return
  }
  const reader = response.body.getReader()
  for (;;) {
    const { done, value } = await reader.read()
    if (done) {
      break
    }
    res.write(value)
  }
  res.end()
}
