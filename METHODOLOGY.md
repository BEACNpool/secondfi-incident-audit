# Methodology

## Forensic Principles

This audit package follows conservative forensic principles:

- Preserve source evidence separately from derived outputs.
- Prefer reproducible claims over speculative interpretation.
- Label assumptions, confidence levels, and review-only records.
- Record hashes and custody events for material artifacts.
- Treat generated reports as summaries, not substitutes for source evidence.

## Workflow Overview

The public audit workflow is organized into seven stages:

1. Evidence acquisition.
2. Evidence normalization.
3. Entity and wallet review.
4. Transaction flow reconstruction.
5. Impact dataset generation.
6. Independent validation.
7. Public report and PDF audit trail generation.

## Evidence Acquisition

Evidence acquisition should identify the source, method, timestamp, and reviewer for each item. On-chain data should be collected from Cardano mainnet sources or indexers with enough detail to reproduce the query where practical.

Acquired files should not be modified in place. If a source file must be transformed, the transformed file should be treated as a derived artifact and listed separately in the evidence manifest.

## Evidence Normalization

Normalization converts raw evidence into reviewable static datasets. Typical normalization steps may include:

- Converting address and transaction exports into CSV, JSON, or Markdown tables.
- Deduplicating wallet records.
- Separating confirmed, precursor, raw-union, and review-only wallet sets.
- Recording source file relationships for every derived dataset.
- Standardizing timestamps to UTC.
- Preserving full transaction hashes and address identifiers.

## Entity And Wallet Review

Wallet labels and entity relationships should be treated as claims with confidence levels. Clustering should be based on documented evidence, such as transaction behavior, known labels, public statements, common control indicators, or explicitly identified incident flows.

When an entity relationship is uncertain, the dataset should preserve the record as `review_only` or use a lower confidence level rather than presenting it as confirmed.

## Transaction Flow Reconstruction

Transaction flow reconstruction should map relevant source addresses, destination addresses, intermediate wallets, asset movements, timestamps, and transaction identifiers. The analysis should distinguish between direct evidence and inferred relationships.

Flow summaries should include enough supporting identifiers for a reviewer to trace the path back to Cardano mainnet records.

The public PDF audit trail uses stable local references to avoid unreadable tables:

- `S###` source wallet/source ID refs.
- `TX###` transaction refs.
- `R###` receiving destination refs.
- `F###` fee sponsor input refs.
- `M###` downstream movement refs.
- `O###` output refs.

The verification register maps those refs back to full transaction hashes, addresses, stake keys, and Cardanoscan URLs.

## Impact Dataset Generation

Impact datasets should document:

- Input files and collection timestamps.
- Inclusion and exclusion rules.
- Deduplication rules.
- Confidence thresholds.
- Review-only handling.
- Output filename, row count, and checksum.

When multiple impact datasets are published, their differences should be explicit. For example, a conservative confirmed dataset and a broader review-only dataset should not be described as interchangeable.

## Validation

Validation should include a mix of automated and manual review:

- Schema checks for expected columns and data types.
- Row count and duplicate checks.
- Spot checks against Cardano explorer or indexer records.
- Hash verification for source and generated files.
- Review of confidence labels and public claim language.

Validation findings should be recorded in the evidence manifest or release notes.

## Reproducibility

A reviewer should be able to reproduce material outputs using the static source data, documented scripts or procedures, and expected checksums. Where exact reproduction depends on an external indexer, the provider and collection timestamp should be recorded.

Any non-reproducible manual judgment should be identified as such and supported by reviewer notes.

## Generated PDF Audit Trail Outputs

PDF audit trail outputs should be generated from reviewed static datasets and should contain:

- Report title and generation timestamp.
- Dataset identifiers and checksums.
- Scope and limitation notes.
- Summary findings.
- A chronological audit trail from searched subject to direct drain tx, concrete receiving output, downstream movements, and downstream outputs where present.
- Source wallet, receiving destination, fee sponsor, movement, output, and verification registers.

PDF outputs should be listed in `EVIDENCE_MANIFEST.md` with their hash, generation method, and reviewer. If a PDF is regenerated, the new file should receive a new manifest entry rather than replacing custody history.
