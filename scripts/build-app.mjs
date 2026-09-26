import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { finalizeRelease } from './update-release.mjs'

const root = fileURLToPath(new URL('../', import.meta.url))
const buildId = `${Date.now()}`
const result = spawnSync(process.execPath, ['node_modules/@nuxt/cli/bin/nuxi.mjs', 'generate', 'playground'], {
  // Vercel auto-detection otherwise moves output to .vercel/output/static.
  cwd: root, stdio: 'inherit', env: { ...process.env, NITRO_PRESET: 'static', BUDGETYAR_BUILD_ID: buildId },
})
if (result.status !== 0) process.exit(result.status ?? 1)
await finalizeRelease(new URL('../playground/.output/public/', import.meta.url), buildId)
