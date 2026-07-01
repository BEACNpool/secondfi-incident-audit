# Audit Scope

## Objective

The objective of this public audit package is to document the forensic review of the SecondFi incident on Cardano in a way that supports public transparency, reproducibility, and independent verification.

The audit focuses on evidence-backed reconstruction of relevant on-chain activity, affected wallet sets, transaction flows, static dataset exports, and generated audit trail outputs.

## Included Scope

This package may include the following evidence classes:

- Cardano mainnet transaction records relevant to the incident window.
- Wallet address lists, stake credentials, and related clustering notes.
- Static exports of impacted or potentially impacted wallets.
- Transaction flow summaries and derived movement paths.
- Known wallet labels, with source and confidence noted.
- Generated public reports, charts, screenshots, and PDF audit trail outputs.
- Reproduction notes for scripts, queries, or manual review procedures used to produce derived artifacts.
- Cross-references to independent third-party root-cause or supply-chain research, clearly marked
  `public_reference` and separated from this repository's own fund-flow findings (see
  `EXTERNAL_ANALYSIS_TIBANE.md`).

## Excluded Scope

This package does not attempt to provide:

- Legal determinations, criminal attribution, or enforcement conclusions.
- Private victim communications or sensitive personally identifying information.
- Custodial exchange account records unless separately authorized and documented.
- A full security audit of unrelated SecondFi systems or third-party protocols.
- Live monitoring guarantees after the stated dataset export time.
- Operational playbooks that would expose private response procedures or keys.

## Network And Time Boundaries

The primary network scope is Cardano mainnet. Any non-mainnet data, off-chain logs, exchange records, screenshots, or external intelligence must be clearly marked as such in `EVIDENCE_MANIFEST.md`.

The incident time window should be recorded with exact UTC start and end timestamps once finalized. If the public package includes precursor, follow-on, or review-only datasets outside that window, those datasets must be labeled separately.

## Evidence Source Categories

Evidence sources should be grouped into these categories:

- `on_chain`: Cardano transaction, UTxO, asset, address, stake, and metadata data.
- `indexer_export`: Data collected from blockchain indexers or analytics APIs.
- `local_derived`: Files generated locally from scripts, joins, filters, or manual review.
- `public_reference`: Public web pages, screenshots, statements, or documentation.
- `generated_report`: PDF, HTML, image, CSV, JSON, Markdown, or other audit output produced from reviewed evidence.
- `review_note`: Human review notes, assumptions, or decision records.

## Static Dataset Limits

Static datasets in this package are not live chain monitors. They reflect the evidence available at the time of export. Known limitations may include:

- API pagination, rate limits, or provider-specific indexing delays.
- Incomplete wallet labels or uncertain entity clustering.
- Transactions outside the incident window that are included only for context.
- Review-only records that require additional confirmation before public use.
- Address reuse, wallet splitting, consolidation, and exchange deposit behavior that can complicate interpretation.

## Finding Confidence

Findings should use conservative confidence language:

- `confirmed`: Directly supported by source evidence and independently reproducible.
- `high_confidence`: Strongly supported by multiple evidence sources with limited ambiguity.
- `moderate_confidence`: Supported by available data but dependent on assumptions or incomplete context.
- `low_confidence`: Plausible but not sufficient for a public factual claim without further review.
- `review_only`: Preserved for audit traceability but not presented as a public conclusion.

## Public Release Criteria

Before public release, each material claim should have:

- A source evidence entry in `EVIDENCE_MANIFEST.md`.
- A reproducible path from source data to derived output.
- A documented confidence level.
- Review notes for any manual judgment.
- A custody record for source and generated artifacts.
