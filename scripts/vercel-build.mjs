import { cpSync, existsSync, rmSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const playground = resolve(root, 'playground')
const publicDir = resolve(root, 'public')
const nuxi = resolve(root, 'node_modules/@nuxt/cli/bin/nuxi.mjs')

const result = spawnSync(process.execPath, [nuxi, 'generate'], {
  cwd: playground,
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

const outputCandidates = [
  resolve(playground, '.output/public'),
  resolve(root, 'playground/.output/public'),
  resolve(root, '.output/public'),
  resolve(playground, 'dist'),
  resolve(root, 'dist'),
]

const output = outputCandidates.find((candidate) => existsSync(resolve(candidate, 'index.html')))

if (!output) {
  throw new Error(`Nuxt output was not generated. Checked: ${outputCandidates.join(', ')}`)
}

rmSync(publicDir, { recursive: true, force: true })
cpSync(output, publicDir, { recursive: true })

console.log(`Copied static output to ${publicDir}`)
