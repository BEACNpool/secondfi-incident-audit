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
