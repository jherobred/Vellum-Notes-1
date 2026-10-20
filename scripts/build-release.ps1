# Builds the files for a GitHub release into dist/:
#   Vellum-Setup-<version>.exe       per-user installer, no admin
#   Vellum-<version>-portable.exe    the app alone, nothing to install
#   SHA256SUMS.txt                   their checksums
#   NOTES.md                         release text
#
# Run on Windows, after `npx vite build --config vite.desktop.config.ts`.

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

$version = (Select-String -Path (Join-Path $root "desktop\Cargo.toml") -Pattern 'version = "([^"]+)"' | Select-Object -First 1).Matches[0].Groups[1].Value

function Invoke-Native([string]$what, [scriptblock]$block) {
  Write-Host "==> $what"
  & $block
  if ($LASTEXITCODE -ne 0) { throw "$what failed (exit code $LASTEXITCODE)" }
}

Invoke-Native "Build the app" { cargo build --release --locked --manifest-path (Join-Path $root "desktop\Cargo.toml") }

$payload = Join-Path $root "desktop\target\release\vellum.exe"
if (-not (Test-Path $payload)) { throw "Missing $payload" }
$env:VELLUM_PAYLOAD_PATH = (Resolve-Path $payload).Path
Invoke-Native "Build the installer" { cargo build --release --locked --manifest-path (Join-Path $root "installer\Cargo.toml") }

$dist = Join-Path $root "dist"
if (Test-Path $dist) { Remove-Item -LiteralPath $dist -Recurse -Force }
New-Item -ItemType Directory -Force $dist | Out-Null

Copy-Item $payload (Join-Path $dist "Vellum-$version-portable.exe")
Copy-Item (Join-Path $root "installer\target\release\vellum-setup.exe") (Join-Path $dist "Vellum-Setup-$version.exe")

$sums = Get-ChildItem $dist -File | Sort-Object Name | ForEach-Object {
  "{0}  {1}" -f (Get-FileHash -Algorithm SHA256 $_.FullName).Hash.ToLowerInvariant(), $_.Name
}
[IO.File]::WriteAllText((Join-Path $dist "SHA256SUMS.txt"), (($sums -join "`n") + "`n"))

$portable = "Vellum-$version-portable.exe"
$setup = "Vellum-Setup-$version.exe"
$notesPath = Join-Path $dist "NOTES.md"
$noteLines = @(
  "First Windows release of Vellum, a quiet writing desk. Notes stay on this PC.",
  "",
  "**Install:** download ``$setup`` and run it. It installs for your user only, no admin needed, and adds Vellum to the Start menu.",
  "",
  "**No install:** download ``$portable`` and run it from anywhere.",
  "",
  "The builds are not code-signed yet, so Windows SmartScreen may say `"Windows protected your PC`". Choose **More info**, then **Run anyway**.",
  "",
  "## Files",
  "",
  "- ``$setup``: the installer",
  "- ``$portable``: the app, nothing to install",
  "- ``SHA256SUMS.txt``: checksums",
  "",
  '```',
  ($sums -join "`n"),
  '```'
)
[IO.File]::WriteAllText($notesPath, (($noteLines -join "`n") + "`n"))
Get-ChildItem $dist | ForEach-Object { Write-Host ("{0,-40} {1,8:N1} MB" -f $_.Name, ($_.Length / 1MB)) }
