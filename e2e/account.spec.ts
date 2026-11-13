import { expect, test } from '@playwright/test'
import { chip, dialog, field, firstBookId, registerByApi, uniqueName } from './helpers.ts'

test('registration needs the terms, shows a recovery code and leads to onboarding', async ({ page }) => {
  await page.goto('/auth')
  await page.getByRole('button', { name: 'Создать аккаунт' }).first().click()
  const name = uniqueName('new')
  await field(page, 'Логин').fill(name)
  await field(page, 'Пароль').fill('secret password')
  await page.getByRole('button', { name: 'Создать аккаунт' }).last().click()
  await expect(page.getByText('Чтобы создать аккаунт, нужно принять условия использования.')).toBeVisible()
  await page.locator('md-checkbox').click()
  await page.getByRole('button', { name: 'Создать аккаунт' }).last().click()
  await expect(dialog(page).getByText('Код восстановления').first()).toBeVisible()
  await page.getByRole('button', { name: 'Я сохранил код' }).click()
  await expect(page).toHaveURL(/\/onboarding$/)
  await chip(page, 'Классика').click()
  await page.getByRole('button', { name: 'Показать подборку' }).click()
  await expect(page).toHaveURL(/\/$/)
  await expect(page.getByRole('heading', { name: 'Рекомендации для вас' })).toBeVisible()
})

test('a signed in user rates a book and finds it in the library', async ({ page }) => {
  await registerByApi(page)
  const id = await firstBookId(page, 'orwell')
  await page.goto(`/book/${id}`)
  await chip(page, 'Читаю').click()
  await page.getByRole('button', { name: 'Понравилось', exact: true }).click()
  await page.goto('/library')
  await chip(page, 'Читаю').click()
  await expect(page.getByText('1984').first()).toBeVisible()
  await chip(page, 'Понравилось').click()
  await expect(page.getByText('1984').first()).toBeVisible()
})

test('a rated book opens as a plain book page without the explanation', async ({ page }) => {
  await registerByApi(page)
  const id = await firstBookId(page, 'dune')
  await page.request.put(`/api/ratings/${id}`, { data: { value: 1 } })
  await page.goto(`/book/${id}`)
  await expect(page.getByText('Вы уже оценили эту книгу: понравилась')).toBeVisible()
  await expect(page.getByText('Почему эта книга в списке')).toHaveCount(0)
})

test('account settings change the username after a password check and list the session', async ({ page }) => {
  const name = await registerByApi(page)
  await page.goto('/settings/account')
  await expect(page.getByRole('heading', { name })).toBeVisible()
  await expect(page.getByText('Этот сеанс')).toBeVisible()
  await page.getByRole('button', { name: 'Изменить логин' }).click()
  const renamed = `${name}x`
  await dialog(page).locator('md-filled-text-field, md-outlined-text-field').filter({ hasText: 'Новый логин' }).locator('input').fill(renamed)
  await dialog(page).locator('md-filled-text-field, md-outlined-text-field').filter({ hasText: /^\s*Пароль/ }).locator('input').fill('secret password')
  await dialog(page).getByRole('button', { name: 'Подтвердить' }).click()
  await expect(page.getByRole('heading', { name: renamed })).toBeVisible()
})

test('signing out returns to the private mode and keeps no session', async ({ page, context }) => {
  await registerByApi(page)
  await page.goto('/settings/account')
  await page.getByRole('button', { name: 'Выйти', exact: true }).last().click()
  await expect(page.getByRole('heading', { name: 'Каталог' })).toBeVisible()
  expect((await context.cookies()).filter((cookie) => cookie.value !== '')).toEqual([])
})
