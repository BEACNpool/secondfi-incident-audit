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
| `EVID-0001` | `on_chain` | Incident transaction source set | `TBD` | `TBD` | `TBD` | `N/A` | `pending` | `TBD` | Record Cardano mainnet transaction hashes, collection method, and provider. |
| `EVID-0002` | `indexer_export` | Raw Cardano indexer export | `TBD` | `TBD` | `TBD` | `EVID-0001` | `pending` | `TBD` | Include provider, endpoint family, query parameters, and pagination notes. |
| `EVID-0003` | `local_derived` | Impacted wallet dataset | `TBD` | `TBD` | `TBD` | `EVID-0001,EVID-0002` | `pending` | `TBD` | State inclusion rules, confidence level, and row count. |
| `EVID-0004` | `local_derived` | Review-only wallet dataset | `TBD` | `TBD` | `TBD` | `EVID-0001,EVID-0002` | `pending` | `TBD` | Preserve separately from confirmed public impact claims. |
| `EVID-0005` | `local_derived` | Transaction flow reconstruction | `TBD` | `TBD` | `TBD` | `EVID-0001,EVID-0002` | `pending` | `TBD` | Include flow IDs, supporting transaction hashes, and confidence levels. |
| `EVID-0006` | `generated_report` | Public audit report PDF | `TBD` | `TBD` | `TBD` | `EVID-0003,EVID-0005` | `pending` | `TBD` | Generated PDF audit trail output. Record generation script or command. |
| `EVID-0007` | `generated_report` | Public evidence summary Markdown | `TBD` | `TBD` | `TBD` | `EVID-0003,EVID-0005` | `pending` | `TBD` | Human-readable public summary derived from reviewed static datasets. |

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
