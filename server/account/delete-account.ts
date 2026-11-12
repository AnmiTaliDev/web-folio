export const USER_TABLES = ['chat_messages', 'book_of_day', 'wishlist', 'ratings', 'profiles'] as const

export type AccountStore = {
  deleteRows: (table: (typeof USER_TABLES)[number], userId: string) => Promise<void>
  deleteAccount: (userId: string) => Promise<void>
}

export async function deleteUserData(store: AccountStore, userId: string): Promise<void> {
  for (const table of USER_TABLES) {
    await store.deleteRows(table, userId)
  }
  await store.deleteAccount(userId)
}
