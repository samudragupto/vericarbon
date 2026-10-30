#!/usr/bin/env bash
# =============================================================================
# VeriCarbon - Gas Snapshot and Gas Report Extraction
# Executes `forge snapshot` and `forge test --gas-report` in packages/contracts.
# =============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
CONTRACTS_DIR="$REPO_ROOT/packages/contracts"
RESULTS_DIR="$REPO_ROOT/eval/results"

mkdir -p "$RESULTS_DIR"

echo "==> Running forge snapshot and gas report in $CONTRACTS_DIR..."
cd "$CONTRACTS_DIR"

forge snapshot --snap "$RESULTS_DIR/gas_snapshot.txt"
forge test --match-contract CarbonRegistryTest --gas-report > "$RESULTS_DIR/gas_report.txt"

echo "==> Gas snapshot written to $RESULTS_DIR/gas_snapshot.txt"
echo "==> Gas report written to $RESULTS_DIR/gas_report.txt"
