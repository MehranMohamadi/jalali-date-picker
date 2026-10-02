import { copyFile, mkdir, readFile, readdir } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const source = resolve(root, process.argv[2] || 'android/app/build/outputs/apk/debug/app-debug.apk')
const downloads = resolve(root, 'playground/public/downloads')
const target = resolve(downloads, 'budgetyar-latest.apk')

const appVersion = (await readFile(resolve(root, 'playground/version.ts'), 'utf8')).match(/APP_VERSION = '([^']+)'/)?.[1]
const nativeVersion = (await readFile(resolve(root, 'android/app/build.gradle'), 'utf8')).match(/versionName "([^"]+)"/)?.[1]
if (!appVersion || nativeVersion !== appVersion) throw new Error('APK and app versions must match before staging')

const apk = await readFile(source)
if (apk.length < 1024 || apk.subarray(0, 4).toString('hex') !== '504b0304') throw new Error('Invalid APK file')
await mkdir(downloads, { recursive: true })
const oldApks = (await readdir(downloads)).filter(name => name.toLowerCase().endsWith('.apk') && name !== 'budgetyar-latest.apk')
if (oldApks.length) throw new Error(`Remove older APKs from downloads: ${oldApks.join(', ')}`)
await copyFile(source, target)
console.log(`Staged latest APK ${appVersion}: ${target}`)
