import { mkdir, readFile, writeFile } from 'node:fs/promises'

const output = new URL('../mobile/dist/', import.meta.url)
await mkdir(output, { recursive: true })
const keys = await readFile(new URL('../mobile/storage-keys.json', import.meta.url), 'utf8')
const template = await readFile(new URL('../mobile/index.html', import.meta.url), 'utf8')
await writeFile(new URL('index.html', output), template.replace('/* STORAGE_KEYS */ []', keys))
await writeFile(new URL('storage-keys.json', output), keys)
await writeFile(new URL('error.html', output), await readFile(new URL('../mobile/error.html', import.meta.url)))
console.log('Mobile bootstrap ready. Run cap sync android before building the APK.')
