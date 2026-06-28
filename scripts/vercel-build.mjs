import { cpSync, existsSync, rmSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const output = resolve(root, 'playground/.output/public')
const publicDir = resolve(root, 'public')
const nuxi = resolve(root, 'node_modules/@nuxt/cli/bin/nuxi.mjs')

const result = spawnSync(process.execPath, [nuxi, 'generate', 'playground'], {
  cwd: root,
  stdio: 'inherit',
  shell: false,
})

if (result.status !== 0) {
  if (result.error) {
    console.error(result.error)
  }
  console.error(`Nuxt generate failed with status ${result.status}`)
  process.exit(result.status ?? 1)
}

if (!existsSync(output)) {
  throw new Error(`Nuxt output was not generated at ${output}`)
}

rmSync(publicDir, { recursive: true, force: true })
cpSync(output, publicDir, { recursive: true })

console.log(`Copied static output to ${publicDir}`)
