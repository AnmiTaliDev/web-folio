export const CATALOG_VIEWS = ['list', 'tiles', 'compact'] as const
export type CatalogView = (typeof CATALOG_VIEWS)[number]

export const CATALOG_SORTS = ['popularity', 'title', 'author', 'year_desc', 'year_asc'] as const
export type CatalogSort = (typeof CATALOG_SORTS)[number]

const KEY = 'folio.catalogView'

export function readView(storage: Pick<Storage, 'getItem'> | null = safeStorage()): CatalogView {
  try {
    const value = storage?.getItem(KEY)
    return CATALOG_VIEWS.find((view) => view === value) ?? 'list'
  } catch {
    return 'list'
  }
}

export function writeView(view: CatalogView, storage: Pick<Storage, 'setItem'> | null = safeStorage()): void {
  try {
    storage?.setItem(KEY, view)
  } catch {
    return
  }
}

function safeStorage(): Storage | null {
  try {
    return window.localStorage
  } catch {
    return null
  }
}
