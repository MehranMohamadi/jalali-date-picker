import fs from 'node:fs'

const path = new URL('../playground/version.ts', import.meta.url)
const source = fs.readFileSync(path, 'utf8')
const current = source.match(/(\d+)\.(\d+)\.(\d+)/)
if (!current) throw new Error('APP_VERSION not found')
const next = `${current[1]}.${current[2]}.${Number(current[3]) + 1}`
fs.writeFileSync(path, `export const APP_VERSION = '${next}'\n`)
console.log(`Budgetyar version: ${next}`)
