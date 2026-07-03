-- Reusable ABCDE analysis views for the SecondFi incident.
--
-- These views join the loaded public audit evidence in secondfi.audit_* to
-- ABCDE/db-sync chain tables. They are intentionally read-only.

\set ON_ERROR_STOP on

BEGIN;

CREATE OR REPLACE VIEW secondfi.audit_chain_tip AS
SELECT
  max(block_no) AS block_no,
  max(slot_no) AS slot_no,
  max(time) AS time_utc
FROM public.block;

CREATE OR REPLACE VIEW secondfi.audit_cluster_tx_chain AS
WITH incident_tx AS (
  SELECT
    act.cluster,
    act.tx_hash,
    block.block_no,
    block.slot_no,
    block.time AS chain_time_utc,
    act.time_utc AS evidence_time_utc,
    tx.id AS tx_id,
    tx.fee / 1000000.0 AS chain_fee_ada,
    act.fee_ada AS evidence_fee_ada,
    tx.out_sum / 1000000.0 AS chain_out_ada,
    act.source_input_ada,
    act.to_cluster_ada,
    act.source_count,
    act.input_count AS evidence_input_count,
    act.output_count AS evidence_output_count
  FROM secondfi.audit_cluster_txs act
  LEFT JOIN public.tx tx ON tx.hash = decode(act.tx_hash, 'hex')
  LEFT JOIN public.block block ON block.id = tx.block_id
),
input_counts AS (
  SELECT txi.tx_in_id AS tx_id, count(*) AS input_count
  FROM public.tx_in txi
  JOIN incident_tx itx ON itx.tx_id = txi.tx_in_id
  GROUP BY txi.tx_in_id
),
output_counts AS (
  SELECT txo.tx_id, count(*) AS output_count
  FROM public.tx_out txo
  JOIN incident_tx itx ON itx.tx_id = txo.tx_id
  GROUP BY txo.tx_id
),
redeemer_counts AS (
  SELECT r.tx_id, count(*) AS redeemer_count
  FROM public.redeemer r
  JOIN incident_tx itx ON itx.tx_id = r.tx_id
  GROUP BY r.tx_id
),
script_counts AS (
  SELECT s.tx_id, count(*) AS script_count
  FROM public.script s
  JOIN incident_tx itx ON itx.tx_id = s.tx_id
  GROUP BY s.tx_id
),
metadata_counts AS (
  SELECT m.tx_id, count(*) AS metadata_count
  FROM public.tx_metadata m
  JOIN incident_tx itx ON itx.tx_id = m.tx_id
  GROUP BY m.tx_id
),
reference_input_counts AS (
  SELECT ri.tx_in_id AS tx_id, count(*) AS reference_input_count
  FROM public.reference_tx_in ri
  JOIN incident_tx itx ON itx.tx_id = ri.tx_in_id
  GROUP BY ri.tx_in_id
),
collateral_input_counts AS (
  SELECT ci.tx_in_id AS tx_id, count(*) AS collateral_input_count
  FROM public.collateral_tx_in ci
  JOIN incident_tx itx ON itx.tx_id = ci.tx_in_id
  GROUP BY ci.tx_in_id
)
SELECT
  itx.cluster,
  itx.tx_hash,
  itx.tx_id IS NOT NULL AS found_on_chain,
  itx.block_no,
  itx.slot_no,
  itx.chain_time_utc,
  itx.evidence_time_utc,
  itx.tx_id,
  itx.chain_fee_ada,
  itx.evidence_fee_ada,
  itx.chain_out_ada,
  itx.source_input_ada,
  itx.to_cluster_ada,
  itx.source_count,
  itx.evidence_input_count,
  itx.evidence_output_count,
  COALESCE(input_counts.input_count, 0) AS chain_input_count,
  COALESCE(output_counts.output_count, 0) AS chain_output_count,
  COALESCE(redeemer_counts.redeemer_count, 0) AS redeemer_count,
  COALESCE(script_counts.script_count, 0) AS script_count,
  COALESCE(metadata_counts.metadata_count, 0) AS metadata_count,
  COALESCE(reference_input_counts.reference_input_count, 0) AS reference_input_count,
  COALESCE(collateral_input_counts.collateral_input_count, 0) AS collateral_input_count
FROM incident_tx itx
LEFT JOIN input_counts ON input_counts.tx_id = itx.tx_id
LEFT JOIN output_counts ON output_counts.tx_id = itx.tx_id
LEFT JOIN redeemer_counts ON redeemer_counts.tx_id = itx.tx_id
LEFT JOIN script_counts ON script_counts.tx_id = itx.tx_id
LEFT JOIN metadata_counts ON metadata_counts.tx_id = itx.tx_id
LEFT JOIN reference_input_counts ON reference_input_counts.tx_id = itx.tx_id
LEFT JOIN collateral_input_counts ON collateral_input_counts.tx_id = itx.tx_id;

CREATE OR REPLACE VIEW secondfi.audit_mechanism_summary AS
SELECT
  cluster,
  count(*) AS evidence_tx_count,
  count(*) FILTER (WHERE found_on_chain) AS chain_found_count,
  min(chain_time_utc) AS first_chain_time_utc,
  max(chain_time_utc) AS last_chain_time_utc,
  sum(to_cluster_ada) AS evidence_to_cluster_ada,
  sum(chain_fee_ada) AS chain_fee_ada,
  sum(redeemer_count) AS redeemer_count,
  sum(script_count) AS script_count,
  sum(metadata_count) AS metadata_count,
  sum(reference_input_count) AS reference_input_count,
  sum(collateral_input_count) AS collateral_input_count
FROM secondfi.audit_cluster_tx_chain
GROUP BY cluster;

CREATE OR REPLACE VIEW secondfi.audit_known_flow_tx_chain AS
WITH flow_tx AS (
  SELECT
    kft.flow_id,
    kft.from_label,
    kft.from_address,
    kft.tx_hash,
    block.block_no,
    block.slot_no,
    block.time AS chain_time_utc,
    kft.time_utc AS evidence_time_utc,
    tx.id AS tx_id,
    tx.fee / 1000000.0 AS chain_fee_ada,
    kft.fee_ada AS evidence_fee_ada
  FROM secondfi.audit_known_flow_txs kft
  LEFT JOIN public.tx tx ON tx.hash = decode(kft.tx_hash, 'hex')
  LEFT JOIN public.block block ON block.id = tx.block_id
),
redeemer_counts AS (
  SELECT r.tx_id, count(*) AS redeemer_count
  FROM public.redeemer r
  JOIN flow_tx ftx ON ftx.tx_id = r.tx_id
  GROUP BY r.tx_id
),
script_counts AS (
  SELECT s.tx_id, count(*) AS script_count
  FROM public.script s
  JOIN flow_tx ftx ON ftx.tx_id = s.tx_id
  GROUP BY s.tx_id
),
metadata_counts AS (
  SELECT m.tx_id, count(*) AS metadata_count
  FROM public.tx_metadata m
  JOIN flow_tx ftx ON ftx.tx_id = m.tx_id
  GROUP BY m.tx_id
)
SELECT
  ftx.flow_id,
  ftx.from_label,
  ftx.from_address,
  ftx.tx_hash,
  ftx.tx_id IS NOT NULL AS found_on_chain,
  ftx.block_no,
  ftx.slot_no,
  ftx.chain_time_utc,
  ftx.evidence_time_utc,
  ftx.tx_id,
  ftx.chain_fee_ada,
  ftx.evidence_fee_ada,
  COALESCE(redeemer_counts.redeemer_count, 0) AS redeemer_count,
  COALESCE(script_counts.script_count, 0) AS script_count,
  COALESCE(metadata_counts.metadata_count, 0) AS metadata_count
FROM flow_tx ftx
LEFT JOIN redeemer_counts ON redeemer_counts.tx_id = ftx.tx_id
LEFT JOIN script_counts ON script_counts.tx_id = ftx.tx_id
LEFT JOIN metadata_counts ON metadata_counts.tx_id = ftx.tx_id;

CREATE OR REPLACE VIEW secondfi.audit_current_known_address_utxos AS
WITH known_addresses AS (
  SELECT cluster, label, address, role
  FROM secondfi.audit_cluster_addresses
  WHERE address IS NOT NULL
  UNION
  SELECT 'known_flow_output' AS cluster, coalesce(stake, address) AS label, address, 'flow_output' AS role
  FROM secondfi.audit_known_flow_outputs
)
SELECT
  ka.cluster,
  ka.label,
  ka.role,
  ka.address,
  count(txo.*) FILTER (WHERE txi.tx_in_id IS NULL) AS live_utxo_count,
  coalesce(sum(txo.value) FILTER (WHERE txi.tx_in_id IS NULL), 0) / 1000000.0 AS live_ada
FROM known_addresses ka
LEFT JOIN public.tx_out txo ON txo.address = ka.address
LEFT JOIN public.tx_in txi
  ON txi.tx_out_id = txo.tx_id
 AND txi.tx_out_index = txo.index
GROUP BY ka.cluster, ka.label, ka.role, ka.address;

CREATE OR REPLACE VIEW secondfi.audit_current_known_stake_utxos AS
WITH known_stakes AS (
  SELECT cluster, label, stake, role
  FROM secondfi.audit_cluster_addresses
  WHERE stake IS NOT NULL
  UNION
  SELECT 'known_flow_output' AS cluster, coalesce(stake, address) AS label, stake, 'flow_output' AS role
  FROM secondfi.audit_known_flow_outputs
  WHERE stake IS NOT NULL
  UNION
  SELECT cluster, source_id AS label, source_id AS stake, 'impacted_source' AS role
  FROM secondfi.audit_cluster_source_ids
  WHERE id_type = 'stake'
)
SELECT
  ks.cluster,
  ks.label,
  ks.role,
  ks.stake,
  count(txo.*) FILTER (WHERE txi.tx_in_id IS NULL) AS live_utxo_count,
  coalesce(sum(txo.value) FILTER (WHERE txi.tx_in_id IS NULL), 0) / 1000000.0 AS live_ada
FROM known_stakes ks
LEFT JOIN public.stake_address sa ON sa.view = ks.stake
LEFT JOIN public.tx_out txo ON txo.stake_address_id = sa.id
LEFT JOIN public.tx_in txi
  ON txi.tx_out_id = txo.tx_id
 AND txi.tx_out_index = txo.index
GROUP BY ks.cluster, ks.label, ks.role, ks.stake;

CREATE OR REPLACE VIEW secondfi.audit_funding_origin_candidates AS
WITH collectors AS (
  SELECT cluster, label, address, role
  FROM secondfi.audit_cluster_addresses
  WHERE role IN ('central_collector', 'fee_sponsor')
),
first_inbound AS (
  SELECT DISTINCT ON (collectors.cluster, collectors.label)
    collectors.cluster,
    collectors.label,
    collectors.role,
    collectors.address,
    encode(src_tx.hash, 'hex') AS source_tx_hash,
    src_out.index AS source_output_index,
    src_out.address AS source_address,
    src_sa.view AS source_stake,
    src_out.value / 1000000.0 AS source_output_ada,
    spend_block.time AS spent_time_utc,
    spend_tx.id AS spending_tx_id,
    encode(spend_tx.hash, 'hex') AS spending_tx_hash
  FROM collectors
  JOIN public.tx_out dest_out ON dest_out.address = collectors.address
  JOIN public.tx dest_tx ON dest_tx.id = dest_out.tx_id
  JOIN public.block dest_block ON dest_block.id = dest_tx.block_id
  JOIN public.tx_in spend_input ON spend_input.tx_in_id = dest_tx.id
  JOIN public.tx_out src_out
    ON src_out.tx_id = spend_input.tx_out_id
   AND src_out.index = spend_input.tx_out_index
  JOIN public.tx src_tx ON src_tx.id = src_out.tx_id
  JOIN public.tx spend_tx ON spend_tx.id = spend_input.tx_in_id
  JOIN public.block spend_block ON spend_block.id = spend_tx.block_id
  LEFT JOIN public.stake_address src_sa ON src_sa.id = src_out.stake_address_id
  ORDER BY collectors.cluster, collectors.label, dest_block.time ASC, dest_out.index ASC
)
SELECT * FROM first_inbound;

CREATE OR REPLACE VIEW secondfi.audit_cluster_overlap AS
SELECT
  a.source_id,
  array_agg(DISTINCT a.cluster ORDER BY a.cluster) AS clusters,
  count(DISTINCT a.cluster) AS cluster_count
FROM secondfi.audit_cluster_source_ids a
GROUP BY a.source_id
HAVING count(DISTINCT a.cluster) > 1;

COMMIT;
