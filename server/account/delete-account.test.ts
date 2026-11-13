import { describe, expect, it } from 'vitest'
import { USER_TABLES, deleteUserData, type AccountStore } from './delete-account.ts'

type Rows = Record<string, { user_id: string }[]>

function makeStore(): { store: AccountStore; tables: Rows; accounts: Set<string> } {
  const tables: Rows = {}
  for (const table of USER_TABLES) {
    tables[table] = [{ user_id: 'u1' }, { user_id: 'u1' }, { user_id: 'u2' }]
  }
  const accounts = new Set(['u1', 'u2'])
  const store: AccountStore = {
    deleteRows: async (table, userId) => {
      tables[table] = (tables[table] ?? []).filter((row) => row.user_id !== userId)
    },
    deleteAccount: async (userId) => {
      accounts.delete(userId)
    },
  }
  return { store, tables, accounts }
}

describe('deleteUserData', () => {
  it('leaves no rows of the user in any table and removes the account', async () => {
    const { store, tables, accounts } = makeStore()
    await deleteUserData(store, 'u1')
    for (const table of USER_TABLES) {
      expect((tables[table] ?? []).some((row) => row.user_id === 'u1')).toBe(false)
    }
    expect(accounts.has('u1')).toBe(false)
  })

  it('does not touch the rows or the account of other users', async () => {
    const { store, tables, accounts } = makeStore()
    await deleteUserData(store, 'u1')
    for (const table of USER_TABLES) {
      expect(tables[table]).toEqual([{ user_id: 'u2' }])
    }
    expect(accounts.has('u2')).toBe(true)
  })

  it('covers every user-owned table of the schema', () => {
    expect([...USER_TABLES].sort()).toEqual(['book_of_day', 'book_status', 'chat_messages', 'profiles', 'ratings', 'wishlist'])
  })
})
