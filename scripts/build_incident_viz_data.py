#!/usr/bin/env python3
import collections
import json
import math
import time
from pathlib import Path


ROOT = Path(__file__).parent
OUT = ROOT / "incident-viz" / "data" / "incident-viz-data.json"


def load(name):
    return json.loads((ROOT / name).read_text())


def short(value, front=10, back=8):
    if not value:
        return ""
    if len(value) <= front + back + 3:
        return value
    return f"{value[:front]}...{value[-back:]}"


def iso_to_ts(value):
    return int(time.mktime(time.strptime(value, "%Y-%m-%dT%H:%M:%SZ")))


def bucket_time(value, minutes=5):
    ts = iso_to_ts(value)
    bucket = ts - (ts % (minutes * 60))
    return time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime(bucket))


def link_for(kind, value):
    if not value:
        return None
    if kind == "tx":
        return f"https://cardanoscan.io/transaction/{value}"
    if kind == "stake":
        return f"https://cardanoscan.io/stakekey/{value}"
    return f"https://cardanoscan.io/address/{value}"


def add_entity(entities, key, label, kind, role, confidence, address=None, stake=None, note=None):
    entities[key] = {
        "id": key,
        "label": label,
        "kind": kind,
        "role": role,
        "confidence": confidence,
        "address": address,
        "stake": stake,
        "shortAddress": short(address) if address else None,
        "shortStake": short(stake) if stake else None,
        "addressUrl": link_for("address", address) if address else None,
        "stakeUrl": link_for("stake", stake) if stake else None,
        "note": note,
    }


def event_from_old(tx, old):
    recipient_names = []
    recipient_addresses = set(old["recipient_addresses"].values())
    for name, address in old["recipient_addresses"].items():
        recipient_names.append(name)
    return {
        "id": tx["tx_hash"],
        "cluster": "old_fee_sponsored",
        "phase": "old_sweep",
        "time": tx["time"],
        "timestamp": tx["timestamp"],
        "bucket": bucket_time(tx["time"]),
        "txHash": tx["tx_hash"],
        "txUrl": link_for("tx", tx["tx_hash"]),
        "sourceIds": tx["source_ids"],
        "sourceCount": len(tx["source_ids"]),
        "from": "victim_sources_old",
        "to": "old_destination_group",
        "toLabel": "old known destinations",
        "ada": round(tx.get("to_recip_ada", 0.0), 6),
        "feeAda": round(tx.get("fee_ada", 0.0), 6),
        "assetRows": len(tx.get("asset_rows") or []),
        "confidence": 100,
        "kind": "incoming",
        "recipientNames": recipient_names,
        "recipientCount": len(recipient_addresses),
    }


def event_from_new(tx):
    return {
        "id": tx["tx_hash"],
        "cluster": "new_william_direct",
        "phase": "new_sweep",
        "time": tx["time"],
        "timestamp": tx["timestamp"],
        "bucket": bucket_time(tx["time"]),
        "txHash": tx["tx_hash"],
        "txUrl": link_for("tx", tx["tx_hash"]),
        "sourceIds": tx["source_ids"],
        "sourceCount": len(tx["source_ids"]),
        "from": "victim_sources_new",
        "to": "new_william_qa",
        "toLabel": "$william-qa central destination",
        "ada": round(tx.get("to_central_ada", 0.0), 6),
        "feeAda": round(tx.get("fee_ada", 0.0), 6),
        "assetRows": len(tx.get("asset_rows") or []),
        "confidence": 100 if tx["time"] >= "2026-06-23T03:35:58Z" else 40,
        "kind": "incoming",
    }


def known_outgoing_events(flows):
    events = []
    for item in flows.get("flows", []):
        if item["from"] == "new_big_holding":
            continue
        outputs = item.get("outputs") or []
        known_to = None
        ada = 0.0
        for out in outputs:
            if out.get("address") == "addr1qxd39k4peszxlf0x59e88hngpe5u9882y2lyhdzazsq4kfvmztd2rnqyd7j7n72akw4kd0dgmv72gz4j92fvhn29ss7vuz99":
                known_to = "new_big_holding"
                ada = out.get("ada", 0.0)
                break
            if out.get("address") == "addr1qxd39k4peszxlf0x59e88hngpe5u9882y2lyhdzazsq4kfvmztd2rnqyd7j7dgtjw00xsrnfc2ww5g47fw6969qptvjshwxpl3":
                known_to = "new_big_holding"
                ada = out.get("ada", 0.0)
                break
        if item["from"] == "new_william_qa" and not known_to:
            continue
        if item["from"].startswith("old_") and item["input_ada_from_known"] < 1000:
            continue
        events.append(
            {
                "id": item["tx_hash"],
                "cluster": "post_destination",
                "phase": "outgoing",
                "time": item["time"],
                "timestamp": item["timestamp"],
                "bucket": bucket_time(item["time"]),
                "txHash": item["tx_hash"],
                "txUrl": link_for("tx", item["tx_hash"]),
                "sourceIds": [item["from_address"]],
                "sourceCount": 1,
                "from": item["from"],
                "to": known_to or "external_outgoing",
                "toLabel": "big holding wallet" if known_to else "external / DEX / change outputs",
                "ada": round(ada or item.get("input_ada_from_known", 0.0), 6),
                "feeAda": round(item.get("fee_ada", 0.0), 6),
                "assetRows": item.get("asset_input_rows", 0),
                "confidence": 95 if known_to else 80,
                "kind": "outgoing",
                "outputs": outputs[:6],
            }
        )
    return events


def summarize_buckets(events):
    buckets = {}
    for event in events:
        key = f"{event['bucket']}|{event['phase']}"
        row = buckets.setdefault(
            key,
            {
                "bucket": event["bucket"],
                "phase": event["phase"],
                "txCount": 0,
                "sourceCount": 0,
                "ada": 0.0,
                "assetRows": 0,
            },
        )
        row["txCount"] += 1
        row["sourceCount"] += event.get("sourceCount", 0)
        row["ada"] += event.get("ada", 0.0)
        row["assetRows"] += event.get("assetRows", 0)
    return sorted(
        [
            {
                **row,
                "ada": round(row["ada"], 6),
                "intensity": min(1, math.log10(row["txCount"] + 1) / 3),
            }
            for row in buckets.values()
        ],
        key=lambda item: (item["bucket"], item["phase"]),
    )


def main():
    old = load("old_cluster_report_v2.json")["old"]
    new = load("new_cluster_report.json")["new"]
    impacted = load("impacted_wallets.json")
    review = impacted.get("review_only", [])
    flows_path = ROOT / "known_wallet_flows.json"
    flows = load("known_wallet_flows.json") if flows_path.exists() else {"flows": [], "balances": {}}

    entities = {}
    add_entity(
        entities,
        "near_intents_fee_sponsor",
        "Near-Intents / fee sponsor",
        "fee_sponsor",
        "Fee payer in old sponsored cluster, not labeled as thief",
        95,
        address=old["sponsor_address"],
        stake=old["sponsor_stake"],
        note="Role is fee sponsor in old cluster. This visualization separates fee payment from custody of stolen assets.",
    )
    add_entity(entities, "victim_sources_old", "old victim/source wallets", "source_group", "179 old-cluster source/reward IDs", 100)
    add_entity(entities, "victim_sources_new", "new victim/source wallets", "source_group", "2,568 new main-burst source IDs", 100)
    add_entity(entities, "old_destination_group", "old known destination group", "destination_group", "three old known destination wallets", 100)
    for label, address in old["recipient_addresses"].items():
        add_entity(entities, f"old_{label}", label.replace("_", " / "), "known_destination", "Old known destination wallet", 100, address=address)
    add_entity(
        entities,
        "old_USDCx_proceeds",
        "possible safety net: USDCx",
        "safety_net_candidate",
        "USDCx-heavy wallet with funds still sitting; possible safety-net holding, control unverified",
        85,
        address="addr1q8nw4dkulh8w5gdst5q87pdq9kkdpvvxpqta37qx6maryrkelj2ugdyg7kyc7xuleagy883fdtxqywym02ty3luptv9qhl98qc",
    )
    add_entity(
        entities,
        "new_william_qa",
        "$william-qa safety net",
        "safety_net_candidate",
        "$william-qa handle wallet; possible safety-net staging wallet for wave 2, control unverified",
        100,
        address=new["central_address"],
        stake=new["central_stake"],
    )
    add_entity(
        entities,
        "new_big_holding",
        "129M safety-net holding",
        "safety_net_holding",
        "Large 129.43M ADA holding destination after $william-qa consolidation; possible safety-net holding, control unverified",
        100,
        address="addr1qxd39k4peszxlf0x59e88hngpe5u9882y2lyhdzazsq4kfvmztd2rnqyd7j7dgtjw00xsrnfc2ww5g47fw6969qptvjshwxpl3",
        stake="stake1uxd39k4peszxlf0x59e88hngpe5u9882y2lyhdzazsq4kfg7pxzgy",
    )
    add_entity(entities, "external_outgoing", "external / DEX / change outputs", "external", "Observed outgoing outputs from known destinations", 80)

    incoming_old = [event_from_old(tx, old) for tx in old["txs"]]
    incoming_new = [
        event_from_new(tx)
        for tx in new["txs"]
        if tx["time"] >= "2026-06-23T03:35:58Z"
    ]
    out_events = known_outgoing_events(flows)
    events = sorted(incoming_old + incoming_new + out_events, key=lambda item: (item["timestamp"], item["id"]))

    wallets = []
    for row in impacted["included"]:
        wallets.append(
            {
                "sourceId": row["source_id"],
                "idType": row["id_type"],
                "clusters": row["clusters"],
                "roles": row["roles"],
                "confidence": row["confidence"],
                "txCount": row["tx_count"],
                "ada": row["ada_to_known_destinations"],
                "assetRows": row["asset_rows_to_known_destinations"],
                "firstTime": row["first_time"],
                "lastTime": row["last_time"],
                "sampleTxHashes": row["sample_tx_hashes"].split(";") if row["sample_tx_hashes"] else [],
                "url": link_for("stake" if row["id_type"] == "stake" else "address", row["source_id"]),
            }
        )

    balances = flows.get("balances", {})
    summary = {
        "title": "SecondFi Incident Flow Map",
        "generatedAt": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "confidenceLabel": "95%+ source-list confidence for included wallet IDs",
        "walletCount": impacted["summary"]["included_wallet_count"],
        "stakeCount": impacted["summary"]["included_stake_id_count"],
        "nonStakeAddressCount": impacted["summary"]["included_nonstake_address_count"],
        "oldWalletCount": impacted["summary"]["old_cluster_included_count"],
        "newWalletCount": impacted["summary"]["new_cluster_included_count"],
        "oldNewOverlap": impacted["summary"]["old_new_overlap_count"],
        "oldTxCount": old["tx_count"],
        "newTxCount": 2850,
        "combinedAda": impacted["summary"]["total_ada_to_known_destinations"],
        "oldAda": old["ada_to_recipients"],
        "newAda": 129438847.556332,
        "reviewOnlyCount": len(review),
        "timeStart": min(event["time"] for event in events),
        "timeEnd": max(event["time"] for event in events),
        "knownBalances": balances,
        "sourceListHash": impacted["summary"]["included_ids_sha256"],
    }
    phases = [
        {
            "id": "old_sweep",
            "label": "Old fee-sponsored sweep",
            "timeStart": old["first_time"],
            "timeEnd": old["last_time"],
            "txCount": old["tx_count"],
            "walletCount": 179,
            "ada": old["ada_to_recipients"],
            "confidence": 100,
        },
        {
            "id": "new_sweep",
            "label": "New $william-qa sweep",
            "timeStart": "2026-06-23T03:35:58Z",
            "timeEnd": "2026-06-23T10:29:15Z",
            "txCount": 2850,
            "walletCount": 2568,
            "ada": 129438847.556332,
            "confidence": 100,
        },
        {
            "id": "outgoing",
            "label": "Post-destination outgoing / consolidation",
            "timeStart": min((e["time"] for e in out_events), default="2026-06-22T00:00:00Z"),
            "timeEnd": max((e["time"] for e in out_events), default="2026-06-23T12:20:32Z"),
            "txCount": len(out_events),
            "walletCount": 0,
            "ada": round(sum(e["ada"] for e in out_events), 6),
            "confidence": 95,
        },
    ]
    data = {
        "summary": summary,
        "entities": list(entities.values()),
        "events": events,
        "buckets": summarize_buckets(events),
        "wallets": sorted(wallets, key=lambda row: (row["firstTime"], row["sourceId"])),
        "reviewOnly": review,
        "phases": phases,
        "sources": [
            {"label": "ADAspending/Cardano Treasury Explorer visual reference", "url": "https://adaspending.com/"},
            {"label": "Cardano app listing for Cardano Treasury Explorer", "url": "https://cardano.org/apps/cardano-treasury-explorer/"},
        ],
    }
    OUT.write_text(json.dumps(data, indent=2))
    print(json.dumps({"out": str(OUT), "events": len(events), "wallets": len(wallets), "buckets": len(data["buckets"]), "outgoing": len(out_events)}, indent=2))


if __name__ == "__main__":
    main()
