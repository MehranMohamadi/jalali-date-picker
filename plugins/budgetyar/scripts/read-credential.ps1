param([Parameter(Mandatory = $true)][string]$Path)
$ErrorActionPreference = 'Stop'
$connection = Get-Content -LiteralPath $Path -Raw -Encoding UTF8 | ConvertFrom-Json
$secret = ConvertTo-SecureString $connection.encryptedToken
try {
  [Console]::Out.Write([System.Net.NetworkCredential]::new('', $secret).Password)
} finally {
  $secret.Dispose()
}
