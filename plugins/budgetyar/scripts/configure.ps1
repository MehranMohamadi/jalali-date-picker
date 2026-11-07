param([Parameter(Mandatory = $true)][string]$McpUrl)
$ErrorActionPreference = 'Stop'
$endpoint = [Uri]$McpUrl
if (!$endpoint.IsAbsoluteUri -or $endpoint.Scheme -ne 'https' -or $endpoint.UserInfo -or $endpoint.Query -or $endpoint.Fragment -or $endpoint.AbsolutePath -ne '/api/mcp') {
  throw 'Use the HTTPS backend endpoint: https://YOUR-BACKEND/api/mcp'
}
if (!$env:LOCALAPPDATA) { throw 'This setup script requires Windows. Other platforms can use environment variables.' }
$secret = Read-Host 'Budgetyar MCP key (input is hidden)' -AsSecureString
$plain = [System.Net.NetworkCredential]::new('', $secret).Password
if ($plain -notmatch '^bymcp_[a-f0-9]{64}$') { $plain = $null; throw 'Invalid Budgetyar MCP key' }
$plain = $null
$connectionDir = Join-Path $env:LOCALAPPDATA 'Budgetyar/Codex'
New-Item -ItemType Directory -Path $connectionDir -Force | Out-Null
$connection = @{ url = $endpoint.AbsoluteUri; encryptedToken = (ConvertFrom-SecureString $secret) }
$connection | ConvertTo-Json | Set-Content -LiteralPath (Join-Path $connectionDir 'connection.json') -Encoding UTF8
$secret.Dispose()
Write-Host 'Connection saved using Windows user encryption. Install the plugin, or add the bridge as a Codex MCP server. Never share connection.json.'
