// Run after build:app. Point BUDGETYAR_PLAYWRIGHT to an installed playwright ESM entry.
import { createServer } from 'node:http'
import { cp, mkdtemp, readFile, readdir, writeFile, mkdir } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve, extname } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import assert from 'node:assert/strict'
import { finalizeRelease } from './update-release.mjs'

const { chromium } = await import(process.env.BUDGETYAR_PLAYWRIGHT ? pathToFileURL(process.env.BUDGETYAR_PLAYWRIGHT).href : 'playwright')
const root = fileURLToPath(new URL('../playground/.output/public/', import.meta.url))
const initial = JSON.parse(await readFile(join(root, 'version.json'), 'utf8'))
const temporary = await mkdtemp(join(tmpdir(), 'budgetyar-updates-'))
const nextRoot = join(temporary, 'next')
await cp(root, nextRoot, { recursive: true })
const nextId = String(Number(initial.buildId) + 1)
async function replaceBuild(folder) {
  for (const entry of await readdir(folder, { withFileTypes: true })) {
    const path = join(folder, entry.name)
    if (entry.isDirectory()) await replaceBuild(path)
    else if (/\.(html|json|js)$/.test(path)) await writeFile(path, (await readFile(path, 'utf8')).replaceAll(initial.buildId, nextId))
  }
}
await replaceBuild(nextRoot)
await finalizeRelease(nextRoot, nextId)
let servedRoot = root
let corrupt = false
const mime = { '.html': 'text/html', '.js': 'application/javascript', '.json': 'application/json', '.css': 'text/css', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.png': 'image/png', '.webmanifest': 'application/manifest+json' }
const server = createServer(async (request, response) => {
  let path = new URL(request.url, 'http://localhost').pathname
  response.setHeader('Cache-Control', 'no-store')
  if (path.startsWith('/api/')) { response.writeHead(401, { 'Content-Type': 'application/json' }); response.end('{"error":"Test server"}'); return }
  // Exercise the redirects imposed by Vercel cleanUrls.
  if (path.endsWith('.html')) { response.writeHead(308, { Location: path.replace(/index\.html$/, '').replace(/\.html$/, '') }); response.end(); return }
  if (!extname(path)) path = path.endsWith('/') ? path + 'index.html' : path + '/index.html'
  const file = resolve(servedRoot, '.' + path)
  if (!file.startsWith(resolve(servedRoot) + '/'.replace('/', process.platform === 'win32' ? '\\' : '/'))) { response.writeHead(403); response.end(); return }
  try {
    let body = await readFile(file)
    if (corrupt && path.endsWith('.css')) body = Buffer.from('corrupt update')
    response.writeHead(200, { 'Content-Type': mime[extname(path)] || 'application/octet-stream' })
    response.end(body)
  } catch {
    try {
      const html = await readFile(resolve(servedRoot, '.' + path.replace(/\/index\.html$/, '.html')))
      response.writeHead(200, { 'Content-Type': 'text/html' }); response.end(html)
    } catch { response.writeHead(404); response.end('Not found') }
  }
})
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
const origin = `http://127.0.0.1:${server.address().port}`
const browser = await chromium.launch({ channel: 'chrome', headless: true })
try {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } })
  context.setDefaultTimeout(30000)
  await context.addInitScript(() => {
    // localhost is a secure context; production bootstrap requires real HTTPS.
    window.budgetyarWorker = navigator.serviceWorker.register('/sw.js', { updateViaCache: 'none' })
  })
  const page = await context.newPage()
  const errors = []
  page.on('pageerror', error => errors.push(error.message))
  page.on('dialog', async dialog => { console.log('Dialog:', dialog.message()); await dialog.accept() })
  context.on('console', message => { if (message.type() === 'error') console.log('Browser:', message.text()) })
  await page.goto(origin + '/settings')
  console.log('Loaded initial app')
  console.log('Worker registration:', await page.evaluate(() => window.budgetyarWorker.then(r => r.scope).catch(e => e.message)))
  await page.waitForFunction(() => Boolean(navigator.serviceWorker.controller), null, { timeout: 60000 })
  await page.waitForFunction(async () => {
    const health = await (await caches.open('budgetyar-web-health-v1')).match('/__budgetyar_health')
    return health && (await health.json()).healthy
  })
  await page.evaluate(async () => {
    localStorage.setItem('update-test-preserved', 'yes')
    await (await caches.open('unrelated-cache')).put('/unrelated', new Response('keep'))
  })
  await page.getByRole('button', { name: 'نمایش تست آپدیت' }).click()
  await page.getByText(/تست نمایشی آپدیت/).waitFor()
  await mkdir(new URL('../.output/', import.meta.url), { recursive: true })
  await page.screenshot({ path: fileURLToPath(new URL('../.output/update-demo.png', import.meta.url)) })
  await page.getByRole('button', { name: 'تست را دیدم' }).click()
  const editedTab = await context.newPage()
  await editedTab.goto(origin + '/login')
  await editedTab.waitForFunction(() => Boolean(document.querySelector('#__nuxt')?.__vue_app__))
  await editedTab.locator('input[autocomplete="username"]').fill('unsaved-test-name')
  servedRoot = nextRoot
  await page.evaluate(async () => (await navigator.serviceWorker.getRegistration()).update())
  await page.waitForFunction(async () => Boolean((await navigator.serviceWorker.getRegistration())?.waiting), null, { timeout: 60000 })
  assert.equal(await page.evaluate(() => localStorage.getItem('update-test-preserved')), 'yes')
  await page.getByRole('button', { name: 'اعمال به‌روزرسانی' }).first().click()
  try { await page.waitForFunction(id => document.body.textContent.includes(id), nextId) }
  catch (error) {
    console.log('After apply:', page.url(), await page.evaluate(async () => ({ text: document.body.textContent, waiting: Boolean((await navigator.serviceWorker?.getRegistration())?.waiting), controller: navigator.serviceWorker?.controller?.state })))
    throw error
  }
  assert.equal(await page.evaluate(() => localStorage.getItem('update-test-preserved')), 'yes')
  assert.equal(await page.evaluate(() => caches.has('unrelated-cache')), true)
  assert.equal(await editedTab.locator('input[autocomplete="username"]').inputValue(), 'unsaved-test-name')
  await editedTab.getByText(/پس از ذخیرهٔ فرم/).waitFor()
  await editedTab.close()
  assert.equal(await page.evaluate(async () => {
    for (const key of await caches.keys()) {
      if ((await (await caches.open(key)).keys()).some(request => new URL(request.url).pathname.startsWith('/api/'))) return true
    }
    return false
  }), false)
  await context.setOffline(true)
  await page.reload()
  await page.getByRole('button', { name: 'نمایش تست آپدیت' }).waitFor()
  await context.setOffline(false)
  // A corrupt third release must not replace the healthy second release.
  await finalizeRelease(nextRoot, String(Number(nextId) + 1))
  corrupt = true
  await page.evaluate(async () => {
    const registration = await navigator.serviceWorker.getRegistration()
    window.failedUpdate = new Promise(resolve => registration.addEventListener('updatefound', () => {
      const worker = registration.installing
      worker.addEventListener('statechange', () => { if (worker.state === 'redundant') resolve(true) })
    }, { once: true }))
    await registration.update()
  })
  await page.waitForFunction(() => window.failedUpdate, null, { timeout: 60000 })
  assert.equal(await page.evaluate(async () => Boolean((await navigator.serviceWorker.getRegistration()).waiting)), false)
  assert.equal(await page.evaluate(() => localStorage.getItem('update-test-preserved')), 'yes')
  assert.deepEqual(errors, [])
  console.log('PASS: update waiting/apply, persistent storage, edited-tab protection, offline restart, corrupt release rejected, cache isolation, no page errors')
} finally {
  await browser.close()
  server.close()
}
