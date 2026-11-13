// Run after build:app; uses synthetic data in an isolated Chrome context.
import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { readFile } from 'node:fs/promises'
import { extname, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'

const root = fileURLToPath(new URL('../playground/.output/public/', import.meta.url))
const mime = { '.html': 'text/html', '.js': 'application/javascript', '.json': 'application/json', '.css': 'text/css', '.woff2': 'font/woff2', '.png': 'image/png', '.svg': 'image/svg+xml' }
const server = createServer(async (request, response) => {
  let path = new URL(request.url, 'http://localhost').pathname
  if (path.startsWith('/api/')) {
    response.writeHead(401, { 'Content-Type': 'application/json' })
    response.end('{"error":"Test server"}')
    return
  }
  if (!extname(path)) path = path.replace(/\/$/, '') + '/index.html'
  const file = resolve(root, '.' + path)
  if (!file.startsWith(resolve(root) + sep)) { response.writeHead(403); response.end(); return }
  try {
    const body = await readFile(file)
    response.writeHead(200, { 'Content-Type': mime[extname(file)] || 'application/octet-stream' })
    response.end(body)
  } catch { response.writeHead(404); response.end() }
})
await new Promise((done) => server.listen(0, '127.0.0.1', done))
const origin = `http://127.0.0.1:${server.address().port}`
let browser
try {
  browser = await chromium.launch({ channel: 'chrome', headless: true })
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block' })
  const page = await context.newPage()
  const errors = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.goto(origin)
  await page.evaluate(() => {
    const parts = Object.fromEntries(new Intl.DateTimeFormat('en-US-u-ca-persian', { year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date()).map((part) => [part.type, part.value]))
    localStorage.setItem('budgetyar-transactions-v1', JSON.stringify([{
      id: 1, type: 'expense', title: 'Privacy fixture', amount: 1234567,
      date: `${parts.year}/${parts.month}/${parts.day}`, category: 'other', paymentMethod: 'cash',
    }]))
    localStorage.setItem('budgetyar-hide-amounts-v1', 'true')
  })
  await page.reload()
  await page.waitForSelector('.app-shell.amounts-hidden')
  const expenseText = page.locator('.daily-expense > b').first()
  await expenseText.waitFor()
  assert.equal(await expenseText.textContent(), '••••')
  assert.equal(await expenseText.getAttribute('title'), '••••')
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, 'Mobile layout overflows')
  const toggle = page.locator('.mobile-topbar .privacy-toggle')
  for (const width of [320, 390]) {
    await page.setViewportSize({ width, height: 844 })
    assert.equal(await page.evaluate(() => {
      const bar = document.querySelector('.mobile-topbar').getBoundingClientRect()
      const add = document.querySelector('.mobile-add').getBoundingClientRect()
      const eye = document.querySelector('.mobile-privacy-toggle').getBoundingClientRect()
      return bar.height < 70 && Math.abs(add.y + add.height / 2 - eye.y - eye.height / 2) < 2
    }), true, 'Mobile actions must stay on one compact row')
  }
  await toggle.click()
  await page.waitForSelector('.app-shell:not(.amounts-hidden)')
  assert.notEqual(await expenseText.textContent(), '••••')
  await toggle.click()
  await page.goto(origin + '/analytics')
  await page.waitForSelector('.app-shell.amounts-hidden')
  assert.equal(await page.locator('canvas:visible').count(), 0)
  await page.goto(origin + '/budgets')
  await page.waitForSelector('.app-shell.amounts-hidden')
  for (const input of await page.locator('input[inputmode="numeric"]').all()) {
    assert.equal(await input.inputValue(), '••••')
    assert.equal(await input.isDisabled(), true)
  }
  assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('budgetyar-transactions-v1'))[0].amount), 1234567)
  await page.goto(origin + '/settings')
  await page.waitForSelector('.app-shell.amounts-hidden')
  assert.equal(await page.getByRole('button', { name: /فعال‌کردن قفل برنامه/ }).count(), 0, 'Browser must not offer a native lock')
  await page.setViewportSize({ width: 1280, height: 900 })
  await page.locator('.desktop-privacy-tools .privacy-toggle').click()
  await page.waitForSelector('.app-shell:not(.amounts-hidden)')
  assert.deepEqual(errors, [])
  console.log('PASS: mobile/desktop toggle, persistent masking, hidden tooltips/charts/inputs, original data preserved, browser capability detection')
} finally {
  await browser?.close()
  await new Promise((done) => server.close(done))
}
