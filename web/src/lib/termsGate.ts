export type TermsState = { termsVersion: string | null; currentTermsVersion: string } | null | undefined

export function termsOutdated(account: TermsState): boolean {
  return account != null && account.termsVersion !== account.currentTermsVersion
}
