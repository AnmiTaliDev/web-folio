export const USER_TABLES = ['chat_messages', 'book_of_day', 'wishlist', 'book_status', 'ratings', 'profiles'] as const

export type AccountStore = {
  deleteRows: (table: (typeof USER_TABLES)[number], userId: string) => void
  deleteAccount: (userId: string) => void
}

export function deleteUserData(store: AccountStore, userId: string): void {
  for (const table of USER_TABLES) {
    store.deleteRows(table, userId)
  }
  store.deleteAccount(userId)
}
