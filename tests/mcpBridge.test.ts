import { spawn, execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { mkdtemp, writeFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

let fixture: string
const key = `bymcp_${'a'.repeat(64)}`
beforeAll(async () => {
  fixture = await mkdtemp(join(tmpdir(), 'budgetyar-bridge-test-'))
  await writeFile(join(fixture, 'mock.mjs'), `
    import assert from 'node:assert/strict';
    globalThis.fetch = async (url, init) => {
      assert.equal(String(url), 'https://budgetyar.example.test/api/mcp');
      assert.equal(init.headers.Authorization, 'Bearer ' + process.env.BUDGETYAR_MCP_TOKEN);
      assert.equal(init.redirect, 'error');
      const req = JSON.parse(init.body);
      if (req.method === 'initialize') return new Response(JSON.stringify({jsonrpc:'2.0',id:req.id,result:{protocolVersion:'2025-03-26'}}));
      if (!Object.hasOwn(req,'id')) return new Response(null,{status:202});
      if (req.method === 'fail') return new Response('never expose response bodies or tokens',{status:401});
      return new Response('{"jsonrpc":"2.0","id":2,"result":{"data":{"large":1234567890123456789}}}');
    };
  `)
})
afterAll(async () => { if (fixture) await rm(fixture, { recursive: true, force: true }) })

function run(input: string, token = key) {
  return new Promise<{ code: number | null, stdout: string, stderr: string }>((resolveResult, reject) => {
    const child = spawn(process.execPath, ['--import', pathToFileURL(join(fixture, 'mock.mjs')).href, resolve('plugins/budgetyar/scripts/mcp-bridge.mjs')], {
      windowsHide: true,
      env: { ...process.env, BUDGETYAR_MCP_URL: 'https://budgetyar.example.test/api/mcp', BUDGETYAR_MCP_TOKEN: token },
    })
    let stdout = ''; let stderr = ''
    child.stdout.on('data', chunk => { stdout += chunk })
    child.stderr.on('data', chunk => { stderr += chunk })
    child.on('error', reject)
    child.on('close', code => resolveResult({ code, stdout, stderr }))
    child.stdin.end(input)
  })
}

describe('Budgetyar stdio bridge', () => {
  it('orders initialization and forwards full JSON without rounding numbers', async () => {
    const result = await run([
      JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '2025-03-26' } }),
      JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized' }),
      JSON.stringify({ jsonrpc: '2.0', id: 2, method: 'tools/call', params: {} }),
      '',
    ].join('\n'))
    expect(result.code, result.stderr).toBe(0)
    expect(result.stdout.trim().split('\n')).toHaveLength(2)
    expect(result.stdout).toContain('1234567890123456789')
    expect(result.stdout).not.toContain(key)
    expect(result.stderr).toBe('')
  })

  it('returns actionable HTTP errors without private server bodies', async () => {
    const result = await run(`${JSON.stringify({ jsonrpc: '2.0', id: 3, method: 'fail' })}\n`)
    expect(JSON.parse(result.stdout).error.message).toBe('Budgetyar MCP HTTP 401')
    expect(result.stdout).not.toContain('never expose')
    expect(result.stdout).not.toContain(key)
  })

  it('fails closed when the connection key is invalid', async () => {
    const result = await run('', 'invalid-private-key')
    expect(result.code).toBe(1)
    expect(result.stdout).toBe('')
    expect(result.stderr).not.toContain('invalid-private-key')
  })

  it.skipIf(process.platform !== 'win32')('stores and decrypts the key with Windows user encryption', async () => {
    const quote = (value: string) => `'${value.replaceAll("'", "''")}'`
    const configScript = resolve('plugins/budgetyar/scripts/configure.ps1')
    const readScript = resolve('plugins/budgetyar/scripts/read-credential.ps1')
    const command = `$ErrorActionPreference='Stop'; function Read-Host { ConvertTo-SecureString ${quote(key)} -AsPlainText -Force }; & ${quote(configScript)} -McpUrl 'https://budgetyar.example.test/api/mcp'; $path=Join-Path $env:LOCALAPPDATA 'Budgetyar/Codex/connection.json'; $saved=Get-Content -LiteralPath $path -Raw | ConvertFrom-Json; if ($saved.encryptedToken -eq ${quote(key)}) { throw 'Unencrypted fixture' }; $decoded=& powershell.exe -NoProfile -NonInteractive -ExecutionPolicy Bypass -File ${quote(readScript)} -Path $path; if ($decoded -ne ${quote(key)}) { throw 'Credential round trip failed' }; Write-Output 'credential round trip passed'`
    const result = await promisify(execFile)('powershell.exe', ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-Command', command], {
      windowsHide: true, env: { ...process.env, LOCALAPPDATA: fixture },
    })
    expect(result.stdout).toContain('credential round trip passed')
    expect(result.stdout).not.toContain(key)
    expect(result.stderr).toBe('')
  })
})
