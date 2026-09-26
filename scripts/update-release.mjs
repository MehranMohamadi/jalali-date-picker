import { createHash } from 'node:crypto'
import { readdir, readFile, writeFile } from 'node:fs/promises'
import { join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

export async function finalizeRelease(directory, buildId) {
  const root = directory instanceof URL ? fileURLToPath(directory) : directory
  const files = []
  async function walk(folder) {
    for (const entry of await readdir(folder, { withFileTypes: true })) {
      const path = join(folder, entry.name)
      if (entry.isDirectory()) await walk(path)
      else if (entry.isFile()) files.push(path)
    }
  }
  await walk(root)
  const manifest = []
  for (const path of files.sort()) {
    const url = '/' + relative(root, path).replaceAll('\\', '/')
    // Hosting platforms can deliberately return HTTP 404 for their error template.
    if (['/200.html', '/404.html', '/sw.js', '/version.json', '/application-shell.json'].includes(url) || url.endsWith('.map')) continue
    const content = await readFile(path)
    if (content.length > 10 * 1024 * 1024) throw new Error(`Update asset too large: ${url}`)
    manifest.push({ url, sha256: createHash('sha256').update(content).digest('hex') })
  }
  if (!manifest.some(entry => entry.url === '/index.html')) throw new Error('Missing app shell')
  const versionSource = await readFile(new URL('../playground/version.ts', import.meta.url), 'utf8')
  const version = versionSource.match(/APP_VERSION = '([^']+)'/)[1]
  const release = { buildId, version, minNativeVersion: 2, notes: '‏آپدیت درون‌برنامه‌ای فعال شد؛ تست نمایشی در تنظیمات در دسترس است.' }
  const template = await readFile(new URL('../playground/public/sw.js', import.meta.url), 'utf8')
  const worker = template.replace('/* RELEASE */ null', JSON.stringify(release)).replace('/* MANIFEST */ []', JSON.stringify(manifest))
  await writeFile(join(root, 'sw.js'), worker)
  await writeFile(join(root, 'version.json'), JSON.stringify(release))
  await writeFile(join(root, 'application-shell.json'), JSON.stringify({ ...release, manifest }))
  console.log(`Update release ${buildId}: ${manifest.length} verified assets`)
}
