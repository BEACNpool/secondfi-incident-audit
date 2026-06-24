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
| `TBD` | `TBD` | `collected / derived / reviewed / published / superseded` | `TBD` | `TBD` | `TBD` | `TBD` |

## Public Release Review

Before an artifact is marked public, reviewers should confirm:

- The artifact does not contain private keys, credentials, or privileged communications.
- Public claims are supported by manifest evidence.
- Static dataset limitations are documented.
- Wallet labels and entity claims use appropriate confidence language.
- Generated PDF outputs are traceable to source datasets and checksums.

## Retention Notes

Public repositories should not be treated as the only evidence store. Source evidence, private review notes, and withheld artifacts may require separate controlled storage depending on legal, privacy, or incident response requirements.
