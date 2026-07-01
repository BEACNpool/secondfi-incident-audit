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
| `2026-07-01T15:58:00Z` | `EVID-0013,EVID-0014` | `collected` | `Claude Code / collector` | `N/A` | `e04cce96c1def4a07ace89efdfe94d9f8ebce1ea247f9b6c421a0c7d72ce511b; 9063826b51578f9ea006778734ef9bcfd9bb7f0086ab48fb7d242b318ea6045b` | Collected Tibane Labs' mechanism and supply-chain PDF advisories on the SecondFi root cause, external to this repo's own fund-flow evidence. |
| `2026-07-01T15:50:00Z` | `EVID-0015` | `collected` | `Claude Code / collector` | `N/A` | `6b5b249ce8757595df5d451376dfed067d73af3c9f00299c00154e0b6f4f84f4` | Captured a rendered-DOM snapshot of the source SPA page via headless Chromium; the plain HTTP response carries no route-specific content. |
| `2026-07-01T16:05:00Z` | `EVID-0016,EVID-0017` | `verified` | `Claude Code / analyst` | `N/A` | `2218e50a41b7bb4e851be1c870fbd3327902b3117ea47f46061e59b4ac52e9fc; 2d1362b74524f4702ad0a473c2564ab053650bae3a2fb17f34d70248946ddc7a` | Independently pulled GitHub's public DMCA archive records for the EMURGO takedown and author counter-notice to corroborate EVID-0014's supply-chain provenance claim from a primary source, not from Tibane. |
| `2026-07-01T16:10:00Z` | `EVID-0018` | `reviewed` | `Claude Code / reviewer` | `N/A` | `4c9ac19cbc5e4fcf47a196e3a80c88a909bb9d1a28a6e88f75fe313262c9b8da` | Compiled independent verification bundle re-checking Tibane's checkable claims (npm metadata, GitHub 404s, DMCA text, on-chain tx existence) against primary sources; explicitly enumerated claims left unverified. |
| `2026-07-01T16:15:00Z` | `repository` | `documented` | `Claude Code / publisher` | `N/A` | `pending commit` | Added `EXTERNAL_ANALYSIS_TIBANE.md` cross-referencing this repo's fund-flow evidence against Tibane Labs' root-cause/supply-chain research, per David's direction to consolidate all useful public information on the SecondFi/Yoroi incident into this repository. |

## Public Release Review

Before an artifact is marked public, reviewers should confirm:

- The artifact does not contain private keys, credentials, or privileged communications.
- Public claims are supported by manifest evidence.
- Static dataset limitations are documented.
- Wallet labels and entity claims use appropriate confidence language.
- Generated PDF outputs are traceable to source datasets and checksums.

## Retention Notes

Public repositories should not be treated as the only evidence store. Source evidence, private review notes, and withheld artifacts may require separate controlled storage depending on legal, privacy, or incident response requirements.
