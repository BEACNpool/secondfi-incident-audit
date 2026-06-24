#!/usr/bin/env python3
import json
import os
import time
import urllib.error
import urllib.request
from pathlib import Path


ROOT = Path(__file__).parent
OUT = ROOT / "audit_trail_enrichment.json"
BLOCKFROST = "https://cardano-mainnet.blockfrost.io/api/v0"


def load_json(path):
    return json.loads(path.read_text())


def blockfrost_key():
    env = os.environ.get("BLOCKFROST_PROJECT_ID")
    if env:
        return env.strip()
    path = Path.home() / ".webot" / "credentials" / "blockfrost-mainnet.txt"
    return path.read_text().strip()


def fetch_json(url, key, attempts=4):
    for attempt in range(attempts):
        req = urllib.request.Request(url, headers={"project_id": key})
        try:
            with urllib.request.urlopen(req, timeout=30) as response:
                return json.loads(response.read().decode("utf-8"))
        except urllib.error.HTTPError as exc:
            if exc.code == 429 and attempt + 1 < attempts:
                time.sleep(1.5 * (attempt + 1))
                continue
            raise


def lovelace_to_ada(amounts):
    return round(sum(int(item["quantity"]) for item in amounts if item["unit"] == "lovelace") / 1_000_000, 6)


def asset_rows(amounts):
    return sum(1 for item in amounts if item["unit"] != "lovelace")


def main():
    old = load_json(ROOT / "old_cluster_report_v2.json")["old"]
    key = blockfrost_key()
    existing = load_json(OUT) if OUT.exists() else {}
    txs = existing.setdefault("txs", {})

    recipient_by_address = {address: label for label, address in old["recipient_addresses"].items()}
    completed = 0
    for index, tx in enumerate(old["txs"], start=1):
        tx_hash = tx["tx_hash"]
        if tx_hash in txs:
            completed += 1
            continue
        utxos = fetch_json(f"{BLOCKFROST}/txs/{tx_hash}/utxos", key)
        recipient_outputs = []
        for output in utxos.get("outputs", []):
            label = recipient_by_address.get(output["address"])
            if not label:
                continue
            recipient_outputs.append(
                {
                    "outputIndex": output["output_index"],
                    "address": output["address"],
                    "recipientName": label,
                    "entityId": f"old_{label}",
                    "ada": lovelace_to_ada(output.get("amount", [])),
                    "assetRows": asset_rows(output.get("amount", [])),
                }
            )

        sponsor_inputs = [
            {
                "txHash": item["tx_hash"],
                "outputIndex": item["output_index"],
                "address": item["address"],
                "ada": lovelace_to_ada(item.get("amount", [])),
                "assetRows": asset_rows(item.get("amount", [])),
            }
            for item in utxos.get("inputs", [])
            if item["address"] == old["sponsor_address"]
        ]
        txs[tx_hash] = {
            "hash": tx_hash,
            "recipientOutputs": recipient_outputs,
            "sponsorInputs": sponsor_inputs,
            "fetchedAt": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            "source": "Blockfrost tx utxos endpoint",
        }
        completed += 1
        if completed % 25 == 0:
            OUT.write_text(json.dumps(existing, indent=2, sort_keys=True))
            print(f"enriched {completed}/{len(old['txs'])}")
        time.sleep(0.08)

    existing["generatedAt"] = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    existing["scope"] = "Exact old fee-sponsored drain transaction outputs to known receiving wallets."
    existing["recipientAddressCount"] = len(recipient_by_address)
    existing["txCount"] = len(txs)
    OUT.write_text(json.dumps(existing, indent=2, sort_keys=True))
    print(json.dumps({"out": str(OUT), "txCount": len(txs)}, indent=2))


if __name__ == "__main__":
    main()
