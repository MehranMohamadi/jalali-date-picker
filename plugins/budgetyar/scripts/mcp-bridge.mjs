import { createInterface } from 'node:readline'
import { readFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

// Dependency-free stdio bridge for this backend's stateless JSON HTTP transport.
// Credentials remain in the launch environment and never appear in tool results.
let token = process.env.BUDGETYAR_MCP_TOKEN
let url = process.env.BUDGETYAR_MCP_URL
let endpoint
try {
  if (!token && !url && process.platform === 'win32' && process.env.LOCALAPPDATA) {
    const path = join(process.env.LOCALAPPDATA, 'Budgetyar', 'Codex', 'connection.json')
    const connection = JSON.parse(readFileSync(path, 'utf8').replace(/^\uFEFF/, ''))
    url = connection.url
    token = execFileSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-File', join(dirname(fileURLToPath(import.meta.url)), 'read-credential.ps1'), '-Path', path], { encoding: 'utf8', windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'], timeout: 10_000 }).trim()
  }
  endpoint = new URL(url)
  if (endpoint.protocol !== 'https:' || endpoint.username || endpoint.password || endpoint.search || endpoint.hash) throw new Error()
  if (!/^bymcp_[a-f0-9]{64}$/.test(token || '')) throw new Error()
} catch {
  process.stderr.write('Run scripts/configure.ps1 on Windows, or set BUDGETYAR_MCP_URL and BUDGETYAR_MCP_TOKEN. The URL must use HTTPS and the key must be an account MCP key.\n')
  process.exit(1)
}

let protocolVersion = '2025-03-26'
async function forward(line) {
  let request
  try { request = JSON.parse(line) } catch { return }
  if (request.method === 'initialize' && request.params?.protocolVersion) protocolVersion = request.params.protocolVersion
  const hasID = Object.hasOwn(request, 'id')
  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      redirect: 'error',
      signal: AbortSignal.timeout(60_000),
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        Accept: 'application/json, text/event-stream',
        'MCP-Protocol-Version': protocolVersion,
      },
      body: line,
    })
    if (!response.ok) throw new Error(`Budgetyar MCP HTTP ${response.status}`)
    if (!hasID) { await response.arrayBuffer(); return }
    const result = await response.text()
    if (request.method === 'initialize') {
      const parsed = JSON.parse(result)
      if (parsed.result?.protocolVersion) protocolVersion = parsed.result.protocolVersion
    }
    // Forward raw JSON so unknown large integers are never rounded by JavaScript.
    process.stdout.write(`${result.trim()}\n`)
  } catch (error) {
    if (hasID) process.stdout.write(`${JSON.stringify({ jsonrpc: '2.0', id: request.id, error: { code: -32603, message: error instanceof Error && /^Budgetyar MCP HTTP \d+$/.test(error.message) ? error.message : 'Budgetyar MCP connection failed' } })}\n`)
  }
}

const input = createInterface({ input: process.stdin, crlfDelay: Infinity })
// Keep initialization and notifications ordered, while handling subsequent calls concurrently.
let ready = Promise.resolve()
input.on('line', line => {
  if (!line.trim()) return
  let method
  try { method = JSON.parse(line).method } catch { return }
  if (method === 'initialize' || method?.startsWith('notifications/')) ready = ready.then(() => forward(line))
  else void ready.then(() => forward(line))
})
