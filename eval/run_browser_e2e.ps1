$ErrorActionPreference = "Stop"

$root = Resolve-Path "$PSScriptRoot\.."
Set-Location $root

Write-Host "=== Starting local services ==="

# 1. Start local Supabase PGlite gateway on 54321
$supabaseProc = Start-Process node -ArgumentList "supabase/local_server.mjs" -PassThru -NoNewWindow
Start-Sleep -Seconds 2

# 2. Start Anvil on 8545
$anvilProc = Start-Process anvil -ArgumentList "--port 8545 --chain-id 31337 --silent" -PassThru -NoNewWindow
Start-Sleep -Seconds 2

try {
    # 3. Populate initial on-chain state via IssueLocal.s.sol
    Write-Host "=== Populating initial on-chain state on Anvil ==="
    Push-Location packages/contracts
    forge script script/IssueLocal.s.sol:IssueLocalScript --rpc-url "http://127.0.0.1:8545" --broadcast
    Pop-Location

    # 4. Sync on-chain events to Supabase via SDK syncOnce
    Write-Host "=== Syncing events into Supabase ==="
    node --input-type=module -e "
import fs from 'node:fs';
import { syncOnce } from './packages/sdk/dist/index.js';
const manifest = JSON.parse(fs.readFileSync('./packages/contracts/deployments/anvil-local.json', 'utf8'));
const res = await syncOnce({
  supabaseUrl: 'http://127.0.0.1:54321',
  supabaseServiceRoleKey: 'local-service-role',
  rpcUrl: 'http://127.0.0.1:8545',
  registryAddress: manifest.CarbonRegistry,
  useEdgeFunction: false,
});
console.log('Sync result:', res);
"

    # 5. Start Next.js web application on port 3000
    Write-Host "=== Starting Next.js web application on port 3000 ==="
    $webProc = Start-Process cmd.exe -ArgumentList "/c pnpm --filter @vericarbon/web start -p 3000" -PassThru -NoNewWindow
    Start-Sleep -Seconds 4

    # 6. Run automated browser journey & lighthouse audit
    Write-Host "=== Running automated browser journey & Lighthouse audit ==="
    node eval/e2e_browser_journey.mjs

} finally {
    Write-Host "=== Cleaning up local background processes ==="
    if ($webProc) { Stop-Process -Id $webProc.Id -Force -ErrorAction SilentlyContinue }
    if ($anvilProc) { Stop-Process -Id $anvilProc.Id -Force -ErrorAction SilentlyContinue }
    if ($supabaseProc) { Stop-Process -Id $supabaseProc.Id -Force -ErrorAction SilentlyContinue }
    Get-Process -Name "node" | Where-Object { $_.CommandLine -like "*local_server.mjs*" -or $_.CommandLine -like "*next*" } | Stop-Process -Force -ErrorAction SilentlyContinue
    Get-Process -Name "anvil" -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
}

