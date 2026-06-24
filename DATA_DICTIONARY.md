# Data Dictionary

This data dictionary defines common fields and dataset conventions for the SecondFi incident public audit package. Exact columns may vary by artifact, but material deviations should be documented in `EVIDENCE_MANIFEST.md`.

## Dataset Classes

| Dataset class | Description |
| --- | --- |
| `source_export` | Raw or minimally transformed data collected from a chain indexer, explorer, public source, or local export. |
| `normalized_table` | Cleaned table with standardized columns, timestamp format, and deduplicated identifiers. |
| `impact_dataset` | Wallet, transaction, or asset list used to support public impact statements. |
| `flow_dataset` | Transaction path or wallet movement reconstruction. |
| `review_only_dataset` | Records preserved for analysis but not presented as confirmed public findings. |
| `generated_report` | Markdown, HTML, PDF, image, CSV, JSON, or other output generated from reviewed evidence. |

## Common Fields

| Field | Type | Description |
| --- | --- | --- |
| `record_id` | string | Stable local identifier for the row or evidence item. |
| `source_id` | string | Identifier linking the row to an evidence manifest entry. |
| `network` | string | Blockchain network, expected to be `cardano-mainnet` unless otherwise noted. |
| `tx_hash` | string | Cardano transaction hash. |
| `tx_index` | integer | Transaction output or input index, where applicable. |
| `address` | string | Cardano payment address. |
| `stake_credential` | string | Stake key, reward account, or stake credential identifier when available. |
| `asset_policy_id` | string | Native asset policy ID. |
| `asset_name` | string | Asset name in decoded form when safe and available. |
| `asset_fingerprint` | string | CIP-14 asset fingerprint, when available. |
| `lovelace` | integer | ADA quantity represented in lovelace. |
| `asset_quantity` | integer or decimal string | Native asset quantity. Decimal strings may be used to avoid precision loss. |
| `timestamp_utc` | ISO 8601 string | UTC timestamp associated with the record. |
| `block_height` | integer | Cardano block height, when available. |
| `slot` | integer | Cardano slot number, when available. |
| `label` | string | Human-readable wallet, entity, or record label. |
| `label_source` | string | Source supporting the label. |
| `confidence` | enum | `confirmed`, `high_confidence`, `moderate_confidence`, `low_confidence`, or `review_only`. |
| `review_status` | enum | `unreviewed`, `in_review`, `reviewed`, `excluded`, or `published`. |
| `notes` | string | Concise explanation of assumptions, limitations, or review notes. |

## Impact Dataset Fields

| Field | Type | Description |
| --- | --- | --- |
| `wallet_id` | string | Local stable wallet identifier. |
| `wallet_address` | string | Payment address associated with the impact record. |
| `stake_credential` | string | Stake credential associated with the wallet, when known. |
| `impact_category` | string | Category such as `confirmed`, `precursor`, `raw_union`, or `review_only`. |
| `inclusion_reason` | string | Evidence-backed reason the wallet appears in the dataset. |
| `first_seen_utc` | ISO 8601 string | Earliest relevant timestamp in the reviewed data. |
| `last_seen_utc` | ISO 8601 string | Latest relevant timestamp in the reviewed data. |
| `supporting_tx_hashes` | string or array | Transaction hashes supporting inclusion. |
| `source_files` | string or array | Input files used to produce the record. |

## Flow Dataset Fields

| Field | Type | Description |
| --- | --- | --- |
| `flow_id` | string | Stable identifier for a reconstructed movement path. |
| `step_index` | integer | Ordered step number within the flow. |
| `from_address` | string | Source address for the movement step. |
| `to_address` | string | Destination address for the movement step. |
| `tx_hash` | string | Transaction supporting the movement step. |
| `amount_lovelace` | integer | ADA quantity represented in lovelace. |
| `assets` | string or array | Native asset quantities involved in the movement, when applicable. |
| `relationship_type` | string | Direct transfer, consolidation, split, exchange deposit, inferred hop, or other documented type. |
| `confidence` | enum | Confidence level for the relationship. |

## Evidence Manifest Fields

| Field | Type | Description |
| --- | --- | --- |
| `evidence_id` | string | Stable identifier for the evidence item. |
| `title` | string | Short descriptive name. |
| `category` | enum | `on_chain`, `indexer_export`, `local_derived`, `public_reference`, `generated_report`, or `review_note`. |
| `path_or_reference` | string | Local path, URL, transaction hash, or other reference. |
| `collected_at_utc` | ISO 8601 string | Collection timestamp. |
| `generated_at_utc` | ISO 8601 string | Generation timestamp for derived artifacts. |
| `sha256` | string | SHA-256 checksum for files. |
| `source_evidence_ids` | string or array | Evidence IDs used to derive the artifact. |
| `custodian` | string | Person or role responsible for handling the evidence item. |
| `review_status` | enum | Current review or publication status. |
| `public_release` | boolean | Whether the item is approved for public release. |
| `notes` | string | Limitations, assumptions, or custody notes. |

## Interpretation Notes

Cardano address, transaction, and asset identifiers should be preserved exactly. Do not truncate identifiers in machine-readable datasets. If a public report displays shortened identifiers for readability, the full identifiers must remain available in the underlying evidence.

Large integer values should be stored as integers or strings rather than floating point numbers. Timestamps should use UTC and include a timezone designator.
