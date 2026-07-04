-- Lane B candidate selection: one representative in-window, self-signed,
-- non-drain transaction per blast-radius stake.
--
-- The exposure signature that leaked a victim's key is a transaction the VICTIM
-- signed through the vulnerable app during the window -- NOT the attacker-signed
-- drain. So candidates are transactions that spent a blast-radius stake's own
-- UTxOs, inside the exposure window, excluding the anchor-sink (drain/sweep) txs.
-- One row per stake (latest such tx) maximises distinct-wallet coverage per
-- CBOR fetch. Feed tx_hash to scripts/fetch_tx_cbor.sh then scripts/run_exposure_census.py.
--
-- Read-only. Requires the secondfi.audit_blast_radius_stakes master and
-- secondfi.audit_blast_sink_txs (sql/abcde_secondfi_blast_radius.sql).

\set ON_ERROR_STOP on

WITH cand AS (
  SELECT
    brs.stake,
    brs.in_published_source_lists,
    brs.ring_flow,
    encode(t.hash, 'hex') AS tx_hash,
    b.time AS tx_time_utc,
    row_number() OVER (PARTITION BY brs.stake ORDER BY b.time DESC) AS rn
  FROM secondfi.audit_blast_radius_stakes brs
  JOIN public.stake_address sa ON sa.view = brs.stake
  JOIN public.tx_out txo ON txo.stake_address_id = sa.id
  JOIN public.tx_in txi ON txi.tx_out_id = txo.tx_id AND txi.tx_out_index = txo.index
  JOIN public.tx t ON t.id = txi.tx_in_id
  JOIN public.block b ON b.id = t.block_id
  WHERE b.time >= '2026-06-08' AND b.time < '2026-06-27'      -- exposure window
    AND txi.tx_in_id NOT IN (SELECT tx_id FROM secondfi.audit_blast_sink_txs)
)
SELECT stake, in_published_source_lists, ring_flow, tx_hash
FROM cand
WHERE rn = 1;
