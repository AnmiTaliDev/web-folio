import { readFile } from 'node:fs/promises'
import { extname, join, normalize } from 'node:path'

const CONTENT_TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.wasm': 'application/wasm',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.otf': 'font/otf',
  '.ttf': 'font/ttf',
  '.txt': 'text/plain; charset=utf-8',
  '.symbols': 'text/plain; charset=utf-8',
}

async function tryRead(path: string): Promise<Uint8Array | null> {
  try {
    return await readFile(path)
  } catch {
    return null
  }
}

export async function serveStatic(webRoot: string, pathname: string): Promise<Response> {
  const relative = normalize(decodeURIComponent(pathname)).replace(/^(\.\.[/\\])+/, '')
  const wantsFile = extname(relative) !== ''
  const file = wantsFile ? await tryRead(join(webRoot, relative)) : null
  if (file) {
    return new Response(file, { headers: { 'Content-Type': CONTENT_TYPES[extname(relative)] ?? 'application/octet-stream' } })
  }
  if (wantsFile) {
    return new Response('Not found', { status: 404 })
  }
  const index = await tryRead(join(webRoot, 'index.html'))
  if (!index) {
    return new Response('Web app is not built. Run flutter build web in app/.', { status: 404 })
  }
  return new Response(index, { headers: { 'Content-Type': CONTENT_TYPES['.html'] ?? 'text/html' } })
}
