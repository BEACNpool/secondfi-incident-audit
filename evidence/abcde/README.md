# ABCDE Follow-Up CSV Evidence Bundle

Machine-readable exports backing Findings 6-11 in `../../ABCDE_WAREHOUSE_FINDINGS.md`.

- Export chain tip: block `13628316`, slot `191483427`, `2026-07-03 03:35:18 UTC`
  (recorded in `abcde_export_chain_tip.csv`).
- Produced from a Cardano `db-sync` warehouse (logical subscriber) after loading the
  checked-in evidence with `sql/abcde_secondfi_load.sql` and creating the analysis
  views with `sql/abcde_secondfi_analysis.sql` and `sql/abcde_secondfi_followup.sql`.
- All timestamps are UTC. All ADA figures are lovelace/1,000,000 as `numeric`.
- Live-UTxO state is computed with a `tx_in` anti-join, never
  `tx_out.consumed_by_tx_id` (unreliable on a logical subscriber).

## Regeneration

Against any synced db-sync instance holding the loaded `secondfi.audit_*` schema:

```sh
psql -d <dbsync_db> -f sql/abcde_secondfi_load.sql      # once, loads evidence JSON
psql -d <dbsync_db> -f sql/abcde_secondfi_analysis.sql  # base views
psql -d <dbsync_db> -f sql/abcde_secondfi_followup.sql  # follow-up views
for v in stake_status june25_outputs june25_inputs dust_tagging key_wallet_live \
         william_live_by_day postburst_inflow_txs cluster_withdrawals; do
  psql -d <dbsync_db> --csv \
    -c "select * from secondfi.audit_followup_$v;" > abcde_followup_$v.csv
done
```

Because these are live-chain queries, re-running at a later tip can legitimately
change `live` flags and balances; compare against the tip recorded above.

## Files

| File | View | Contents |
| --- | --- | --- |
| `abcde_export_chain_tip.csv` | — | Chain tip at export time. |
| `abcde_followup_stake_status.csv` | `audit_followup_stake_status` | Registration/delegation state of the principal stakes (none was ever registered or delegated). |
| `abcde_followup_june25_outputs.csv` | `audit_followup_june25_outputs` | Every output ever created at the June 25 destination stake, with live/spent state. |
| `abcde_followup_june25_inputs.csv` | `audit_followup_june25_inputs` | Input provenance (by source stake) of every tx that paid the June 25 destination stake. |
| `abcde_followup_dust_tagging.csv` | `audit_followup_dust_tagging` | All outputs using the third-party "dust tagger" payment credential `489f0e23…`, including the four 5-10 ADA tag outputs pairing it with incident stakes. |
| `abcde_followup_key_wallet_live.csv` | `audit_followup_key_wallet_live` | Stake-level live UTxO count/ADA and last outgoing spend for each principal wallet. |
| `abcde_followup_william_live_by_day.csv` | `audit_followup_william_live_by_day` | `$william-qa` live UTxOs bucketed by creation day. |
| `abcde_followup_postburst_inflow_txs.csv` | `audit_followup_postburst_inflow_txs` | Per-tx accounting of the 1,134-tx post-burst inflow tail to `$william-qa` (2026-06-23 12:30 UTC → tip): ADA delivered, UTxO-input ADA split listed/unlisted/no-stake, reward-withdrawal ADA split listed/unlisted. |
| `abcde_followup_cluster_withdrawals.csv` | `audit_followup_cluster_withdrawals` | Reward-account withdrawal totals inside the 3,093 main-cluster txs. |

## Lane A blast-radius census (`sql/abcde_secondfi_blast_radius.sql`)

Flow blast radius (Rings 0/1), built at a later tip — block `13632859`, slot
`191573590`, `2026-07-04 04:38:01 UTC` (recorded in `abcde_blast_radius_tip.csv`).
See `BLAST_RADIUS_METHODOLOGY.md` for the ring model, bounds, and dual-use
posture. `total_into_incident_ada` is apportioned by each source's input share of
the sink receipt (bounded by what the sink actually received — not gross tx
inputs); the stake **count** is an upper bound (includes transit/related wallets).

| File | View/Table | Contents |
| --- | --- | --- |
| `abcde_blast_radius_tip.csv` | — | Chain tip at census export. |
| `abcde_blast_radius_summary.csv` | `audit_blast_radius_summary` | Per-ring rollup: stakes, listed vs not, ADA into incident, reward-withdrawal ADA, current live ADA, current distinct assets. |
| `abcde_blast_radius_coverage.csv` | `audit_blast_radius_coverage` | Coverage delta: published stake source IDs vs total census stakes vs newly captured. |
| `abcde_blast_radius_stakes.csv` | `audit_blast_radius_stakes` | Full stake-keyed master census (one row per affected stake): list membership, waves fed, apportioned ADA into incident, reward withdrawals, current live ADA/UTxOs/assets, first/last activity, flow-ring. |
| `abcde_blast_downstream.csv` | `audit_blast_downstream` | Downstream disposition of sink funds from the known-flow evidence (label-and-stop; no venue pass-through). |
