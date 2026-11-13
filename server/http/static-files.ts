import { readFile } from 'node:fs/promises'
import { extname, join, normalize } from 'node:path'

const CONTENT_TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.wasm': 'application/wasm',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.otf': 'font/otf',
  '.ttf': 'font/ttf',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
}

const IMMUTABLE = 'public, max-age=31536000, immutable'

async function tryRead(path: string): Promise<Uint8Array | null> {
  try {
    return await readFile(path)
  } catch {
    return null
  }
}

export function cacheControlFor(pathname: string): string {
  return pathname.startsWith('/assets/') ? IMMUTABLE : 'public, max-age=3600'
}

export async function serveStatic(webRoot: string, pathname: string): Promise<Response> {
  let decoded: string
  try {
    decoded = decodeURIComponent(pathname)
  } catch {
    return new Response('Bad request', { status: 400 })
  }
  const relative = normalize(decoded).replace(/^(\.\.[/\\])+/, '')
  const wantsFile = extname(relative) !== ''
  const file = wantsFile ? await tryRead(join(webRoot, relative)) : null
  if (file) {
    return new Response(file, {
      headers: { 'Content-Type': CONTENT_TYPES[extname(relative)] ?? 'application/octet-stream', 'Cache-Control': cacheControlFor(pathname) },
    })
  }
  if (wantsFile) {
    return new Response('Not found', { status: 404 })
  }
  const index = await tryRead(join(webRoot, 'index.html'))
  if (!index) {
    return new Response('The web interface is not built. Run npm --prefix web run build.', { status: 404 })
  }
  return new Response(index, { headers: { 'Content-Type': CONTENT_TYPES['.html'] ?? 'text/html', 'Cache-Control': 'no-cache' } })
}
