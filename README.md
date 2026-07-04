# SecondFi Incident Public Audit Package

This repository is a public forensic audit package for the SecondFi incident on Cardano. It is intended to provide a clear, reproducible, and evidence-oriented record of the audit scope, methodology, source data, custody controls, and generated audit trail outputs.

The package is structured for public review. It does not publish private credentials, privileged communications, or internal infrastructure details. Code included here is limited to the audit dataset builder, enrichment script, PDF generator, and verification harness used for the public audit record.

## Repository Contents

| Path | Purpose |
| --- | --- |
| `README.md` | Public overview and review guidance. |
| `INCIDENT_ANALYSIS_AND_REMEDIATION.md` | **Start here.** Consolidated incident summary (root cause, supply chain, fund flow) and remediation recommendations, synthesized from this repo's evidence and the external cross-reference below. |
| `AUDIT_SCOPE.md` | Defines the audit objectives, included evidence classes, exclusions, and limitations. |
| `METHODOLOGY.md` | Documents the forensic workflow used to collect, normalize, analyze, and validate evidence. |
| `DATA_DICTIONARY.md` | Defines expected static datasets, exported tables, common fields, and interpretation notes. |
| `EVIDENCE_MANIFEST.md` | Inventory of evidence sources, generated artifacts, hashes, and provenance notes. |
| `CHAIN_OF_CUSTODY.md` | Custody procedures for source data, derived datasets, PDF exports, and public release artifacts. |
| `CONTESTED_CLUSTER.md` | Records that the intent of the ~129M ADA `new_william_direct` sweep (theft vs. protective rescue) is unresolved from chain data alone. |
| `SUPPLEMENTAL_FINDINGS.md` | Independent cross-validation: shared funding origin between clusters, key-compromise mechanism confirmation, source-count caveats. |
| `ABCDE_WAREHOUSE_FINDINGS.md` | Live-chain ABCDE warehouse findings: reproducible load path, mechanism validation, shared funding-origin receipts, June 25 custody-movement update, a follow-up pass (no staking on principal wallets, third-party dust-tagging, ~1.94M ADA post-burst inflow tail, reward-account draining, collector live-state receipts), and the unified blast-radius census (Finding 12). |
| `BLAST_RADIUS_METHODOLOGY.md` | How the package defines, measures, bounds, and safely contains the full affected population: the exposure-vs-drain reframe, the four rings, the flow lane (built) vs. the exposure-census lane (specified), trace bounds, and the dual-use handling rule (aggregates public, raw exposed-wallet list withheld, no key recovery). |
| `EXTERNAL_ANALYSIS_TIBANE.md` | Cross-reference of this repo's fund-flow evidence against Tibane Labs' independent root-cause/supply-chain research (Ed25519 signer defect, EMURGO in-house SDK provenance). |
| `EMURGO_ACCOUNTABILITY.md` | Evidence-backed accountability assessment of EMURGO's conduct as a Cardano founding entity: SDK ownership, the audited-open → unaudited-closed signer regression, confirmed user harm, the public-statement-vs-chain custodian discrepancy, and a labeled accountability/legal argument plus a treasury-funded-legal-function recommendation. Separates findings from argument; states what is not established. |
| `sql/` | ABCDE warehouse loader and analysis SQL for reproducing live-chain checks from the checked-in evidence. |
| `evidence/abcde/` | Machine-readable CSV receipts for the ABCDE follow-up findings (June 25 custody movement, dust-tagging, post-burst inflow tail, reward-withdrawal draining), with export chain tip and regeneration steps. |
| `evidence/source/` | Static source JSON exports used to build the public visualization dataset. |
| `evidence/external/` | Third-party evidence (PDFs, page snapshots, DMCA records) and this repo's own verification checks against primary sources, supporting `EXTERNAL_ANALYSIS_TIBANE.md`. |
| `evidence/lane_b/` | Key-exposure detector validation bundle (raw tx CBOR inputs, detector output) proving the Ring 2 primitive works; exposure-only, no key recovery. |
| `evidence/audit_trail_enrichment.json` | Blockfrost-enriched old-wave tx output and fee-sponsor input records. |
| `evidence/incident-viz-data.json` | Published normalized dataset consumed by the public visualization and audit PDFs. |
| `scripts/` | Reproduction scripts for the enrichment and visualization datasets, plus `exposure_detector.py` (the validated Ring 2 key-exposure detector). |
| `site/src/` | Public audit/PDF browser code used by the live visualization. |
| `site/data/` | Site-ready copy of the published normalized dataset. |
| `verification/` | Browser and PDF download verification harness. |
| `.gitignore` | Keeps transient files, local caches, and large generated artifacts out of source control by default. |

## Evidence Sources

The audit package is designed to support evidence from Cardano mainnet data sources, locally generated exports, incident-specific wallet lists, transaction flow records, screenshots, and generated audit reports. Every evidence item that supports a public claim should be listed in `EVIDENCE_MANIFEST.md` with its source, collection method, date, hash, and reviewer.

Where external blockchain indexers or APIs are used, the manifest should identify the provider, endpoint family, query parameters when practical, and collection timestamp. Where locally generated datasets are used, the manifest should identify the source script or export process that created the artifact.

## Reproducibility

Public claims should be reproducible from the static datasets and source references included or cited in this package. Reproduction steps should identify:

- The exact static input files used.
- The script, notebook, query, or manual procedure used.
- The expected output file name and hash.
- Any known dependency on third-party indexer behavior.
- Any manual review step that cannot be fully automated.

Generated artifacts should be treated as derived outputs. They are useful for review and communication, but they should remain traceable to source evidence.

Current public reproduction path:

```sh
python3 scripts/build_incident_viz_data.py
```

Refreshing `evidence/audit_trail_enrichment.json` requires a Blockfrost mainnet key:

```sh
BLOCKFROST_PROJECT_ID=<project_id> python3 scripts/enrich_audit_trails.py
```

## Static Dataset Limits

Static datasets represent a point-in-time snapshot. They may not reflect later chain activity, re-indexed provider data, corrected labels, or additional incident intelligence collected after export. Public readers should treat static exports as audit evidence for the stated collection window, not as a live monitoring feed.

Known limits should be recorded in `AUDIT_SCOPE.md` and `EVIDENCE_MANIFEST.md`, including incomplete labels, uncertain clustering, provider rate limits, missing metadata, and any records withheld for safety or privacy reasons.

## Generated PDF Audit Trail Outputs

The audit package supports generated PDF outputs for public review, archival, and sign-off workflows. PDF reports include chronological trail rows, source/destination registers, drain ledgers, fee sponsor rows, downstream movement/output registers, verification references, generation timestamp, and source dataset identifiers.

PDF files are treated as derived records. The underlying data and methodology remain the authoritative basis for forensic conclusions.

## Review Status

Unless a release tag or signed publication note states otherwise, this repository should be considered an in-progress public audit package. Findings, labels, and impact summaries may change as additional evidence is reviewed.

## Responsible Use

This repository is provided for transparency, independent review, and incident response coordination. It should not be used to harass wallet owners, bypass legal processes, or make unsupported attribution claims.
