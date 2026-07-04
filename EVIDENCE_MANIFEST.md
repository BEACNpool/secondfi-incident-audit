# Evidence Manifest

This manifest records evidence sources, derived datasets, generated reports, checksums, provenance, and review status for the SecondFi incident public audit package.

Each material public claim should trace to one or more entries in this file.

## Manifest Conventions

- Use stable `evidence_id` values.
- Record UTC timestamps.
- Record SHA-256 checksums for local files.
- List source evidence IDs for derived artifacts.
- Mark review-only or non-public items clearly.
- Do not include private secrets, credentials, or privileged communications.

## Evidence Status Values

| Status | Meaning |
| --- | --- |
| `pending` | Identified but not yet collected or verified. |
| `collected` | Acquired and stored, checksum pending or review incomplete. |
| `verified` | Hash, source, and basic integrity checks completed. |
| `reviewed` | Reviewed for relevance, confidence, and public claim support. |
| `published` | Approved for public release. |
| `withheld` | Preserved for custody but excluded from public release. |

## Evidence Inventory

| Evidence ID | Category | Title | Path or Reference | Collected / Generated UTC | SHA-256 | Source Evidence IDs | Status | Public Release | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `EVID-0001` | `local_source_export` | Old fee-sponsored cluster report | `evidence/source/old_cluster_report_v2.json` | `2026-06-23T08:55:00Z` | `8c1cda5585f321fa87be58ca90d1f7fa7705e434ce432c8e02017ba81e5f10fe` | `Cardano mainnet indexer/API review` | `published` | `yes` | 240 old-wave drain tx rows, sponsor address/stake, recipient address set, source IDs, withdrawals, and asset rows. |
| `EVID-0002` | `local_source_export` | New $william-qa cluster report | `evidence/source/new_cluster_report.json` | `2026-06-23T08:52:00Z` | `e988d3575fd3be843d7ced539afaa43fc9567bc4dc695a55d88fa87377fda31d` | `Cardano mainnet indexer/API review` | `published` | `yes` | 2,853 new-wave candidate tx rows; public visualization uses the 2,850 main-burst txs at/after 2026-06-23T03:35:58Z. |
| `EVID-0003` | `local_source_export` | Known receiving-wallet flow report | `evidence/source/known_wallet_flows.json` | `2026-06-23T17:32:00Z` | `5e2a8fd59657b6b3f5480562c48967d301a46b435d636844f35e45189af15cba` | `Cardano mainnet indexer/API review` | `published` | `yes` | 108 known-wallet downstream tx rows plus balances for known destination/holding stake keys. |
| `EVID-0004` | `local_source_export` | Impacted wallet inventory | `evidence/source/impacted_wallets.json` | `2026-06-23T17:03:00Z` | `f9f4db88073c64333d094b37cfa310fc75e71d0bb5f1f1e58a05c78f91bfcdf7` | `EVID-0001,EVID-0002` | `published` | `yes` | 2,729 included high-confidence wallet/source IDs plus review-only metadata. |
| `EVID-0005` | `indexer_enrichment` | Exact old-wave recipient outputs and sponsor inputs | `evidence/audit_trail_enrichment.json` | `2026-06-24T15:31:00Z` | `f7383d1824ab5262102916743704ee9bf1afaaa08db154f7c052eef3c72c59d2` | `EVID-0001`, Blockfrost tx UTxO endpoint | `published` | `yes` | Adds exact output index, recipient address/entity, ADA, asset row count, and sponsor input UTxO records for all 240 old-wave txs. |
| `EVID-0006` | `local_derived` | Published visualization and PDF audit dataset | `evidence/incident-viz-data.json` | `2026-06-24T15:46:10Z` | `ed685e89bd5fc453d497cb0c2a728f0ee679501054af56f268d66541f1006045` | `EVID-0001,EVID-0002,EVID-0003,EVID-0004,EVID-0005` | `published` | `yes` | 3,187 mapped events, 2,729 wallet IDs, 128 time buckets; includes exact recipient outputs for old-wave drains and known downstream output records. |
| `EVID-0007` | `site_artifact` | Site-ready visualization dataset | `site/data/incident-viz-data.json` | `2026-06-24T15:46:10Z` | `ed685e89bd5fc453d497cb0c2a728f0ee679501054af56f268d66541f1006045` | `EVID-0006` | `published` | `yes` | Exact copy of `EVID-0006` for the public visualization. |
| `EVID-0008` | `source_code` | Audit enrichment script | `scripts/enrich_audit_trails.py` | `2026-06-24T15:48:00Z` | `8c9871114ce45ff06be11ad731001a1bc1fd6b8156c658e818db6ed871587956` | `EVID-0001`, Blockfrost tx UTxO endpoint | `published` | `yes` | Repo-relative script; requires `BLOCKFROST_PROJECT_ID` to refresh enrichment data. |
| `EVID-0009` | `source_code` | Visualization dataset builder | `scripts/build_incident_viz_data.py` | `2026-06-24T15:48:00Z` | `3af62d84ec7a9cac5f563253786ebb96cc89c4d92c61e9512ca8f8c9736d53c5` | `EVID-0001,EVID-0002,EVID-0003,EVID-0004,EVID-0005` | `published` | `yes` | Rebuilds `site/data/incident-viz-data.json` from the public repo layout. Regeneration updates the dataset timestamp field. |
| `EVID-0010` | `source_code` | Browser audit and PDF report logic | `site/src/app.js` | `2026-06-24T15:42:00Z` | `3311a1222206ea336fd48dde6fd0c0e5a43dcef61cff4842a520d32d93a3cf39` | `EVID-0006` | `published` | `yes` | Builds subject-specific chronological audit registers for address, stake key, and transaction-hash searches. |
| `EVID-0011` | `source_code` | PDF generator | `site/src/audit-pdf.js` | `2026-06-24T15:42:00Z` | `a38c389074d0f59fc20a53ec25f50d7972294878a211290d4f5dafd26f947c35` | `EVID-0010` | `published` | `yes` | Renders chronological trail, source register, drain ledger, receiving destination register, fee sponsor register, downstream movement/output registers, and verification references. |
| `EVID-0012` | `verification` | Browser PDF verification harness | `verification/audit-pdf-browser-check.cjs` | `2026-06-24T15:42:00Z` | `fe44dba11cd9f9d6e189dd28ed377cf0d73eed2ec1432e74888dd23725eac329` | `EVID-0010,EVID-0011` | `published` | `yes` | Playwright harness for local/live search -> audit confirmation -> PDF download tests. |
| `EVID-0013` | `public_reference` | Tibane Labs mechanism advisory (PDF) | `evidence/external/20260626b_tibane_secondfi_mechanism.pdf` | `2026-07-01T15:58:00Z` | `e04cce96c1def4a07ace89efdfe94d9f8ebce1ea247f9b6c421a0c7d72ce511b` | `https://www.tibane.net/reports/20260626b_tibane_secondfi_mechanism.pdf` | `collected` | `yes` | Third-party root-cause advisory: SecondFi's Ed25519 signer dropped the secret nonce-prefix (`r = SHA-512(M)` instead of `SHA-512(prefix‖M)`), enabling single-signature private key recovery. Not authored by this repository; see `EXTERNAL_ANALYSIS_TIBANE.md`. |
| `EVID-0014` | `public_reference` | Tibane Labs supply-chain analysis (PDF) | `evidence/external/20260627c_tibane_secondfi_supplychain.pdf` | `2026-07-01T15:58:00Z` | `9063826b51578f9ea006778734ef9bcfd9bb7f0086ab48fb7d242b318ea6045b` | `https://www.tibane.net/reports/20260627c_tibane_secondfi_supplychain.pdf` | `collected` | `yes` | Third-party provenance analysis: attributes the vulnerable signer to EMURGO's own in-house SDK ("Dullahan", npm `@stashers.io/trantor`), shipped 2026-06-08 without independent audit. Not authored by this repository; see `EXTERNAL_ANALYSIS_TIBANE.md`. |
| `EVID-0015` | `public_reference` | Tibane Labs SecondFi research page snapshot | `evidence/external/tibane_secondfi_cardano_page_snapshot_20260701.txt` | `2026-07-01T15:50:00Z` | `6b5b249ce8757595df5d451376dfed067d73af3c9f00299c00154e0b6f4f84f4` | `https://www.tibane.net/research/secondfi-cardano` | `collected` | `yes` | Rendered-DOM text snapshot of a client-side SPA page (server response alone has no route-specific content); captured via headless Chromium since the source can change without notice. |
| `EVID-0016` | `public_reference` | GitHub public DMCA archive — EMURGO takedown notice | `evidence/external/github_dmca_emurgo_takedown_2025-08-26.md` | `2026-07-01T16:05:00Z` | `2218e50a41b7bb4e851be1c870fbd3327902b3117ea47f46061e59b4ac52e9fc` | `https://github.com/github/dmca/blob/master/2025/08/2025-08-26-emurgo.md` | `verified` | `yes` | Independently fetched by this repository (not sourced from Tibane) to corroborate `EVID-0014`. EMURGO Group Pte. Ltd. claims sole ownership of proprietary "Dullahan" SDK; names a former employee as unauthorized publisher of `github.com/stashers-io/trantor`. |
| `EVID-0017` | `public_reference` | GitHub public DMCA archive — author counter-notice | `evidence/external/github_dmca_counternotice_2025-09-09.md` | `2026-07-01T16:05:00Z` | `2d1362b74524f4702ad0a473c2564ab053650bae3a2fb17f34d70248946ddc7a` | `https://github.com/github/dmca/blob/master/2025/09/2025-09-09-emurgo-counternotice.md` | `verified` | `yes` | Independently fetched by this repository. Disputes only MIT licensing of the takedown target, not that the code originated as EMURGO's Dullahan project. |
| `EVID-0018` | `indexer_export` | Independent verification bundle for Tibane claims | `evidence/external/tibane_claims_verification_20260701.json` | `2026-07-01T16:10:00Z` | `4c9ac19cbc5e4fcf47a196e3a80c88a909bb9d1a28a6e88f75fe313262c9b8da` | `npm registry API, GitHub API, GitHub DMCA archive, Blockfrost tx endpoint` | `reviewed` | `yes` | This repository's own re-checks of checkable claims from `EVID-0013`/`EVID-0014` against primary sources: npm package metadata, GitHub 404s for the takedown target, DMCA record text, and on-chain existence/timestamp of the tx Tibane cites as reproducing their predicted nonce. Explicitly lists claims NOT independently verified (decompilation match %, nonce-recovery math, X-account identity, aggregate loss figures). |
| `EVID-0019` | `generated_report` | ABCDE live-chain warehouse findings | `ABCDE_WAREHOUSE_FINDINGS.md` | `2026-07-04T04:38:01Z` | `bca53179e0c3104f20af0af6b09591039ad59cc593a26914dd4b383a76bcae59` | `EVID-0001,EVID-0002,EVID-0003,EVID-0004,EVID-0005,EVID-0018,EVID-0026,EVID-0027`, ABCDE `db-sync` warehouse at blocks `13628213`/`13628316`/`13632859` | `reviewed` | `yes` | Reproducible ABCDE checks. First pass (Findings 1-5): 3,093/3,093 cluster tx chain match, zero redeemers/scripts/metadata/reference/collateral inputs, shared funding-origin receipts, June 25 custody movement. Follow-up pass (Findings 6-11): no stake registration/delegation on any principal stake, June 25 movement receipts and dust-corrected balances, third-party dust-tagging of key stakes, the ~1.94M ADA post-burst inflow tail, reward-account (stake-key) draining, and collector live-state receipts. Finding 12: unified blast-radius census (3,224 stakes, 502 beyond published lists, 144.37M ADA into incident). |
| `EVID-0020` | `source_code` | ABCDE warehouse evidence loader SQL | `sql/abcde_secondfi_load.sql` | `2026-07-03T03:03:46Z` | `b499f1858a0ece375b0933c1366677116bb12024dd3dd59df231709aa38a9b27` | `EVID-0001,EVID-0002,EVID-0003,EVID-0004,EVID-0005,EVID-0018` | `reviewed` | `yes` | Creates and reloads `secondfi.audit_*` tables from the checked-in JSON evidence on ABCDE without modifying replicated `public.*` tables. |
| `EVID-0021` | `source_code` | ABCDE warehouse analysis SQL | `sql/abcde_secondfi_analysis.sql` | `2026-07-03T03:03:46Z` | `3290fadd5cc0af4a424acd94680fb3df0a66da53eed44cf1b4e0a48eed37e16c` | `EVID-0020`, ABCDE `db-sync` warehouse | `reviewed` | `yes` | Defines chain-join views for mechanism checks, funding-origin candidates, cluster overlap, and live UTxO balances using `tx_in` anti-joins instead of stale `tx_out.consumed_by_tx_id`. |
| `EVID-0022` | `source_code` | ABCDE follow-up analysis SQL | `sql/abcde_secondfi_followup.sql` | `2026-07-03T03:35:18Z` | `c55edd7b7a52899d103924a5c4719fc0aa7113a76ea44ab4f88d4dcb16adae53` | `EVID-0020,EVID-0021`, ABCDE `db-sync` warehouse | `reviewed` | `yes` | Views backing Findings 6-11: principal-wallet anchor table, stake registration/delegation status, June 25 movement outputs/inputs, dust-tagging outputs, stake-level live state, `$william-qa` live-by-day, per-tx post-burst inflow accounting (UTxO inputs + reward withdrawals, listed/unlisted split), and cluster withdrawal totals. |
| `EVID-0023` | `indexer_export` | ABCDE follow-up CSV evidence bundle | `evidence/abcde/` (per-file hashes in `evidence/abcde/SHA256SUMS`) | `2026-07-03T03:35:18Z` | `06e6504d440d155dc04b823792832c8bad9cce76a376676bfc653b75ad0f8024` (`SHA256SUMS`) | `EVID-0019,EVID-0022`, ABCDE `db-sync` warehouse at block `13628316` | `reviewed` | `yes` | Machine-readable receipts for Findings 6-11, one CSV per follow-up view, plus export chain tip and regeneration steps (`evidence/abcde/README.md`). Live-chain snapshot: re-running at a later tip can legitimately change live flags/balances. |
| `EVID-0024` | `public_reference` | EMURGO/SecondFi public-statement citation record | `evidence/external/emurgo_public_statements_20260627.md` | `2026-07-02T00:00:00Z` | `61712ab157699ffd2d89ddab40f42ef11df209edc1035c87b81de330defec4ca` | The Block, The Crypto Times, Cryptopolitan (2026-06-27 reporting) | `collected` | `yes` | **Secondary-source** citation record of EMURGO/SecondFi public statements: two-week refund commitment, "moved ~129M ADA to an independent third-party custodian," reimbursement fund + unnamed external accounting firm, ~16M/374 loss figure. Not a capture of EMURGO's own primary channel — flagged for primary-source hardening (`EMURGO_ACCOUNTABILITY.md` §8). |
| `EVID-0025` | `generated_report` | EMURGO accountability assessment | `EMURGO_ACCOUNTABILITY.md` | `2026-07-03T03:35:18Z` | `30dd8d54afb53e3f2f2e702814984b74a9cb372a8ea55bd495652f27895c7267` | `EVID-0013,EVID-0016,EVID-0017,EVID-0018,EVID-0019,EVID-0023,EVID-0024` | `reviewed` | `yes` | Evidence-backed accountability assessment of EMURGO's conduct as a founding entity. §§1-4 are labeled findings (founding-entity/SDK-ownership, open→closed audited-signer regression, no-completed-audit with the "paid to audit" correction, confirmed harm, and the public-statement-vs-chain custodian discrepancy); §§5-6 are a labeled accountability/legal argument and a treasury-funded-legal-function recommendation; §7 states what is NOT established (no proven malice, no proven 129M theft, no legal-liability finding). Point-in-time; two-week refund window had not elapsed at writing. |
| `EVID-0026` | `generated_report` | Blast-radius methodology | `BLAST_RADIUS_METHODOLOGY.md` | `2026-07-04T04:38:01Z` | `450f42198cda35cef2a7029588e419e3277a9f4bd3e61449920cf24c1f57fd1d` | `EVID-0013,EVID-0019,EVID-0023,EVID-0027` | `reviewed` | `yes` | Design doctrine for capturing and containing the full affected population: exposure-vs-drain reframe, four-ring model, Lane A (flow, built) vs Lane B (exposure census, specified), trace bounds, tip-pinning, and the dual-use handling rule (public aggregates, withheld raw exposed-wallet list, no key recovery). Includes Lane A first-pass results. |
| `EVID-0027` | `source_code` | ABCDE blast-radius census SQL | `sql/abcde_secondfi_blast_radius.sql` | `2026-07-04T04:38:01Z` | `35ad4f6105f73cd665778bc54ae7fcc61a9fbd11be39dd02a4ca12cf5ab39554` | `EVID-0020,EVID-0021,EVID-0022`, ABCDE `db-sync` warehouse | `reviewed` | `yes` | Lane A flow-census: builds anchor-sink/operator tables and the `secondfi.audit_blast_radius_stakes` master (stake-keyed, apportioned ADA-into-incident bounded by sink receipts) plus summary/coverage/downstream views. Read-only on `public.*`; `tx_in` anti-joins for live state. |
| `EVID-0028` | `indexer_export` | Blast-radius CSV bundle | `evidence/abcde/abcde_blast_radius_*.csv`, `abcde_blast_downstream.csv` (hashes in `evidence/abcde/SHA256SUMS`) | `2026-07-04T04:38:01Z` | `cf9c43fea7a080f6f5c7e10d62b078ef68f6ac7f06eda9cb6670f59ebcf7069c` (`SHA256SUMS`) | `EVID-0026,EVID-0027`, ABCDE `db-sync` warehouse at block `13632859` | `reviewed` | `yes` | Census receipts: per-ring summary, coverage delta, full stake-keyed master (3,224 stakes; 502 beyond published lists; 144.37M ADA into incident), downstream disposition, and export chain tip. Money figure apportioned/bounded; stake count is an upper bound. |

## Hashing Procedure

Use SHA-256 for file integrity checks. Record the exact command, platform, and output when practical.

Recommended command:

```sh
shasum -a 256 path/to/file
```

## Generated PDF Audit Trail Outputs

Generated PDFs should be listed as `generated_report` evidence. Each entry should include:

- Source dataset evidence IDs.
- Generation timestamp in UTC.
- Generation script, command, or manual export procedure.
- Reviewer or custodian.
- SHA-256 checksum.
- Public release status.

PDFs should not replace the static datasets they summarize. The datasets and methodology remain the authoritative audit basis.

## Static Dataset Limits

Any static dataset listed here must include notes about collection time, provider behavior, filters, and known gaps. If a dataset is later regenerated, add a new manifest entry rather than overwriting the prior custody trail.
