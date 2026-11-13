import { expect, test } from '@playwright/test'
import { firstBookId } from './helpers.ts'

test('a book page shows the overview, the facts, the themes and similar books', async ({ page }) => {
  const id = await firstBookId(page, 'orwell')
  await page.goto(`/book/${id}`)
  await expect(page.getByRole('heading', { name: 'О книге' })).toBeVisible()
  await expect(page.getByText('Океанию')).toBeVisible()
  await expect(page.getByText('Первая публикация')).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Похожие книги' })).toBeVisible()
  await page.getByRole('link', { name: 'Власть', exact: true }).click()
  await expect(page).toHaveURL(/\/catalog\?theme=power$/)
  await expect(page.locator('md-input-chip')).toBeVisible()
  await expect(page.getByText('Книг: ')).toBeVisible()
})

test('the project page describes the service', async ({ page }) => {
  await page.goto('/settings/project')
  await expect(page.getByRole('heading', { name: 'О проекте', level: 2 })).toBeVisible()
  await expect(page.getByText('книг в каталоге')).toBeVisible()
  await expect(page.getByRole('link', { name: 'Условия использования' })).toBeVisible()
})

test('the appearance settings recolor the whole interface', async ({ page }) => {
  await page.goto('/settings/appearance')
  const primary = () => page.evaluate("getComputedStyle(document.documentElement).getPropertyValue('--md-sys-color-primary').trim()")
  const before = await primary()
  await page.getByRole('radio', { name: 'Зелёный' }).click()
  await expect.poll(primary).not.toBe(before)
  await page.locator('md-filter-chip').filter({ hasText: /^\s*Тёмная\s*$/ }).click()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  await page.getByRole('button', { name: 'Сбросить оформление' }).click()
  await expect.poll(primary).toBe(before)
})
