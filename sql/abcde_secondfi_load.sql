-- Load the checked-in SecondFi incident evidence into ABCDE's local analysis schema.
--
-- Run on abcde as the postgres role after copying evidence files to:
--   /tmp/secondfi-load/
--
-- This script only owns tables prefixed with audit_. Existing scratch tables in
-- schema secondfi are intentionally left alone.

\set ON_ERROR_STOP on

BEGIN;

CREATE SCHEMA IF NOT EXISTS secondfi;

CREATE TABLE IF NOT EXISTS secondfi.audit_source_files (
  evidence_name text PRIMARY KEY,
  repo_path text NOT NULL,
  sha256 text NOT NULL,
  loaded_at timestamptz NOT NULL DEFAULT now(),
  payload jsonb NOT NULL
);

CREATE TABLE IF NOT EXISTS secondfi.audit_impacted_wallets (
  record_id bigserial PRIMARY KEY,
  source_id text NOT NULL,
  id_type text NOT NULL,
  clusters text[] NOT NULL,
  roles text[] NOT NULL,
  confidence integer,
  tx_count integer,
  ada_to_known_destinations numeric,
  asset_rows_to_known_destinations integer,
  first_time timestamptz,
  last_time timestamptz,
  sample_tx_hashes text[] NOT NULL DEFAULT '{}',
  notes text,
  review_only boolean NOT NULL DEFAULT false,
  raw jsonb NOT NULL
);

CREATE TABLE IF NOT EXISTS secondfi.audit_cluster_source_ids (
  cluster text NOT NULL,
  source_id text NOT NULL,
  id_type text NOT NULL,
  source_file text NOT NULL,
  PRIMARY KEY (cluster, source_id, source_file)
);

CREATE TABLE IF NOT EXISTS secondfi.audit_cluster_addresses (
  cluster text NOT NULL,
  label text NOT NULL,
  address text,
  stake text,
  role text NOT NULL,
  source_file text NOT NULL,
  PRIMARY KEY (cluster, label, role)
);

CREATE TABLE IF NOT EXISTS secondfi.audit_cluster_txs (
  cluster text NOT NULL,
  tx_hash text NOT NULL,
  time_utc timestamptz,
  source_ids text[] NOT NULL DEFAULT '{}',
  source_count integer,
  source_input_ada numeric,
  to_cluster_ada numeric,
  fee_ada numeric,
  input_count integer,
  output_count integer,
  asset_rows jsonb,
  metadata jsonb,
  native_scripts integer,
  plutus_contracts integer,
  raw jsonb NOT NULL,
  PRIMARY KEY (cluster, tx_hash)
);

CREATE TABLE IF NOT EXISTS secondfi.audit_known_flow_txs (
  flow_id bigserial PRIMARY KEY,
  from_label text NOT NULL,
  from_address text NOT NULL,
  tx_hash text NOT NULL,
  time_utc timestamptz,
  input_ada_from_known numeric,
  fee_ada numeric,
  asset_input_rows integer,
  native_scripts integer,
  plutus_contracts integer,
  metadata boolean,
  raw jsonb NOT NULL,
  UNIQUE (tx_hash, from_label)
);

CREATE TABLE IF NOT EXISTS secondfi.audit_known_flow_outputs (
  flow_id bigint NOT NULL REFERENCES secondfi.audit_known_flow_txs(flow_id) ON DELETE CASCADE,
  output_ordinal integer NOT NULL,
  address text NOT NULL,
  stake text,
  ada numeric,
  asset_rows integer,
  raw jsonb NOT NULL,
  PRIMARY KEY (flow_id, output_ordinal)
);

CREATE TABLE IF NOT EXISTS secondfi.audit_trail_txs (
  tx_hash text PRIMARY KEY,
  fetched_at timestamptz,
  source text,
  raw jsonb NOT NULL
);

CREATE TABLE IF NOT EXISTS secondfi.audit_trail_recipient_outputs (
  tx_hash text NOT NULL REFERENCES secondfi.audit_trail_txs(tx_hash) ON DELETE CASCADE,
  output_ordinal integer NOT NULL,
  entity_id text,
  recipient_name text,
  address text NOT NULL,
  output_index integer,
  ada numeric,
  asset_rows integer,
  raw jsonb NOT NULL,
  PRIMARY KEY (tx_hash, output_ordinal)
);

CREATE TABLE IF NOT EXISTS secondfi.audit_trail_sponsor_inputs (
  tx_hash text NOT NULL REFERENCES secondfi.audit_trail_txs(tx_hash) ON DELETE CASCADE,
  input_ordinal integer NOT NULL,
  source_tx_hash text,
  output_index integer,
  address text,
  ada numeric,
  asset_rows integer,
  raw jsonb NOT NULL,
  PRIMARY KEY (tx_hash, input_ordinal)
);

CREATE TABLE IF NOT EXISTS secondfi.audit_balances (
  stake text PRIMARY KEY,
  total_ada numeric,
  utxo_ada numeric,
  status text,
  raw jsonb NOT NULL
);

CREATE TABLE IF NOT EXISTS secondfi.audit_analysis_results (
  result_name text PRIMARY KEY,
  generated_at timestamptz NOT NULL DEFAULT now(),
  payload jsonb NOT NULL
);

TRUNCATE
  secondfi.audit_analysis_results,
  secondfi.audit_balances,
  secondfi.audit_trail_sponsor_inputs,
  secondfi.audit_trail_recipient_outputs,
  secondfi.audit_trail_txs,
  secondfi.audit_known_flow_outputs,
  secondfi.audit_known_flow_txs,
  secondfi.audit_cluster_txs,
  secondfi.audit_cluster_addresses,
  secondfi.audit_cluster_source_ids,
  secondfi.audit_impacted_wallets,
  secondfi.audit_source_files
RESTART IDENTITY CASCADE;

INSERT INTO secondfi.audit_source_files (evidence_name, repo_path, sha256, payload)
VALUES
  (
    'impacted_wallets',
    'evidence/source/impacted_wallets.json',
    :'impacted_wallets_sha256',
    pg_read_file('/tmp/secondfi-load/impacted_wallets.json')::jsonb
  ),
  (
    'known_wallet_flows',
    'evidence/source/known_wallet_flows.json',
    :'known_wallet_flows_sha256',
    pg_read_file('/tmp/secondfi-load/known_wallet_flows.json')::jsonb
  ),
  (
    'old_cluster_report_v2',
    'evidence/source/old_cluster_report_v2.json',
    :'old_cluster_report_v2_sha256',
    pg_read_file('/tmp/secondfi-load/old_cluster_report_v2.json')::jsonb
  ),
  (
    'new_cluster_report',
    'evidence/source/new_cluster_report.json',
    :'new_cluster_report_sha256',
    pg_read_file('/tmp/secondfi-load/new_cluster_report.json')::jsonb
  ),
  (
    'audit_trail_enrichment',
    'evidence/audit_trail_enrichment.json',
    :'audit_trail_enrichment_sha256',
    pg_read_file('/tmp/secondfi-load/audit_trail_enrichment.json')::jsonb
  ),
  (
    'tibane_claims_verification_20260701',
    'evidence/external/tibane_claims_verification_20260701.json',
    :'tibane_claims_verification_20260701_sha256',
    pg_read_file('/tmp/secondfi-load/tibane_claims_verification_20260701.json')::jsonb
  );

WITH source_payload AS (
  SELECT payload FROM secondfi.audit_source_files WHERE evidence_name = 'impacted_wallets'
),
rows AS (
  SELECT false AS review_only, value AS raw
  FROM source_payload, jsonb_array_elements(payload->'included')
  UNION ALL
  SELECT true AS review_only, value AS raw
  FROM source_payload, jsonb_array_elements(payload->'review_only')
)
INSERT INTO secondfi.audit_impacted_wallets (
  source_id,
  id_type,
  clusters,
  roles,
  confidence,
  tx_count,
  ada_to_known_destinations,
  asset_rows_to_known_destinations,
  first_time,
  last_time,
  sample_tx_hashes,
  notes,
  review_only,
  raw
)
SELECT
  raw->>'source_id',
  raw->>'id_type',
  regexp_split_to_array(coalesce(nullif(raw->>'clusters', ''), 'unknown'), ';'),
  regexp_split_to_array(coalesce(nullif(raw->>'roles', ''), 'unknown'), ';'),
  nullif(raw->>'confidence', '')::integer,
  nullif(raw->>'tx_count', '')::integer,
  nullif(raw->>'ada_to_known_destinations', '')::numeric,
  nullif(raw->>'asset_rows_to_known_destinations', '')::integer,
  nullif(raw->>'first_time', '')::timestamptz,
  nullif(raw->>'last_time', '')::timestamptz,
  CASE
    WHEN coalesce(raw->>'sample_tx_hashes', '') = '' THEN '{}'
    ELSE regexp_split_to_array(raw->>'sample_tx_hashes', ';')
  END,
  raw->>'notes',
  review_only,
  raw
FROM rows;

WITH old_source AS (
  SELECT payload->'old' AS old FROM secondfi.audit_source_files WHERE evidence_name = 'old_cluster_report_v2'
)
INSERT INTO secondfi.audit_cluster_source_ids (cluster, source_id, id_type, source_file)
SELECT
  old->>'cluster',
  source_id,
  CASE WHEN source_id LIKE 'stake1%' THEN 'stake' ELSE 'address' END,
  'evidence/source/old_cluster_report_v2.json'
FROM old_source, jsonb_array_elements_text(old->'source_ids') AS source_id;

WITH new_source AS (
  SELECT payload->'new' AS new FROM secondfi.audit_source_files WHERE evidence_name = 'new_cluster_report'
)
INSERT INTO secondfi.audit_cluster_source_ids (cluster, source_id, id_type, source_file)
SELECT
  new->>'cluster',
  source_id,
  CASE WHEN source_id LIKE 'stake1%' THEN 'stake' ELSE 'address' END,
  'evidence/source/new_cluster_report.json'
FROM new_source, jsonb_array_elements_text(new->'source_ids') AS source_id;

WITH old_source AS (
  SELECT payload->'old' AS old FROM secondfi.audit_source_files WHERE evidence_name = 'old_cluster_report_v2'
),
recipient_rows AS (
  SELECT
    old->>'cluster' AS cluster,
    key AS label,
    value #>> '{}' AS address,
    NULL::text AS stake,
    'recipient' AS role
  FROM old_source, jsonb_each(old->'recipient_addresses')
)
INSERT INTO secondfi.audit_cluster_addresses (cluster, label, address, stake, role, source_file)
SELECT cluster, label, address, stake, role, 'evidence/source/old_cluster_report_v2.json'
FROM recipient_rows
UNION ALL
SELECT
  old->>'cluster',
  'fee_sponsor',
  old->>'sponsor_address',
  old->>'sponsor_stake',
  'fee_sponsor',
  'evidence/source/old_cluster_report_v2.json'
FROM old_source;

WITH new_source AS (
  SELECT payload->'new' AS new FROM secondfi.audit_source_files WHERE evidence_name = 'new_cluster_report'
)
INSERT INTO secondfi.audit_cluster_addresses (cluster, label, address, stake, role, source_file)
SELECT
  new->>'cluster',
  'central',
  new->>'central_address',
  new->>'central_stake',
  'central_collector',
  'evidence/source/new_cluster_report.json'
FROM new_source;

WITH known AS (
  SELECT payload FROM secondfi.audit_source_files WHERE evidence_name = 'known_wallet_flows'
),
balances AS (
  SELECT key AS stake, value AS raw
  FROM known, jsonb_each(payload->'balances')
)
INSERT INTO secondfi.audit_balances (stake, total_ada, utxo_ada, status, raw)
SELECT
  stake,
  nullif(raw->>'total_ada', '')::numeric,
  nullif(raw->>'utxo_ada', '')::numeric,
  raw->>'status',
  raw
FROM balances;

WITH old_source AS (
  SELECT payload->'old' AS old FROM secondfi.audit_source_files WHERE evidence_name = 'old_cluster_report_v2'
),
tx_rows AS (
  SELECT old->>'cluster' AS cluster, value AS raw
  FROM old_source, jsonb_array_elements(old->'txs')
)
INSERT INTO secondfi.audit_cluster_txs (
  cluster,
  tx_hash,
  time_utc,
  source_ids,
  source_count,
  source_input_ada,
  to_cluster_ada,
  fee_ada,
  input_count,
  output_count,
  asset_rows,
  metadata,
  native_scripts,
  plutus_contracts,
  raw
)
SELECT
  cluster,
  raw->>'tx_hash',
  nullif(raw->>'time', '')::timestamptz,
  COALESCE(ARRAY(SELECT jsonb_array_elements_text(raw->'source_ids')), '{}'),
  cardinality(COALESCE(ARRAY(SELECT jsonb_array_elements_text(raw->'source_ids')), '{}')),
  nullif(raw->>'source_in_ada', '')::numeric,
  nullif(raw->>'to_recip_ada', '')::numeric,
  nullif(raw->>'fee_ada', '')::numeric,
  NULL,
  nullif(raw->>'recipient_outputs', '')::integer,
  raw->'asset_rows',
  raw->'metadata',
  nullif(raw->>'native_scripts', '')::integer,
  nullif(raw->>'plutus_contracts', '')::integer,
  raw
FROM tx_rows;

WITH new_source AS (
  SELECT payload->'new' AS new FROM secondfi.audit_source_files WHERE evidence_name = 'new_cluster_report'
),
tx_rows AS (
  SELECT new->>'cluster' AS cluster, value AS raw
  FROM new_source, jsonb_array_elements(new->'txs')
)
INSERT INTO secondfi.audit_cluster_txs (
  cluster,
  tx_hash,
  time_utc,
  source_ids,
  source_count,
  source_input_ada,
  to_cluster_ada,
  fee_ada,
  input_count,
  output_count,
  asset_rows,
  metadata,
  native_scripts,
  plutus_contracts,
  raw
)
SELECT
  cluster,
  raw->>'tx_hash',
  nullif(raw->>'time', '')::timestamptz,
  COALESCE(ARRAY(SELECT jsonb_array_elements_text(raw->'source_ids')), '{}'),
  nullif(raw->>'source_count', '')::integer,
  nullif(raw->>'source_input_ada', '')::numeric,
  nullif(raw->>'to_central_ada', '')::numeric,
  nullif(raw->>'fee_ada', '')::numeric,
  nullif(raw->>'input_count', '')::integer,
  nullif(raw->>'output_count', '')::integer,
  raw->'asset_rows',
  raw->'metadata',
  nullif(raw->>'native_scripts', '')::integer,
  nullif(raw->>'plutus_contracts', '')::integer,
  raw
FROM tx_rows
ON CONFLICT (cluster, tx_hash) DO UPDATE SET raw = excluded.raw;

WITH known AS (
  SELECT payload FROM secondfi.audit_source_files WHERE evidence_name = 'known_wallet_flows'
),
flow_rows AS (
  SELECT value AS raw
  FROM known, jsonb_array_elements(payload->'flows')
),
inserted AS (
  INSERT INTO secondfi.audit_known_flow_txs (
    from_label,
    from_address,
    tx_hash,
    time_utc,
    input_ada_from_known,
    fee_ada,
    asset_input_rows,
    native_scripts,
    plutus_contracts,
    metadata,
    raw
  )
  SELECT
    raw->>'from',
    raw->>'from_address',
    raw->>'tx_hash',
    nullif(raw->>'time', '')::timestamptz,
    nullif(raw->>'input_ada_from_known', '')::numeric,
    nullif(raw->>'fee_ada', '')::numeric,
    nullif(raw->>'asset_input_rows', '')::integer,
    nullif(raw->>'native_scripts', '')::integer,
    nullif(raw->>'plutus_contracts', '')::integer,
    nullif(raw->>'metadata', '')::boolean,
    raw
  FROM flow_rows
  RETURNING flow_id, raw
)
INSERT INTO secondfi.audit_known_flow_outputs (
  flow_id,
  output_ordinal,
  address,
  stake,
  ada,
  asset_rows,
  raw
)
SELECT
  inserted.flow_id,
  outputs.ordinality,
  outputs.raw->>'address',
  outputs.raw->>'stake',
  nullif(outputs.raw->>'ada', '')::numeric,
  nullif(outputs.raw->>'asset_rows', '')::integer,
  outputs.raw
FROM inserted
CROSS JOIN LATERAL jsonb_array_elements(inserted.raw->'outputs') WITH ORDINALITY AS outputs(raw, ordinality);

WITH enrichment AS (
  SELECT payload FROM secondfi.audit_source_files WHERE evidence_name = 'audit_trail_enrichment'
),
tx_rows AS (
  SELECT key AS tx_hash, value AS raw
  FROM enrichment, jsonb_each(payload->'txs')
)
INSERT INTO secondfi.audit_trail_txs (tx_hash, fetched_at, source, raw)
SELECT tx_hash, nullif(raw->>'fetchedAt', '')::timestamptz, raw->>'source', raw
FROM tx_rows;

WITH trail AS (
  SELECT tx_hash, raw FROM secondfi.audit_trail_txs
)
INSERT INTO secondfi.audit_trail_recipient_outputs (
  tx_hash,
  output_ordinal,
  entity_id,
  recipient_name,
  address,
  output_index,
  ada,
  asset_rows,
  raw
)
SELECT
  trail.tx_hash,
  outputs.ordinality,
  outputs.raw->>'entityId',
  outputs.raw->>'recipientName',
  outputs.raw->>'address',
  nullif(outputs.raw->>'outputIndex', '')::integer,
  nullif(outputs.raw->>'ada', '')::numeric,
  nullif(outputs.raw->>'assetRows', '')::integer,
  outputs.raw
FROM trail
CROSS JOIN LATERAL jsonb_array_elements(trail.raw->'recipientOutputs') WITH ORDINALITY AS outputs(raw, ordinality);

WITH trail AS (
  SELECT tx_hash, raw FROM secondfi.audit_trail_txs
)
INSERT INTO secondfi.audit_trail_sponsor_inputs (
  tx_hash,
  input_ordinal,
  source_tx_hash,
  output_index,
  address,
  ada,
  asset_rows,
  raw
)
SELECT
  trail.tx_hash,
  inputs.ordinality,
  inputs.raw->>'txHash',
  nullif(inputs.raw->>'outputIndex', '')::integer,
  inputs.raw->>'address',
  nullif(inputs.raw->>'ada', '')::numeric,
  nullif(inputs.raw->>'assetRows', '')::integer,
  inputs.raw
FROM trail
CROSS JOIN LATERAL jsonb_array_elements(trail.raw->'sponsorInputs') WITH ORDINALITY AS inputs(raw, ordinality);

CREATE INDEX IF NOT EXISTS audit_impacted_wallets_clusters_gin
  ON secondfi.audit_impacted_wallets USING gin (clusters);
CREATE INDEX IF NOT EXISTS audit_impacted_wallets_roles_gin
  ON secondfi.audit_impacted_wallets USING gin (roles);
CREATE INDEX IF NOT EXISTS audit_impacted_wallets_source_id_idx
  ON secondfi.audit_impacted_wallets (source_id);
CREATE INDEX IF NOT EXISTS audit_cluster_source_ids_source_id_idx
  ON secondfi.audit_cluster_source_ids (source_id);
CREATE INDEX IF NOT EXISTS audit_cluster_txs_tx_hash_idx
  ON secondfi.audit_cluster_txs (tx_hash);
CREATE INDEX IF NOT EXISTS audit_known_flow_txs_tx_hash_idx
  ON secondfi.audit_known_flow_txs (tx_hash);
CREATE INDEX IF NOT EXISTS audit_known_flow_outputs_address_idx
  ON secondfi.audit_known_flow_outputs (address);
CREATE INDEX IF NOT EXISTS audit_trail_recipient_outputs_address_idx
  ON secondfi.audit_trail_recipient_outputs (address);
CREATE INDEX IF NOT EXISTS audit_trail_sponsor_inputs_address_idx
  ON secondfi.audit_trail_sponsor_inputs (address);

COMMIT;
