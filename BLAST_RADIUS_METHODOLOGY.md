# Blast-Radius Methodology

How this package defines, measures, bounds, and safely contains the full
population affected by the SecondFi incident. This is the design doctrine; the
concrete outputs are in `sql/abcde_secondfi_blast_radius.sql`, the
`secondfi.audit_blast_*` tables/views, and `evidence/abcde/`.

## 1. The core reframe

A normal theft's blast radius is "which wallets lost funds." This incident is
different: the root cause (a signer that computed the Ed25519 nonce as
`r = SHA-512(M)`) leaks a wallet's **private key from a single ordinary
signature** made through the vulnerable code (build 10.0.3, 2026-06-08 → patch).

Therefore the true affected population is **every wallet that produced a
signature through the vulnerable signer during the exposure window** — whether or
not any funds ever moved. The set of *drained* wallets is a strict subset of the
set of *exposed* wallets. Measuring only what moved understates the incident.

## 2. The rings

| Ring | Definition | Establishable from | Status |
| --- | --- | --- | --- |
| **Ring 0** | Confirmed theft — funds drained and laundered by external actors | On-chain flow (this warehouse) | Captured |
| **Ring 1** | Swept/consolidated into the contested cluster (intent unresolved) | On-chain flow (this warehouse) | Captured |
| **Ring 2** | **Provably exposed** — emitted a vulnerable signature on-chain in the window (`SHA-512(M)·B == R`), drained or not | Transaction **witnesses/signatures** (NOT in db-sync) | **Not yet built — Lane B** |
| **Ring 3** | At-risk — used SecondFi/Yoroi in the window but has not signed on-chain since; key exposed the instant it next signs | Off-chain (app telemetry); only boundable on-chain | Out of chain-only scope; bound only |

Ring 2 is the real blast radius. Rings 0/1 are what we can already see; Ring 3 is
mostly off-chain and can only be bounded, not enumerated, from the chain.

## 3. Two lanes

The work splits into two independent data lanes so a limitation in one never
blocks the other.

### Lane A — flow census (Rings 0/1) — implemented
`sql/abcde_secondfi_blast_radius.sql`, run on the ABCDE db-sync warehouse.
Unifies the published burst source lists, the post-burst inflow tail, and
reward-account draining into one stake-keyed master table
(`secondfi.audit_blast_radius_stakes`) enriched with current holdings and native
asset counts. Bounds in §4. This is the definitive "who lost value into the
incident" set and it already expands well beyond the originally published lists.

### Lane B — exposure census (Ring 2) — primitive validated, census not yet run
For each transaction in the exposure window, extract every vkey witness and run
the detector `SHA-512(M)·B == R`, where `M` is the transaction body hash (= the
tx id) and `R` is the first 32 bytes of the 64-byte signature. A match proves the
signing key was exposed. **Every exposed stake/address that trips the detector is
a Ring 2 member.**

The detector is implemented and **validated** in `scripts/exposure_detector.py`
(self-contained Ed25519, exposure-only, no key recovery; uses `cbor2` when present
for full Conway coverage). Against known cases (`evidence/lane_b/`): the
Tibane-cited in-window tx
`4655145484f7a0f83ddea7c2c52c7ac1f86f9fc7a99ef04f78a7ab177ce02203` trips
`exposed = true` on both witnesses (which share an identical `R` — the ~2⁻²⁵⁵
message-only-nonce collision), and a 2025 pre-defect control returns `false`.

**Scoped census run (first pass).** Applied to one representative in-window,
self-signed, non-drain transaction per blast-radius stake (candidate SQL
`sql/abcde_secondfi_exposure_candidates.sql`; fetch `scripts/fetch_tx_cbor.sh`;
aggregate `scripts/run_exposure_census.py`): **2,588 of 3,063 checked stakes are
cryptographically confirmed exposed (84.5%; a lower bound)**. The transit stakes
flagged in Lane A return 0% exposed; 82.6% of the newly-captured contested-cluster
stakes confirm exposed. Public aggregate `evidence/lane_b/census_summary.csv`; the
row-level list is withheld per §5 (custody hash recorded in `evidence/lane_b/README.md`).
A full mainnet-window census (every wallet, not just blast-radius members) remains
the stretch goal and needs a dedicated CBOR source, since db-sync has no witnesses.

Hard constraints for Lane B:

- **db-sync does not store witnesses or signatures.** Lane B cannot run on ABCDE.
  It needs a raw-CBOR source: Blockfrost `/txs/{hash}/cbor`, Ogmios, or a local
  node block dump. It must **not** run against the production relay node.
- **The detector proves exposure without recovering a key.** We compute only
  `SHA-512(M)·B == R`. We never compute `a = (s − r)·H⁻¹`. No private key is ever
  derived, stored, or transmitted. This is a hard line, not a preference.
- **Scope order:** run first over the known-impacted set + their full signature
  history + in-window counterparties (tractable, definitive), then broaden. A
  full mainnet-window census is a stretch goal that requires a dedicated local
  node, not Blockfrost rate limits.

## 4. Containment — keeping the dataset bounded and reproducible

- **Tip-pinning.** Every capture records the chain tip it was taken at
  (block/slot/hash + UTC). Two runs are then diffable; "the numbers changed" is
  always explainable as chain progress, not method drift.
- **Trace bounds.** The flow graph is bounded by four explicit limits so it never
  expands into all of Cardano: (1) time window (from `2026-06-08`), (2) single-hop
  into the anchor sinks (no unbounded recursion), (3) a dust floor for reporting,
  and (4) **label-and-stop** at exchange/venue omnibus addresses — we do not trace
  through the laundering venue, where funds commingle with ~1.58B ADA of unrelated
  throughput.
- **One join key.** Everything keys on the **stake credential** (payment
  credential where no stake exists). Rings and lanes join on it.
- **Derived-only in git.** The 565 GB warehouse stays on ABCDE. The repo holds
  only deterministic CSV/JSON exports + manifests + SHA-256 hashes. The warehouse
  is the workhorse; the repo is the receipt.
- **Refreshable, not one-shot.** The tail is still growing (inflow continued
  through at least 2026-07-01). Views are re-runnable at a new tip; each refresh
  is a new tip-pinned manifest entry, never an overwrite of the custody trail.

## 5. Containment — data safety and dual-use

The Ring 2 exposure census is dual-use. A public list of "these wallets have
provably exposed keys and still hold funds" warns victims **and** advertises
targets to thieves. The handling rule:

- **Aggregates are public; the raw exposed-wallet list is `withheld`.** Publish
  ring counts, ADA totals, and time distributions. Hold the row-level Ring 2 list
  as `withheld` custody evidence (the manifest taxonomy already supports this).
- **Self-service checking, not a published hit-list.** Victims should be able to
  check whether *their own* address is exposed; the full list should not be a
  downloadable target map.
- **Coordinated disclosure.** The raw Ring 2 set goes to SecondFi/EMURGO,
  exchanges, and any recovery effort through a coordinated channel, not a public
  drop.
- **No key material, ever.** Reiterated from §3: exposure is proven without
  recovery; no private key is computed or stored at any stage.

## 6. What "complete" means here

The package is complete when:

1. Lane A master table covers the full window and is refreshable (done, this pass).
2. Lane B has enumerated Ring 2 for at least the impacted set + counterparties,
   with aggregates public and the raw set withheld.
3. A native-asset ledger accompanies the ADA figures (tokens/NFTs were swept too).
4. Every figure is tip-pinned and reproducible from the checked-in SQL + exports.

Ring 3 (used-but-not-yet-signed) is explicitly acknowledged as **not fully
chain-derivable**; the package bounds it and defers the authoritative count to
SecondFi's own app-side data.

## 7. Lane A results (first pass)

Built at ABCDE tip block `13632859`, slot `191573590`,
`2026-07-04 04:38:01 UTC`. Receipts: `evidence/abcde/abcde_blast_radius_*.csv`.

- **4,807** transactions paid value into an anchor sink inside the window.
- **3,224** stakes are in the flow blast radius — **502 of them are not in the
  originally published source lists** (which held 2,739 stake source IDs). The
  census both broadens the affected set and re-bases the money figure.
- **144,368,844.6 ADA** total attributed into the incident (apportioned by input
  share, so bounded by actual sink receipts — this replaced an earlier gross-input
  overcount). By flow-ring:

  | ring_flow | stakes | not in published lists | ADA into incident | reward-withdrawal ADA | live ADA now | distinct assets now |
  | --- | ---: | ---: | ---: | ---: | ---: | ---: |
  | `ring0_theft` | 183 | 32 | 10,648,241.21 | 66,791.40 | 58,801,439.37 | 74,768 |
  | `mixed` (both waves) | 27 | 0 | 2,389,405.40 | 61,965.68 | 73,669.04 | 72 |
  | `ring1_contested` | 3,009 | 465 | 131,331,198.00 | 727,406.82 | 40,645,131.15 | 8,105 |
  | `uncategorized` | 5 | 5 | 0.00 | 0.00 | 17.49 | 1 |

- **~856,164 ADA of drained staking rewards** across the rings (stake-key-signed
  withdrawals into sink txs) — confirming stake keys were compromised, not just
  payment keys, and that ADA-input-only tracing undercounts.
- Native assets: affected stakes' current live holdings include tens of thousands
  of distinct tokens/NFTs; token loss is real and not captured by ADA figures
  alone (per-asset loss accounting is a Lane-A extension).

**Read the count and the money separately.** `total_into_incident_ada` is the
sound figure (apportioned, bounded). The **stake count** is an **upper bound** on
distinct affected parties — it includes transit and related wallets, most visibly
in the `ring1_contested` tail and the 32 `ring0` non-list stakes, which together
contribute only ~67k ADA (0.6% of the theft wave) despite inflating the count.
`live_ada_now` is present-state context (some members are large counterparties),
**not** "funds recovered."
