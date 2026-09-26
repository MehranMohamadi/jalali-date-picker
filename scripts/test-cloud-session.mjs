// Run against build:app output with Playwright installed (or BUDGETYAR_PLAYWRIGHT).
import { createServer } from 'node:http'
import { readFile } from 'node:fs/promises'
import { extname, resolve, sep } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import assert from 'node:assert/strict'

const { chromium } = await import(process.env.BUDGETYAR_PLAYWRIGHT ? pathToFileURL(process.env.BUDGETYAR_PLAYWRIGHT).href : 'playwright')
const root = fileURLToPath(new URL('../playground/.output/public/', import.meta.url))
const types = { '.html': 'text/html', '.js': 'application/javascript', '.json': 'application/json', '.css': 'text/css', '.woff2': 'font/woff2', '.svg': 'image/svg+xml', '.png': 'image/png' }
const server = createServer(async (request, response) => {
  let path = new URL(request.url, 'http://localhost').pathname
  if (!extname(path)) path = path.replace(/\/$/, '') + '/index.html'
  const file = resolve(root, '.' + path)
  if (!file.startsWith(resolve(root) + sep)) { response.writeHead(403); response.end(); return }
  try {
    response.setHeader('Content-Type', types[extname(path)] || 'application/octet-stream')
    response.end(await readFile(file))
  } catch { response.writeHead(404); response.end() }
})
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
const browser = await chromium.launch({ channel: 'chrome', headless: true })
try {
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, serviceWorkers: 'block' })
  context.setDefaultTimeout(15000)
  const user = { id: 'test-account', username: 'test-user', fullName: 'Test User', createdAt: '2026-01-01' }
  let status = 200
  let authenticated = true
  let accountRequests = 0
  let hold = null
  await context.route('**/api/account', async route => {
    accountRequests++
    if (hold) await hold
    await route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(status === 200 ? { authenticated, ...(authenticated ? { user } : {}) } : { error: 'Test connection unavailable' }) })
  })
  const page = await context.newPage()
  const errors = []
  page.on('pageerror', error => errors.push(error.message))
  await page.goto(`http://127.0.0.1:${server.address().port}/settings`)
  await page.locator('.sidebar-user-card').waitFor()
  assert.equal(accountRequests, 1, 'Account UI and cloud startup must share one check')
  const settings = page.locator('[data-section="اتصال هوش مصنوعی"]')
  let release
  hold = new Promise(resolve => { release = resolve })
  await settings.locator('.budgetyar-select-trigger').click()
  await settings.getByRole('option', { name: 'فضای ابری', exact: true }).click()
  await settings.getByText(/در حال بررسی حساب/).waitFor()
  assert.equal(await settings.locator('a[href="/login"]').count(), 0)
  release()
  hold = null
  await settings.getByRole('button', { name: 'انتقال داده‌های این دستگاه به ابر' }).waitFor()
  assert.equal(await settings.locator('a[href="/login"]').count(), 0)
  // A connectivity problem must not masquerade as logout.
  status = 503
  await settings.locator('.budgetyar-select-trigger').click()
  await settings.getByRole('option', { name: 'فقط روی دستگاه (پیش‌فرض)' }).click()
  await settings.locator('.budgetyar-select-trigger').click()
  await settings.getByRole('option', { name: 'فضای ابری', exact: true }).click()
  await settings.getByRole('button', { name: /بررسی دوبارهٔ اتصال/ }).waitFor()
  assert.equal(await settings.locator('a[href="/login"]').count(), 0)
  assert.equal(await page.locator('.sidebar-user-card').count(), 1)
  // A confirmed expired session must clear both consumers.
  status = 200
  authenticated = false
  await settings.getByRole('button', { name: /بررسی دوبارهٔ اتصال/ }).click()
  await settings.locator('a[href="/login"]').waitFor()
  assert.equal(await page.locator('.sidebar-user-card').count(), 0)
  assert.deepEqual(errors, [])
  console.log('PASS: shared account/cloud login, no sign-in prompt while checking or offline, consistent session expiry')
} finally {
  await browser.close()
  server.close()
}
