import type { Db } from '../db/database.ts'
import type { AccountStore } from './delete-account.ts'

export function createAccountStore(db: Db): AccountStore {
  return {
    deleteRows: async (table, userId) => {
      await db.run(`delete from ${table} where user_id = ?`, userId)
    },
    deleteAccount: async (userId) => {
      await db.run('delete from users where id = ?', userId)
    },
  }
}
