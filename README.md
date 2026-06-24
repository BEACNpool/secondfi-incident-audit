# SecondFi Incident Public Audit Package

This repository is a public forensic audit package for the SecondFi incident on Cardano. It is intended to provide a clear, reproducible, and evidence-oriented record of the audit scope, methodology, source data, custody controls, and generated audit trail outputs.

The package is structured for public review. It does not publish private credentials, privileged communications, internal infrastructure details, or any application source code that is not part of the audit record.

## Repository Contents

| File | Purpose |
| --- | --- |
| `README.md` | Public overview and review guidance. |
| `AUDIT_SCOPE.md` | Defines the audit objectives, included evidence classes, exclusions, and limitations. |
| `METHODOLOGY.md` | Documents the forensic workflow used to collect, normalize, analyze, and validate evidence. |
| `DATA_DICTIONARY.md` | Defines expected static datasets, exported tables, common fields, and interpretation notes. |
| `EVIDENCE_MANIFEST.md` | Inventory template for evidence sources, generated artifacts, hashes, and provenance notes. |
| `CHAIN_OF_CUSTODY.md` | Custody procedures for source data, derived datasets, PDF exports, and public release artifacts. |
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

## Static Dataset Limits

Static datasets represent a point-in-time snapshot. They may not reflect later chain activity, re-indexed provider data, corrected labels, or additional incident intelligence collected after export. Public readers should treat static exports as audit evidence for the stated collection window, not as a live monitoring feed.

Known limits should be recorded in `AUDIT_SCOPE.md` and `EVIDENCE_MANIFEST.md`, including incomplete labels, uncertain clustering, provider rate limits, missing metadata, and any records withheld for safety or privacy reasons.

## Generated PDF Audit Trail Outputs

The audit package supports generated PDF outputs for public review, archival, and sign-off workflows. PDF reports should include the generation timestamp, source dataset identifiers, reviewer notes, and a checksum recorded in the evidence manifest.

PDF files are treated as derived records. The underlying data and methodology remain the authoritative basis for forensic conclusions.

## Review Status

Unless a release tag or signed publication note states otherwise, this repository should be considered an in-progress public audit package. Findings, labels, and impact summaries may change as additional evidence is reviewed.

## Responsible Use

This repository is provided for transparency, independent review, and incident response coordination. It should not be used to harass wallet owners, bypass legal processes, or make unsupported attribution claims.
