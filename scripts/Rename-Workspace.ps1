[CmdletBinding(SupportsShouldProcess)]
param()

$ErrorActionPreference = 'Stop'
$sourceWorkspace = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '..')).Path
$workspaceParent = [System.IO.Path]::GetDirectoryName($sourceWorkspace)
$targetWorkspace = [System.IO.Path]::GetFullPath((Join-Path $workspaceParent 'RoomPilot'))

if ([System.IO.Path]::GetFileName($sourceWorkspace) -eq 'RoomPilot') {
  Write-Output 'The workspace is already named RoomPilot.'
  return
}
if ([System.IO.Path]::GetDirectoryName($targetWorkspace) -ne $workspaceParent) {
  throw 'The destination must be in the same parent directory.'
}
if (-not (Test-Path -LiteralPath (Join-Path $sourceWorkspace 'pnpm-workspace.yaml'))) {
  throw 'The source does not contain the RoomPilot workspace manifest.'
}
if (Test-Path -LiteralPath $targetWorkspace) {
  throw 'RoomPilot already exists. Refusing to overwrite or merge directories.'
}
if (-not $PSCmdlet.ShouldProcess($sourceWorkspace, "Rename to $targetWorkspace and verify dependencies")) {
  return
}

# Resolve the available package manager before moving anything.
$pnpmCommand = Get-Command pnpm -ErrorAction SilentlyContinue
if ($pnpmCommand) {
  $pnpmExecutable = $pnpmCommand.Source
} else {
  $pnpmExecutable = Join-Path $env:USERPROFILE '.cache\codex-runtimes\codex-primary-runtime\dependencies\bin\fallback\pnpm.cmd'
  if (-not (Test-Path -LiteralPath $pnpmExecutable)) {
    throw 'Install Node.js 22+ and pnpm 11, then run this script again.'
  }
}
$pnpmDirectory = Split-Path $pnpmExecutable
$runtimeNodeDirectory = Join-Path $env:USERPROFILE '.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin'
$env:PATH = "$pnpmDirectory;$runtimeNodeDirectory;$env:PATH"

# Release this PowerShell process's own working-directory handle before the move.
Set-Location -LiteralPath $workspaceParent
try {
  Move-Item -LiteralPath $sourceWorkspace -Destination $targetWorkspace -ErrorAction Stop
} catch {
  throw 'Windows is still holding the source directory open. Close Codex, VS Code and terminals using this workspace, then retry. The source has not been deleted.'
}
Set-Location -LiteralPath $targetWorkspace

# Workspace junctions on Windows may still reference the previous absolute path.
# A forced install refreshes those links; application imports are path-independent.
$env:NODE_USE_SYSTEM_CA = '1'
& $pnpmExecutable install --force --frozen-lockfile
if ($LASTEXITCODE -ne 0) { throw "The folder was renamed, but dependency installation failed. Continue from $targetWorkspace." }

foreach ($check in @('test', 'typecheck', 'build', 'test:e2e')) {
  & $pnpmExecutable $check
  if ($LASTEXITCODE -ne 0) { throw "The folder was renamed, but '$check' failed. Continue from $targetWorkspace." }
}
Write-Output "Workspace renamed and verified: $targetWorkspace"
