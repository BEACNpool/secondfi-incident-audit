# Chain Of Custody

This document defines custody controls for evidence used in the SecondFi incident public audit package.

## Custody Objectives

The custody process is designed to:

- Preserve source evidence integrity.
- Distinguish source evidence from derived artifacts.
- Record who handled each material file or output.
- Support independent verification through checksums and provenance.
- Maintain a durable public audit trail for generated reports and PDFs.

## Custody Roles

| Role | Responsibility |
| --- | --- |
| `collector` | Acquires source evidence and records collection details. |
| `analyst` | Normalizes evidence and creates derived datasets. |
| `reviewer` | Validates methodology, evidence links, and public claim language. |
| `publisher` | Approves public release artifacts and release notes. |
| `custodian` | Maintains custody records and resolves manifest discrepancies. |

One person may hold multiple roles, but role assignments should be recorded for material evidence items.

## Evidence Handling Procedure

1. Assign a stable evidence ID before or at collection time.
2. Record source, collection method, timestamp, and collector.
3. Store source evidence without in-place modification.
4. Compute and record a SHA-256 checksum for local files.
5. Create derived artifacts as separate files with their own manifest entries.
6. Link derived artifacts back to source evidence IDs.
7. Record review status and public release status.

## Derived Dataset Procedure

Derived datasets should include enough metadata to identify their source files and generation process. When practical, generated CSV, JSON, Markdown, and PDF files should include or be accompanied by:

- Input evidence IDs.
- Generation timestamp in UTC.
- Script, command, or manual procedure.
- Row count or page count.
- SHA-256 checksum.
- Reviewer notes.

## Generated PDF Audit Trail Procedure

PDF audit trail outputs are public-facing summaries or archival records generated from reviewed evidence. Before publication, each PDF should have:

- A manifest entry with category `generated_report`.
- A SHA-256 checksum.
- A recorded generation timestamp.
- Source evidence IDs for the datasets or reports used.
- Reviewer approval.
- A note describing whether the PDF is a draft, final public release, or superseded version.

If a PDF is regenerated, do not overwrite custody history. Add a new manifest entry and mark the prior version as superseded if appropriate.

## Change Log Template

| Date UTC | Evidence ID | Action | Actor / Role | Hash Before | Hash After | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `2026-06-24T15:31:00Z` | `EVID-0005` | `derived` | `Codex / analyst` | `N/A` | `f7383d1824ab5262102916743704ee9bf1afaaa08db154f7c052eef3c72c59d2` | Enriched all 240 old-wave txs with exact recipient outputs and sponsor input UTxOs via Blockfrost tx UTxO endpoint. |
| `2026-06-24T15:37:48Z` | `EVID-0006` | `derived` | `Codex / analyst` | `N/A` | `956f192e4321995ada909e075ab39976c1e363722e0495058adf347a25e84fa2` | Initial local visualization dataset with 3,187 mapped events and 2,729 included source IDs. |
| `2026-06-24T15:39:00Z` | `repository` | `published` | `Codex / publisher` | `N/A` | `45ea990` | Created public GitHub repository `TheRefreshCNFT/secondfi-incident-audit` and published initial documentation/evidence package. |
| `2026-06-24T15:42:00Z` | `EVID-0010,EVID-0011,EVID-0012` | `reviewed` | `Codex / reviewer` | `N/A` | `3311a1222206ea336fd48dde6fd0c0e5a43dcef61cff4842a520d32d93a3cf39; a38c389074d0f59fc20a53ec25f50d7972294878a211290d4f5dafd26f947c35; fe44dba11cd9f9d6e189dd28ed377cf0d73eed2ec1432e74888dd23725eac329` | Local browser/PDF verification passed for stake key, address, transaction hash, and second-wave stake-key searches. |
| `2026-06-24T15:46:10Z` | `EVID-0006,EVID-0007` | `superseded / derived` | `Codex / analyst` | `956f192e4321995ada909e075ab39976c1e363722e0495058adf347a25e84fa2` | `ed685e89bd5fc453d497cb0c2a728f0ee679501054af56f268d66541f1006045` | Public repo reproduction regenerated the visualization dataset from `evidence/source`; row counts matched and generated timestamp changed. |

## Public Release Review

Before an artifact is marked public, reviewers should confirm:

- The artifact does not contain private keys, credentials, or privileged communications.
- Public claims are supported by manifest evidence.
- Static dataset limitations are documented.
- Wallet labels and entity claims use appropriate confidence language.
- Generated PDF outputs are traceable to source datasets and checksums.

## Retention Notes

Public repositories should not be treated as the only evidence store. Source evidence, private review notes, and withheld artifacts may require separate controlled storage depending on legal, privacy, or incident response requirements.
