#!/usr/bin/env python3
"""Aggregate the scoped Ring 2 exposure census.

For each candidate (stake, representative in-window self-signed tx), run the
exposure detector on that tx's witnesses. A stake is "confirmed exposed" if the
tx carries >=1 vulnerable signature (SHA-512(M).B == R). One tx per stake, so the
count is a LOWER BOUND on exposure (a stake not confirmed here may still be
exposed via a different transaction).

Exposure-only: no key recovery anywhere.

Outputs:
  - <out_summary_csv>: PUBLIC per-ring aggregate (safe to publish).
  - <withheld_jsonl>:  row-level exposed-stake list. DUAL-USE -> write OUTSIDE the
                       public repo and treat as `withheld` custody evidence
                       (aggregates + a self-service checker are the public surface;
                       the raw exposed-and-funded list is not published). See
                       BLAST_RADIUS_METHODOLOGY.md sec. 5.

Usage:
  run_exposure_census.py <candidates_csv> <cbor_dir> <out_summary_csv> <withheld_jsonl>

Recommended: run under a Python with cbor2 installed so exposure_detector parses
all Conway transaction shapes (the built-in minimal decoder does not).
"""
import sys, os, csv, json

_HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, _HERE)
from exposure_detector import check_tx


def main(candidates_csv, cbor_dir, out_summary_csv, withheld_jsonl):
    rows = list(csv.reader(open(candidates_csv)))  # stake, listed, ring, tx_hash
    tx_cache = {}

    def tx_exposed(h):
        if h in tx_cache:
            return tx_cache[h]
        p = os.path.join(cbor_dir, h + ".hex")
        if not os.path.exists(p) or os.path.getsize(p) == 0:
            tx_cache[h] = None
            return None
        try:
            res = check_tx(h, open(p).read().strip())
        except Exception:
            tx_cache[h] = None
            return None
        tx_cache[h] = any(r["exposed"] for r in res)
        return tx_cache[h]

    agg, withheld = {}, []
    checked = exposed_stakes = missing = 0
    for stake, listed, ring, h in rows:
        r = tx_exposed(h)
        a = agg.setdefault((ring, listed), {"stakes": 0, "checked": 0, "exposed": 0})
        a["stakes"] += 1
        if r is None:
            missing += 1
            continue
        checked += 1
        a["checked"] += 1
        if r:
            exposed_stakes += 1
            a["exposed"] += 1
        withheld.append({"stake": stake, "ring_flow": ring,
                         "in_published_source_lists": listed, "tx_hash": h, "exposed": r})

    print(f"candidate stakes: {len(rows)}  checked: {checked}  missing: {missing}  "
          f"CONFIRMED EXPOSED: {exposed_stakes}  "
          f"rate: {(100.0*exposed_stakes/checked if checked else 0):.1f}%")

    with open(out_summary_csv, "w", newline="") as f:
        w = csv.writer(f)
        w.writerow(["ring_flow", "in_published_source_lists", "candidate_stakes",
                    "txs_checked", "confirmed_exposed", "exposure_rate_pct"])
        for (ring, listed), a in sorted(agg.items()):
            rate = round(100.0*a["exposed"]/a["checked"], 2) if a["checked"] else 0.0
            w.writerow([ring, listed, a["stakes"], a["checked"], a["exposed"], rate])
        w.writerow(["TOTAL", "", len(rows), checked, exposed_stakes,
                    round(100.0*exposed_stakes/checked, 2) if checked else 0.0])

    with open(withheld_jsonl, "w") as f:
        for r in withheld:
            f.write(json.dumps(r) + "\n")


if __name__ == "__main__":
    if len(sys.argv) != 5:
        print(__doc__)
        sys.exit(0)
    main(*sys.argv[1:5])
