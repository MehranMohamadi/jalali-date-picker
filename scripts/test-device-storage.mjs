import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { readFile } from 'node:fs/promises'
import { extname, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'

const root = fileURLToPath(new URL('../playground/.output/public/', import.meta.url))
const types = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.woff2': 'font/woff2', '.png': 'image/png' }
const server = createServer(async (req, res) => {
  try {
    const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname)
    if (pathname.startsWith('/api/')) {
      res.writeHead(401, { 'Content-Type': 'application/json' })
      res.end('{"error":"Test: no account session"}')
      return
    }
    let path = resolve(root, `.${pathname}`)
    if (!path.startsWith(root.endsWith(sep) ? root : root + sep) && path !== resolve(root)) throw new Error('Invalid path')
    if (!extname(path)) path = resolve(path, 'index.html')
    const data = await readFile(path)
    res.writeHead(200, { 'Content-Type': types[extname(path)] || 'application/octet-stream', 'Cache-Control': 'no-store' })
    res.end(data)
  } catch {
    res.writeHead(404)
    res.end('Not found')
  }
})
await new Promise((resolveReady) => server.listen(0, '127.0.0.1', resolveReady))
const origin = `http://127.0.0.1:${server.address().port}`
let browser
const contexts = []
const keys = {
  transactions: 'budgetyar-transactions-v1', categories: 'budgetyar-categories-v1', tags: 'budgetyar-tags-v1',
  budgets: 'budgetyar-budgets-v1', installments: 'budgetyar-installments-v1', subscriptions: 'budgetyar-subscriptions-v1',
  creditAdjustments: 'budgetyar-credit-adjustments-v1',
  goals: 'budgetyar-goals-v1', goalTransactions: 'budgetyar-goal-transactions-v1',
}
const fixture = {
  app: 'budgetyar', version: 1,
  categories: [{ key: 'other', label: 'Other', icon: 'x', color: '#fff' }],
  tags: [{ key: 'tag-test', label: 'Tag', icon: 'x', color: '#fff' }],
  transactions: [{ id: 1, type: 'expense', title: 'Test payment', amount: 100, date: '1405/08/26',
    category: 'other', tags: ['tag-test'], sourceType: 'installment', sourceId: '2', installmentIndex: 0 },
    { id: 4, type: 'expense', title: 'Unpaid credit', amount: 100, date: '1405/08/26', paymentMethod: 'credit', category: 'other' }],
  budgets: [{ category: 'other', budget: 500 }],
  installments: [{ id: 2, title: 'Test installment', amount: 100, category: 'other', startDate: '1405/08/26',
    dueDay: 26, totalCount: 3, paidCount: 1, paidIndexes: [0], paymentMethod: 'cash' }],
  subscriptions: [{ id: 's1', title: 'Test subscription', endDate: '1405/09/01' }],
  creditAdjustments: { '1405/08': 30 },
  goals: [{ id: 'goal-1', title: 'Test goal', targetAmount: 1000, savedAmount: 200, priority: 'medium' }],
}

async function newPage(initial = {}) {
  const context = await browser.newContext({ serviceWorkers: 'block', acceptDownloads: true, viewport: { width: 390, height: 844 } })
  contexts.push(context)
  await context.addInitScript(({ initial }) => {
    if (!sessionStorage.getItem('fixture-loaded')) {
      for (const [key, value] of Object.entries(initial)) localStorage.setItem(key, value)
      sessionStorage.setItem('fixture-loaded', '1')
    }
    Object.defineProperty(navigator, 'share', { value: undefined, configurable: true })
  }, { initial })
  const page = await context.newPage()
  await page.goto(origin + '/settings')
  await page.waitForFunction(() => document.querySelector('.device-storage-warning') || localStorage.getItem('budgetyar-device-schema-v1') === '1')
  return page
}

async function importFile(page, value, blocked = false) {
  const buffer = Buffer.isBuffer(value) ? value : Buffer.from(JSON.stringify(value))
  await page.locator(blocked ? '.device-storage-warning input[type=file]' : 'input.settings-file-input')
    .setInputFiles({ name: 'backup.json', mimeType: 'application/json', buffer })
  await page.getByRole('button', { name: /بازیابی و جایگزینی/ }).click()
}

async function waitTransactions(page, expected) {
  await page.waitForFunction(({ key, expected }) => localStorage.getItem(key) === JSON.stringify(expected),
    { key: keys.transactions, expected })
}

async function downloadJson(page, name) {
  const pending = page.waitForEvent('download')
  await page.getByRole('button', { name }).first().click()
  const stream = await (await pending).createReadStream()
  const chunks = []
  for await (const chunk of stream) chunks.push(chunk)
  return Buffer.concat(chunks)
}

try {
  const channel = process.argv.find((arg) => arg.startsWith('--browser='))?.slice('--browser='.length) || process.env.BUDGETYAR_TEST_BROWSER
  browser = await chromium.launch({ channel: channel || undefined, headless: true })
  const first = await newPage()
  await importFile(first, fixture)
  await waitTransactions(first, fixture.transactions)
  const exported = await downloadJson(first, /ذخیرهٔ فایل پشتیبان/)
  const second = await newPage()
  await importFile(second, exported)
  await waitTransactions(second, fixture.transactions)
  await second.reload()
  await second.getByRole('button', { name: /ذخیرهٔ فایل پشتیبان/ }).first().waitFor()
  const saved = await second.evaluate((keys) => Object.fromEntries(Object.entries(keys).map(([field, key]) => [field, JSON.parse(localStorage.getItem(key))])), keys)
  const expected = JSON.parse(exported.toString())
  for (const field of Object.keys(keys)) assert.deepEqual(saved[field], expected[field], field)
  console.log('PASS: export -> fresh browser context -> import -> reload preserves linked data')

  const corrupt = await newPage({ [keys.transactions]: '{broken' })
  await corrupt.locator('.device-storage-warning').waitFor()
  assert.equal(await corrupt.evaluate((key) => localStorage.getItem(key), keys.transactions), '{broken')
  const recovery = JSON.parse((await downloadJson(corrupt, /ذخیرهٔ فایل نجات/)).toString())
  assert.equal(recovery.records[keys.transactions], '{broken')
  await importFile(corrupt, fixture, true)
  await waitTransactions(corrupt, fixture.transactions)
  await corrupt.reload()
  await corrupt.getByRole('button', { name: /ذخیرهٔ فایل پشتیبان/ }).first().waitFor()
  assert.equal(await corrupt.locator('.device-storage-warning').count(), 0)
  console.log('PASS: corrupt records stay intact, raw export works, explicit backup restores access')

  const quota = await newPage({ [keys.transactions]: JSON.stringify(fixture.transactions),
    [keys.categories]: JSON.stringify(fixture.categories), [keys.budgets]: JSON.stringify(fixture.budgets) })
  await quota.evaluate((key) => {
    window.failDeviceWrite = true
    const setItem = Storage.prototype.setItem
    Storage.prototype.setItem = function (name, value) {
      if (window.failDeviceWrite && name === key) throw new DOMException('Test quota', 'QuotaExceededError')
      return setItem.call(this, name, value)
    }
  }, keys.transactions)
  const modified = structuredClone(fixture)
  modified.transactions[0].id = 3
  await importFile(quota, modified)
  await quota.locator('.device-storage-warning').waitFor()
  assert.deepEqual(await quota.evaluate((key) => JSON.parse(localStorage.getItem(key)), keys.transactions), fixture.transactions)
  await quota.evaluate(() => { window.failDeviceWrite = false })
  await quota.getByRole('button', { name: /تلاش دوباره برای ذخیره/ }).click()
  await quota.locator('.device-storage-warning').waitFor({ state: 'detached' })
  console.log('PASS: quota failure preserves the previous snapshot and retry recovers')

  await quota.getByRole('button', { name: /حذف اطلاعات حساب فعلی از این دستگاه/ }).click()
  await quota.getByRole('button', { name: /حذف از این دستگاه/ }).click()
  await waitTransactions(quota, [])
  assert.equal(await quota.evaluate(() => JSON.parse(localStorage.getItem('budgetyar-cloud-settings-v1')).storageMode), 'local')
  console.log('PASS: confirmed device deletion clears finance data and keeps cloud transfer off')

  const stale = await first.context().newPage()
  await stale.goto(origin + '/settings')
  await stale.locator('input.settings-file-input').waitFor({ state: 'attached' })
  if (await first.locator('.device-storage-warning').count()) {
    await first.getByRole('button', { name: /تلاش دوباره برای ذخیره/ }).click()
    await first.locator('.device-storage-warning').waitFor({ state: 'detached' })
  }
  await importFile(first, modified)
  await waitTransactions(first, modified.transactions)
  await stale.locator('.device-storage-warning').waitFor()
  assert.equal(await stale.locator('input.settings-file-input').count(), 0)
  await stale.getByRole('button', { name: /تلاش دوباره برای ذخیره/ }).click()
  await stale.locator('.device-storage-warning').waitFor({ state: 'detached' })
  await waitTransactions(stale, modified.transactions)
  console.log('PASS: a stale tab blocks editing until the latest snapshot is reloaded')
} finally {
  for (const context of contexts) await context.close()
  await browser?.close()
  await new Promise((resolveClosed) => server.close(resolveClosed))
}
