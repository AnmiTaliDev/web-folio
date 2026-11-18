import { readFileSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { loadBundledCatalog, needsBundledCatalog } from '../catalog/bundled.ts'
import { openDatabase, type Db } from '../db/database.ts'

export type RemoteSnapshot = { etag: string; data: Uint8Array }

/** Where the database snapshot lives. Implemented on top of Vercel Blob in api/. */
export type SnapshotBlob = {
  /** Returns the snapshot, 'unchanged' when the etag still matches, or null when nothing is stored. */
  read(knownEtag: string | null): Promise<RemoteSnapshot | 'unchanged' | null>
  /** Stores the snapshot. Returns the new etag, or 'conflict' when another instance wrote first. */
  write(data: Uint8Array, ifMatch: string | null): Promise<string | 'conflict'>
}

export type SnapshotStoreOptions = {
  blob: SnapshotBlob | null
  dir: string
  now?: () => number
  refreshEveryMs?: number
  onSwap?: (db: Db) => void
}

/**
 * Keeps one SQLite database per function instance and mirrors it to a blob:
 * the snapshot is restored when the instance starts, written after every change and
 * re-read when another instance has replaced it. The last writer wins on a true conflict.
 */
export class SnapshotStore {
  #opts: Required<Omit<SnapshotStoreOptions, 'blob' | 'onSwap'>> & Pick<SnapshotStoreOptions, 'blob' | 'onSwap'>
  #db: Db | null = null
  #generation = 0
  #etag: string | null = null
  #baseline = 0
  #lastCheck = 0
  #queue: Promise<unknown> = Promise.resolve()

  constructor(options: SnapshotStoreOptions) {
    this.#opts = { now: () => Date.now(), refreshEveryMs: 2000, ...options }
  }

  get db(): Db {
    if (!this.#db) {
      throw new Error('The store is not open')
    }
    return this.#db
  }

  async open(): Promise<Db> {
    const remote = this.#opts.blob ? await this.#opts.blob.read(null) : null
    const restored = remote !== null && remote !== 'unchanged'
    this.#install(restored ? remote.data : null)
    if (restored) {
      this.#etag = remote.etag
    }
    if (needsBundledCatalog(this.db)) {
      loadBundledCatalog(this.db)
    }
    if (!restored || this.#changes() !== this.#baseline) {
      await this.flush()
    }
    this.#lastCheck = this.#opts.now()
    return this.db
  }

  /** Picks up a snapshot written by another instance, at most once per refresh interval. */
  async refresh(): Promise<void> {
    const blob = this.#opts.blob
    if (!blob || this.#opts.now() - this.#lastCheck < this.#opts.refreshEveryMs) {
      return
    }
    this.#lastCheck = this.#opts.now()
    await this.#enqueue(async () => {
      const remote = await blob.read(this.#etag)
      if (remote && remote !== 'unchanged' && remote.etag !== this.#etag) {
        this.#swap(remote)
      }
    })
  }

  /** Writes the snapshot when the database has changed since the last one. */
  flush(): Promise<void> {
    return this.#enqueue(async () => {
      const blob = this.#opts.blob
      if (!blob || this.#changes() === this.#baseline) {
        return
      }
      const changes = this.#changes()
      const target = join(this.#opts.dir, `snapshot-${this.#generation}-${this.#opts.now()}.db`)
      rmSync(target, { force: true })
      this.db.exec(`vacuum into '${target.replaceAll("'", "''")}'`)
      const data = readFileSync(target)
      rmSync(target, { force: true })
      const result = await blob.write(data, this.#etag)
      if (result === 'conflict') {
        const remote = await blob.read(null)
        if (remote && remote !== 'unchanged') {
          this.#swap(remote)
        }
        return
      }
      this.#etag = result
      this.#baseline = changes
    })
  }

  #enqueue(task: () => Promise<void>): Promise<void> {
    const next = this.#queue.then(task, task)
    this.#queue = next.catch(() => undefined)
    return next
  }

  #changes(): number {
    const row = this.db.prepare('select total_changes() as n').get() as { n: number | bigint }
    return Number(row.n)
  }

  #install(data: Uint8Array | null): void {
    this.#generation++
    const path = join(this.#opts.dir, `live-${this.#generation}.db`)
    for (const suffix of ['', '-wal', '-shm']) {
      rmSync(path + suffix, { force: true })
    }
    if (data) {
      writeFileSync(path, data)
    }
    this.#db = openDatabase(path)
    this.#baseline = this.#changes()
  }

  #swap(remote: RemoteSnapshot): void {
    const previous = this.#db
    this.#install(remote.data)
    this.#etag = remote.etag
    this.#opts.onSwap?.(this.db)
    if (previous) {
      setTimeout(() => {
        try {
          previous.close()
        } catch {
          // already closed
        }
      }, 10_000).unref()
    }
  }
}
