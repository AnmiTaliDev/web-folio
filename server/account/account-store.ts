import type { Db } from '../db/database.ts'
import type { AccountStore } from './delete-account.ts'

export function createAccountStore(db: Db): AccountStore {
  return {
    deleteRows: async (table, userId) => {
      db.prepare(`delete from ${table} where user_id = ?`).run(userId)
    },
    deleteAccount: async (userId) => {
      db.prepare('delete from users where id = ?').run(userId)
    },
  }
}
