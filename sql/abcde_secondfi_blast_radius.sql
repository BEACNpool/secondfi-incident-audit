-- Lane A: SecondFi incident blast-radius census (flow lane).
--
-- Builds a single stake-keyed master table that unifies the published burst
-- source lists, the post-burst inflow tail, and reward-account draining into one
-- "who lost value into the incident" set, enriched with current on-chain
-- holdings. This is the FLOW blast radius (Ring 0/1). It is NOT the exposure
-- census (Ring 2) -- that requires transaction witnesses/signatures, which this
-- db-sync warehouse does not store; see BLAST_RADIUS_METHODOLOGY.md.
--
-- Run after: abcde_secondfi_load.sql, abcde_secondfi_analysis.sql,
-- abcde_secondfi_followup.sql (uses secondfi.audit_followup_wallets).
--
-- Read-only against replicated public.*; all objects live in schema secondfi.
-- Live state uses tx_in anti-joins, never tx_out.consumed_by_tx_id. UTC.
--
-- Bounds (containment): exposure window start pinned to 2026-06-08 (first
-- predictable-nonce signature per EXTERNAL_ANALYSIS_TIBANE.md); no recursive
-- multi-hop tracing (single hop into the anchor sinks); operator/anchor stakes
-- are excluded from the victim set; label-and-stop at the anchor sinks (we do
-- not trace through the laundering venue -- funds commingle there).

\set ON_ERROR_STOP on
\set window_start '2026-06-08 00:00:00'

BEGIN;

-- Anchor sinks victims fed value into. Fee sponsor and dust tagger are operator/
-- third-party wallets, not victim sinks, so they seed the exclusion set but are
-- not sinks themselves.
DROP TABLE IF EXISTS secondfi.audit_blast_anchor_sinks;
CREATE TABLE secondfi.audit_blast_anchor_sinks (
  sink_label text PRIMARY KEY,
  address text NOT NULL,
  wave text NOT NULL      -- 'old_theft' | 'contested'
);
INSERT INTO secondfi.audit_blast_anchor_sinks (sink_label, address, wave)
SELECT label, address,
  CASE WHEN label LIKE 'old_%' THEN 'old_theft' ELSE 'contested' END
FROM secondfi.audit_followup_wallets
WHERE label IN ('william_qa_central','june25_destination',
                'old_collector_cybermuna','old_collector_adanerone','old_collector_555888');

-- Operator/anchor stakes to exclude from the victim census.
DROP TABLE IF EXISTS secondfi.audit_blast_operator_stakes;
CREATE TABLE secondfi.audit_blast_operator_stakes (stake text PRIMARY KEY);
INSERT INTO secondfi.audit_blast_operator_stakes (stake)
SELECT DISTINCT stake FROM secondfi.audit_followup_wallets WHERE stake IS NOT NULL;

-- All transactions that paid value into an anchor sink within the window.
DROP TABLE IF EXISTS secondfi.audit_blast_sink_txs;
CREATE TABLE secondfi.audit_blast_sink_txs (
  tx_id bigint PRIMARY KEY,
  tx_time_utc timestamp,
  waves text[]
);
INSERT INTO secondfi.audit_blast_sink_txs
SELECT txo.tx_id, min(b.time),
       array_agg(DISTINCT s.wave ORDER BY s.wave)
FROM public.tx_out txo
JOIN secondfi.audit_blast_anchor_sinks s ON s.address = txo.address
JOIN public.tx t ON t.id = txo.tx_id
JOIN public.block b ON b.id = t.block_id
WHERE b.time >= :'window_start'
GROUP BY txo.tx_id;

CREATE INDEX ON secondfi.audit_blast_sink_txs (tx_id);

-- Master victim/source census, one row per non-operator stake that contributed
-- value into an incident sink, by UTxO input and/or reward withdrawal, unioned
-- with any stake already in the published burst source lists.
-- Value actually RECEIVED by the sink in each sink tx (not the gross tx inputs).
DROP TABLE IF EXISTS secondfi.audit_blast_sink_received;
CREATE TABLE secondfi.audit_blast_sink_received AS
SELECT st.tx_id, sum(txo.value) AS sink_received
FROM secondfi.audit_blast_sink_txs st
JOIN public.tx_out txo ON txo.tx_id = st.tx_id
JOIN secondfi.audit_blast_anchor_sinks s ON s.address = txo.address
GROUP BY st.tx_id;
ALTER TABLE secondfi.audit_blast_sink_received ADD PRIMARY KEY (tx_id);

-- Total input value of each sink tx (denominator for apportionment).
DROP TABLE IF EXISTS secondfi.audit_blast_tx_input_total;
CREATE TABLE secondfi.audit_blast_tx_input_total AS
SELECT st.tx_id, sum(src.value) AS total_input
FROM secondfi.audit_blast_sink_txs st
JOIN public.tx_in txi ON txi.tx_in_id = st.tx_id
JOIN public.tx_out src ON src.tx_id = txi.tx_out_id AND src.index = txi.tx_out_index
GROUP BY st.tx_id;
ALTER TABLE secondfi.audit_blast_tx_input_total ADD PRIMARY KEY (tx_id);

DROP TABLE IF EXISTS secondfi.audit_blast_radius_stakes CASCADE;
CREATE TABLE secondfi.audit_blast_radius_stakes AS
WITH src_input AS (
  -- non-operator source stake's input value per sink tx
  SELECT st.tx_id, st.waves, src_sa.view AS stake, sum(src.value) AS src_input,
         min(b.time) AS tx_time
  FROM secondfi.audit_blast_sink_txs st
  JOIN public.tx_in txi ON txi.tx_in_id = st.tx_id
  JOIN public.tx_out src ON src.tx_id = txi.tx_out_id AND src.index = txi.tx_out_index
  JOIN public.stake_address src_sa ON src_sa.id = src.stake_address_id
  JOIN public.tx t ON t.id = st.tx_id
  JOIN public.block b ON b.id = t.block_id
  WHERE src_sa.view NOT IN (SELECT stake FROM secondfi.audit_blast_operator_stakes)
  GROUP BY st.tx_id, st.waves, src_sa.view
),
input_contrib AS (
  -- attribute each sink's received value to funders by their input share, so
  -- totals are bounded by what the sink actually received (not gross tx inputs).
  SELECT
    si.stake,
    sum(sr.sink_received * (si.src_input / nullif(ti.total_input,0)))/1000000.0 AS input_into_incident_ada,
    count(*) AS input_utxos,
    bool_or(si.waves @> ARRAY['old_theft']) AS fed_old_theft,
    bool_or(si.waves @> ARRAY['contested']) AS fed_contested,
    min(si.tx_time) AS first_input_utc,
    max(si.tx_time) AS last_input_utc
  FROM src_input si
  JOIN secondfi.audit_blast_sink_received sr ON sr.tx_id = si.tx_id
  JOIN secondfi.audit_blast_tx_input_total ti ON ti.tx_id = si.tx_id
  GROUP BY si.stake
),
withdrawal_contrib AS (
  SELECT
    sa.view AS stake,
    sum(wd.amount)/1000000.0 AS withdrawal_into_incident_ada,
    count(*) AS withdrawal_count
  FROM secondfi.audit_blast_sink_txs st
  JOIN public.withdrawal wd ON wd.tx_id = st.tx_id
  JOIN public.stake_address sa ON sa.id = wd.addr_id
  WHERE sa.view NOT IN (SELECT stake FROM secondfi.audit_blast_operator_stakes)
  GROUP BY sa.view
),
listed AS (
  SELECT source_id AS stake,
         array_agg(DISTINCT cluster ORDER BY cluster) AS source_list_clusters
  FROM secondfi.audit_cluster_source_ids
  WHERE id_type = 'stake'
  GROUP BY source_id
),
all_stakes AS (
  SELECT stake FROM input_contrib
  UNION SELECT stake FROM withdrawal_contrib
  UNION SELECT stake FROM listed
),
live AS (
  SELECT sa.view AS stake,
    count(*) FILTER (WHERE txi.tx_in_id IS NULL) AS live_utxos,
    coalesce(sum(txo.value) FILTER (WHERE txi.tx_in_id IS NULL),0)/1000000.0 AS live_ada,
    max(b.time) AS last_seen_utc
  FROM all_stakes a
  JOIN public.stake_address sa ON sa.view = a.stake
  JOIN public.tx_out txo ON txo.stake_address_id = sa.id
  JOIN public.tx t ON t.id = txo.tx_id
  JOIN public.block b ON b.id = t.block_id
  LEFT JOIN public.tx_in txi ON txi.tx_out_id = txo.tx_id AND txi.tx_out_index = txo.index
  GROUP BY sa.view
),
assets AS (
  SELECT sa.view AS stake, count(DISTINCT ma.ident) AS live_distinct_assets
  FROM all_stakes a
  JOIN public.stake_address sa ON sa.view = a.stake
  JOIN public.tx_out txo ON txo.stake_address_id = sa.id
  JOIN public.ma_tx_out ma ON ma.tx_out_id = txo.id
  LEFT JOIN public.tx_in txi ON txi.tx_out_id = txo.tx_id AND txi.tx_out_index = txo.index
  WHERE txi.tx_in_id IS NULL
  GROUP BY sa.view
)
SELECT
  a.stake,
  (l.stake IS NOT NULL) AS in_published_source_lists,
  l.source_list_clusters,
  coalesce(ic.fed_old_theft,false) AS fed_old_theft,
  coalesce(ic.fed_contested,false) AS fed_contested,
  coalesce(ic.input_into_incident_ada,0) AS input_into_incident_ada,
  coalesce(ic.input_utxos,0) AS input_utxos,
  coalesce(wc.withdrawal_into_incident_ada,0) AS withdrawal_into_incident_ada,
  coalesce(wc.withdrawal_count,0) AS withdrawal_count,
  coalesce(ic.input_into_incident_ada,0) + coalesce(wc.withdrawal_into_incident_ada,0) AS total_into_incident_ada,
  coalesce(lv.live_ada,0) AS live_ada_now,
  coalesce(lv.live_utxos,0) AS live_utxos_now,
  coalesce(ast.live_distinct_assets,0) AS live_distinct_assets_now,
  ic.first_input_utc,
  greatest(ic.last_input_utc, lv.last_seen_utc) AS last_seen_utc,
  -- Ring classification (flow lane): 0 = fed the confirmed-theft wave,
  -- 1 = fed only the contested sweep, list_only = in burst lists but no in-window
  -- flow captured here (e.g. address-typed or pre-window), mixed = both waves.
  CASE
    WHEN coalesce(ic.fed_old_theft,false) AND coalesce(ic.fed_contested,false) THEN 'mixed'
    WHEN coalesce(ic.fed_old_theft,false) THEN 'ring0_theft'
    WHEN coalesce(ic.fed_contested,false) THEN 'ring1_contested'
    WHEN coalesce(wc.withdrawal_into_incident_ada,0) > 0 THEN 'ring1_contested'
    WHEN l.stake IS NOT NULL THEN 'list_only'
    ELSE 'uncategorized'
  END AS ring_flow
FROM all_stakes a
LEFT JOIN input_contrib ic ON ic.stake = a.stake
LEFT JOIN withdrawal_contrib wc ON wc.stake = a.stake
LEFT JOIN listed l ON l.stake = a.stake
LEFT JOIN live lv ON lv.stake = a.stake
LEFT JOIN assets ast ON ast.stake = a.stake;

ALTER TABLE secondfi.audit_blast_radius_stakes ADD PRIMARY KEY (stake);
CREATE INDEX ON secondfi.audit_blast_radius_stakes (ring_flow);

-- Rollup summary for public aggregate reporting.
CREATE OR REPLACE VIEW secondfi.audit_blast_radius_summary AS
SELECT
  ring_flow,
  count(*) AS stakes,
  count(*) FILTER (WHERE in_published_source_lists) AS in_published_lists,
  count(*) FILTER (WHERE NOT in_published_source_lists) AS not_in_published_lists,
  round(sum(total_into_incident_ada),6) AS total_into_incident_ada,
  round(sum(withdrawal_into_incident_ada),6) AS reward_withdrawal_ada,
  round(sum(live_ada_now),6) AS live_ada_now,
  sum(live_distinct_assets_now) AS live_distinct_assets_now
FROM secondfi.audit_blast_radius_stakes
GROUP BY ring_flow
ORDER BY ring_flow;

-- Coverage delta: how much the census expands the published burst lists.
CREATE OR REPLACE VIEW secondfi.audit_blast_radius_coverage AS
SELECT
  (SELECT count(*) FROM secondfi.audit_cluster_source_ids WHERE id_type='stake') AS published_stake_source_ids,
  (SELECT count(*) FROM secondfi.audit_blast_radius_stakes) AS blast_radius_stakes,
  (SELECT count(*) FROM secondfi.audit_blast_radius_stakes WHERE NOT in_published_source_lists) AS newly_captured_stakes,
  (SELECT round(sum(total_into_incident_ada),6) FROM secondfi.audit_blast_radius_stakes) AS total_into_incident_ada;

-- Downstream disposition of anchor-sink funds, from the existing known-flow
-- evidence (label-and-stop; no venue pass-through tracing).
CREATE OR REPLACE VIEW secondfi.audit_blast_downstream AS
SELECT
  kfo.address AS downstream_address,
  count(DISTINCT kft.flow_id) AS flow_txs,
  round(sum(kfo.ada),6) AS ada
FROM secondfi.audit_known_flow_txs kft
JOIN secondfi.audit_known_flow_outputs kfo ON kfo.flow_id = kft.flow_id
GROUP BY kfo.address
ORDER BY ada DESC NULLS LAST;

COMMIT;
