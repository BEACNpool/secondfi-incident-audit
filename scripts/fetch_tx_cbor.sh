#!/usr/bin/env bash
# Rate-limited fetch of raw transaction CBOR for the exposure census.
#
# Reads candidate tx hashes (4th CSV column) from a candidates file produced by
# sql/abcde_secondfi_exposure_candidates.sql, and writes one <hash>.hex file per
# unique tx into an output dir. Any tx-CBOR source works; this uses Blockfrost.
#
# The Blockfrost project_id is read from a file path or the BLOCKFROST_PROJECT_ID
# env var -- never embedded here. No secret is written to disk by this script.
#
# Usage:
#   BLOCKFROST_PROJECT_ID=xxxx ./fetch_tx_cbor.sh candidates.csv out_cbor_dir
#   ./fetch_tx_cbor.sh candidates.csv out_cbor_dir /path/to/project_id.txt
set -u
CAND=${1:?candidates csv}
CDIR=${2:?output cbor dir}
if [ -n "${3:-}" ]; then BF=$(tr -d '[:space:]' < "$3"); else BF=${BLOCKFROST_PROJECT_ID:?set BLOCKFROST_PROJECT_ID or pass a project_id file}; fi
mkdir -p "$CDIR"
mapfile -t TXS < <(cut -d, -f4 "$CAND" | sort -u)
total=${#TXS[@]}; i=0; ok=0; fail=0
for h in "${TXS[@]}"; do
  i=$((i+1)); out="$CDIR/$h.hex"
  [ -s "$out" ] && { ok=$((ok+1)); continue; }
  cbor=$(curl -s -m 20 -H "project_id: $BF" \
         "https://cardano-mainnet.blockfrost.io/api/v0/txs/$h/cbor" \
         | python3 -c "import sys,json
try: print(json.load(sys.stdin).get('cbor',''))
except Exception: print('')")
  if [ -n "$cbor" ]; then printf '%s' "$cbor" > "$out"; ok=$((ok+1)); else fail=$((fail+1)); echo "FAIL $h"; fi
  [ $((i % 200)) -eq 0 ] && echo "progress $i/$total ok=$ok fail=$fail"
  sleep 0.14   # ~7 req/s
done
echo "DONE ok=$ok fail=$fail total=$total"
