import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { SnapshotStore, type RemoteSnapshot, type SnapshotBlob } from './snapshot-store.ts'

function memoryBlob(): SnapshotBlob & { writes: number; value: RemoteSnapshot | null } {
  const blob = {
    writes: 0,
    value: null as RemoteSnapshot | null,
    async read(known: string | null) {
      if (!blob.value) return null
      return known === blob.value.etag ? ('unchanged' as const) : blob.value
    },
    async write(data: Uint8Array, ifMatch: string | null) {
      if (blob.value && ifMatch !== blob.value.etag) return 'conflict' as const
      blob.writes++
      blob.value = { etag: `e${blob.writes}`, data }
      return blob.value.etag
    },
  }
  return blob
}

const tmp = () => mkdtempSync(join(tmpdir(), 'folio-snap-'))
const count = (store: SnapshotStore) => (store.db.prepare('select count(*) as n from users').get() as { n: number }).n
const addUser = (store: SnapshotStore, name: string) =>
  store.db.prepare("insert into users (id, username, password_hash, created_at) values (?, ?, 'x', '2026-01-01')").run(name, name)

describe('SnapshotStore', () => {
  it('stores the first snapshot with the bundled catalog and restores it on the next start', async () => {
    const blob = memoryBlob()
    const first = new SnapshotStore({ blob, dir: tmp() })
    await first.open()
    expect(blob.value).not.toBeNull()
    addUser(first, 'anna')
    await first.flush()

    const second = new SnapshotStore({ blob, dir: tmp() })
    await second.open()
    expect(count(second)).toBe(1)
    const books = second.db.prepare('select count(*) as n from books').get() as { n: number }
    expect(books.n).toBeGreaterThan(400)
  })

  it('does not write when nothing changed', async () => {
    const blob = memoryBlob()
    const store = new SnapshotStore({ blob, dir: tmp() })
    await store.open()
    const before = blob.writes
    await store.flush()
    expect(blob.writes).toBe(before)
  })

  it('picks up a snapshot written by another instance and reports the swap', async () => {
    const blob = memoryBlob()
    let now = 0
    const a = new SnapshotStore({ blob, dir: tmp(), now: () => now, refreshEveryMs: 1000 })
    const b = new SnapshotStore({ blob, dir: tmp(), now: () => now, refreshEveryMs: 1000 })
    await a.open()
    await b.open()
    addUser(a, 'boris')
    await a.flush()
    expect(count(b)).toBe(0)
    now = 5000
    await b.refresh()
    expect(count(b)).toBe(1)
  })

  it('works without a blob and keeps the data in memory of the instance', async () => {
    const store = new SnapshotStore({ blob: null, dir: tmp() })
    await store.open()
    addUser(store, 'vera')
    await store.flush()
    expect(count(store)).toBe(1)
  })
})
