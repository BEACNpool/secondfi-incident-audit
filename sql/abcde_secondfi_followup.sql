-- Follow-up ABCDE analysis views for the SecondFi incident (second pass).
--
-- Run after sql/abcde_secondfi_load.sql and sql/abcde_secondfi_analysis.sql.
-- These views back the findings in ABCDE_WAREHOUSE_FINDINGS.md (Findings 6-11)
-- and the CSV exports in evidence/abcde/.
--
-- Read-only against replicated public.* tables; all objects live in the
-- secondfi schema. All timestamps are UTC (db-sync block.time).
--
-- Warehouse gotcha: never use public.tx_out.consumed_by_tx_id for live-UTxO
-- state on a logical subscriber; every "live" check below uses a tx_in
-- anti-join instead.

\set ON_ERROR_STOP on

BEGIN;

-- Anchor list of principal wallets traced by the follow-up pass.
-- The June 25 destination stake/address were discovered by live tracing
-- (see secondfi.audit_followup_june25_outputs); the rest come from the
-- checked-in evidence.
DROP TABLE IF EXISTS secondfi.audit_followup_wallets;
CREATE TABLE secondfi.audit_followup_wallets (
  label text PRIMARY KEY,
  role text NOT NULL,
  address text,
  stake text
);
INSERT INTO secondfi.audit_followup_wallets (label, role, address, stake) VALUES
  ('original_129m_holding', 'contested_cluster_holding',
   'addr1qxd39k4peszxlf0x59e88hngpe5u9882y2lyhdzazsq4kfvmztd2rnqyd7j7dgtjw00xsrnfc2ww5g47fw6969qptvjshwxpl3',
   'stake1uxd39k4peszxlf0x59e88hngpe5u9882y2lyhdzazsq4kfg7pxzgy'),
  ('june25_destination', 'contested_cluster_destination',
   'addr1qyjfzgs74e90e7yk5yw7gey0ct35su6qmjsufpjc9w9t0ljf6fs0lrl9v94vqc0aw07wpt7l8l4q354l2az77ca82v2svfvlhl',
   'stake1u9yayc8l3ljkz6kqv87h8l8q4l0nl6sg62l4w300vwn4x9geuqdst'),
  ('william_qa_central', 'central_collector',
   'addr1q8g8cgwqw98q2mrzrwgcy3wectdxwem8a8zp9r2mn6wjy7q4x7gcpv39wwurj7n72akw4kd0dgmv72gz4j92fvhn29ss7vuz99',
   'stake1uy2n0yvqkgjh8wpe0fl9wm82mxhk5dk09yp2ez4ykte4zcgg2e9m5'),
  ('old_collector_cybermuna', 'old_wave_recipient',
   'addr1q9j7f598x988unr4zhjulft205jqnn9ewgwkhes5smf2sr6jsw98nm4qq38jw9epe587twavuhuhj5d8r92rjvmyjlzs9lqc3x',
   'stake1u9fg8znea6sqgne8zusu6rl9hwkwt7te2xn3j4pexdjf03g4kw9uq'),
  ('old_collector_adanerone', 'old_wave_recipient',
   'addr1q82jlp2u0ezv2hsf6f40fkrv49hd72yv442nmrr5qeultpqamepaykp3m564hnd4zp75wxxds2j6d3ywvc8prhf2kcxqn6nql3',
   'stake1uywaus7jtqca6d2mek63ql28rrxc9fdxcj8xvrs3m54tvrq4uaarv'),
  ('old_collector_555888', 'old_wave_recipient',
   'addr1q9wudkfeelzwev427yvapkmqexmet8q4vl303m7a4eerwtvt6rq00zyuqzeuw759vgqtdky0gyxnqx27n8q4k6h79yhsqelma8',
   'stake1ux9aps8h3zwqpv7802zkyq9kmz85zrfsr90fns2mdtlzjtcm7jj8p'),
  ('old_fee_sponsor', 'fee_sponsor',
   'addr1q8acx4h5a38x6ekpsp0x7aelw6mflt78khmz8lz75rtnqvn07w88zx2e89tgzqr3x0mecngqlg87kq9surhk48hj79mqcezfa8',
   'stake1u9hl8rn3r9vnj45pqpcn8auuf5q05rltqzcwpmm2nme0zasf40ymg'),
  ('dust_tagger', 'unattributed_third_party',
   NULL,
   'stake1u83s2rupm0cq9p2kdkauewugql9zuf3mvc32v07n35zwf0qxfwhlh');

-- Finding 6: stake registration / delegation state of the key stakes.
CREATE OR REPLACE VIEW secondfi.audit_followup_stake_status AS
SELECT
  w.label,
  w.stake,
  sa.id IS NOT NULL AS stake_seen_on_chain,
  (SELECT max(b.time) FROM public.stake_registration sr
     JOIN public.tx t ON t.id = sr.tx_id JOIN public.block b ON b.id = t.block_id
    WHERE sr.addr_id = sa.id) AS last_registration_utc,
  (SELECT max(b.time) FROM public.stake_deregistration sd
     JOIN public.tx t ON t.id = sd.tx_id JOIN public.block b ON b.id = t.block_id
    WHERE sd.addr_id = sa.id) AS last_deregistration_utc,
  (SELECT ph.view FROM public.delegation d
     JOIN public.pool_hash ph ON ph.id = d.pool_hash_id
    WHERE d.addr_id = sa.id ORDER BY d.tx_id DESC LIMIT 1) AS latest_delegated_pool
FROM secondfi.audit_followup_wallets w
LEFT JOIN public.stake_address sa ON sa.view = w.stake
WHERE w.stake IS NOT NULL;

-- Finding 7a: every output ever created at the June 25 destination stake,
-- with live/spent state by tx_in anti-join.
CREATE OR REPLACE VIEW secondfi.audit_followup_june25_outputs AS
SELECT
  b.time AS created_utc,
  encode(t.hash,'hex') AS tx_hash,
  txo.index AS out_ix,
  txo.address,
  encode(txo.payment_cred,'hex') AS payment_cred_hex,
  txo.value/1000000.0 AS ada,
  (txi.tx_in_id IS NULL) AS live,
  encode(st.hash,'hex') AS spent_by_tx
FROM public.tx_out txo
JOIN public.stake_address sa ON sa.id = txo.stake_address_id
JOIN secondfi.audit_followup_wallets w ON w.label = 'june25_destination' AND sa.view = w.stake
JOIN public.tx t ON t.id = txo.tx_id
JOIN public.block b ON b.id = t.block_id
LEFT JOIN public.tx_in txi ON txi.tx_out_id = txo.tx_id AND txi.tx_out_index = txo.index
LEFT JOIN public.tx st ON st.id = txi.tx_in_id
ORDER BY b.time, txo.index;

-- Finding 7b: input provenance (by source stake) of every tx that paid the
-- June 25 destination stake.
CREATE OR REPLACE VIEW secondfi.audit_followup_june25_inputs AS
WITH dest_txs AS (
  SELECT DISTINCT txo.tx_id
  FROM public.tx_out txo
  JOIN public.stake_address sa ON sa.id = txo.stake_address_id
  JOIN secondfi.audit_followup_wallets w ON w.label = 'june25_destination' AND sa.view = w.stake
)
SELECT
  encode(t.hash,'hex') AS tx_hash,
  b.time AS tx_time_utc,
  src_sa.view AS input_source_stake,
  count(*) AS input_count,
  sum(src.value)/1000000.0 AS input_ada
FROM dest_txs dt
JOIN public.tx t ON t.id = dt.tx_id
JOIN public.block b ON b.id = t.block_id
JOIN public.tx_in txi ON txi.tx_in_id = dt.tx_id
JOIN public.tx_out src ON src.tx_id = txi.tx_out_id AND src.index = txi.tx_out_index
LEFT JOIN public.stake_address src_sa ON src_sa.id = src.stake_address_id
GROUP BY 1,2,3
ORDER BY 2, 5 DESC;

-- Findings 8: the June 25 dust-tagging outputs. A third-party payment
-- credential paired itself with four incident-related stake credentials in
-- five minutes. Constructing an address with someone else's stake credential
-- requires no signature from that stake's owner, so these outputs prove
-- nothing about control -- but they do inflate naive stake-level balances.
CREATE OR REPLACE VIEW secondfi.audit_followup_dust_tagging AS
SELECT
  encode(txo.payment_cred,'hex') AS tagger_payment_cred_hex,
  sa.view AS tagged_stake,
  txo.address,
  b.time AS created_utc,
  encode(t.hash,'hex') AS tx_hash,
  txo.index AS out_ix,
  txo.value/1000000.0 AS ada,
  (txi.tx_in_id IS NULL) AS live
FROM public.tx_out txo
JOIN public.tx t ON t.id = txo.tx_id
JOIN public.block b ON b.id = t.block_id
LEFT JOIN public.stake_address sa ON sa.id = txo.stake_address_id
LEFT JOIN public.tx_in txi ON txi.tx_out_id = txo.tx_id AND txi.tx_out_index = txo.index
WHERE txo.payment_cred = decode('489f0e23948caa063f3bae6c0dcb7fa816d79ef20a8f640b847acb09','hex')
ORDER BY b.time;

-- Finding 9/11: live state and last outgoing spend for every principal wallet,
-- at stake level, by tx_in anti-join.
CREATE OR REPLACE VIEW secondfi.audit_followup_key_wallet_live AS
SELECT
  w.label,
  w.role,
  w.stake,
  count(*) FILTER (WHERE txi.tx_in_id IS NULL) AS live_utxos,
  coalesce(sum(txo.value) FILTER (WHERE txi.tx_in_id IS NULL),0)/1000000.0 AS live_ada,
  max(b.time) AS last_inbound_utc,
  max(sb.time) AS last_outgoing_utc
FROM secondfi.audit_followup_wallets w
JOIN public.stake_address sa ON sa.view = w.stake
JOIN public.tx_out txo ON txo.stake_address_id = sa.id
JOIN public.tx t ON t.id = txo.tx_id
JOIN public.block b ON b.id = t.block_id
LEFT JOIN public.tx_in txi ON txi.tx_out_id = txo.tx_id AND txi.tx_out_index = txo.index
LEFT JOIN public.tx st ON st.id = txi.tx_in_id
LEFT JOIN public.block sb ON sb.id = st.block_id
WHERE w.stake IS NOT NULL
GROUP BY w.label, w.role, w.stake;

-- Finding 9a: william-qa live UTxOs bucketed by creation day.
CREATE OR REPLACE VIEW secondfi.audit_followup_william_live_by_day AS
SELECT
  date_trunc('day', b.time)::date AS created_day,
  count(*) AS live_utxos,
  sum(txo.value)/1000000.0 AS live_ada
FROM public.tx_out txo
JOIN public.stake_address sa ON sa.id = txo.stake_address_id
JOIN secondfi.audit_followup_wallets w ON w.label = 'william_qa_central' AND sa.view = w.stake
JOIN public.tx t ON t.id = txo.tx_id
JOIN public.block b ON b.id = t.block_id
LEFT JOIN public.tx_in txi ON txi.tx_out_id = txo.tx_id AND txi.tx_out_index = txo.index
WHERE txi.tx_in_id IS NULL
GROUP BY 1 ORDER BY 1;

-- Finding 9b/10: per-tx accounting of the post-burst inflow tail to the
-- william-qa stake (cutoff 2026-06-23 12:30:00 UTC, just after the last
-- outgoing spend from that stake at 12:20:32). For each tx: ADA delivered to
-- the william-qa stake, UTxO-input ADA split by whether the source stake is in
-- the published evidence source lists, and reward-account withdrawal ADA with
-- the same split. Withdrawals are why input sums alone do not cover outputs.
CREATE OR REPLACE VIEW secondfi.audit_followup_postburst_inflow_txs AS
WITH wtx AS (
  SELECT txo.tx_id, sum(txo.value)/1000000.0 AS out_to_william_ada, min(b.time) AS tx_time_utc
  FROM public.tx_out txo
  JOIN public.stake_address sa ON sa.id = txo.stake_address_id
  JOIN secondfi.audit_followup_wallets w ON w.label = 'william_qa_central' AND sa.view = w.stake
  JOIN public.tx t ON t.id = txo.tx_id
  JOIN public.block b ON b.id = t.block_id
  WHERE b.time >= '2026-06-23 12:30:00'
  GROUP BY txo.tx_id
),
listed AS (
  SELECT DISTINCT source_id FROM secondfi.audit_cluster_source_ids
),
ins AS (
  SELECT
    w.tx_id,
    coalesce(sum(src.value) FILTER (WHERE l.source_id IS NOT NULL),0)/1000000.0 AS input_listed_ada,
    coalesce(sum(src.value) FILTER (WHERE l.source_id IS NULL AND src_sa.view IS NOT NULL),0)/1000000.0 AS input_unlisted_ada,
    coalesce(sum(src.value) FILTER (WHERE src_sa.view IS NULL),0)/1000000.0 AS input_nostake_ada
  FROM wtx w
  JOIN public.tx_in txi ON txi.tx_in_id = w.tx_id
  JOIN public.tx_out src ON src.tx_id = txi.tx_out_id AND src.index = txi.tx_out_index
  LEFT JOIN public.stake_address src_sa ON src_sa.id = src.stake_address_id
  LEFT JOIN listed l ON l.source_id = src_sa.view
  GROUP BY w.tx_id
),
wds AS (
  SELECT
    w.tx_id,
    coalesce(sum(wd.amount) FILTER (WHERE l.source_id IS NOT NULL),0)/1000000.0 AS withdrawal_listed_ada,
    coalesce(sum(wd.amount) FILTER (WHERE l.source_id IS NULL),0)/1000000.0 AS withdrawal_unlisted_ada
  FROM wtx w
  JOIN public.withdrawal wd ON wd.tx_id = w.tx_id
  JOIN public.stake_address sa2 ON sa2.id = wd.addr_id
  LEFT JOIN listed l ON l.source_id = sa2.view
  GROUP BY w.tx_id
)
SELECT
  encode(t.hash,'hex') AS tx_hash,
  w.tx_time_utc,
  w.out_to_william_ada,
  coalesce(i.input_listed_ada,0) AS input_listed_ada,
  coalesce(i.input_unlisted_ada,0) AS input_unlisted_ada,
  coalesce(i.input_nostake_ada,0) AS input_nostake_ada,
  coalesce(d.withdrawal_listed_ada,0) AS withdrawal_listed_ada,
  coalesce(d.withdrawal_unlisted_ada,0) AS withdrawal_unlisted_ada
FROM wtx w
JOIN public.tx t ON t.id = w.tx_id
LEFT JOIN ins i ON i.tx_id = w.tx_id
LEFT JOIN wds d ON d.tx_id = w.tx_id
ORDER BY w.tx_time_utc;

-- Finding 10: reward-account withdrawals inside the 3,093 main-cluster txs.
CREATE OR REPLACE VIEW secondfi.audit_followup_cluster_withdrawals AS
SELECT
  act.cluster,
  count(DISTINCT wd.tx_id) AS txs_with_withdrawals,
  count(DISTINCT wd.addr_id) AS distinct_reward_accounts,
  coalesce(sum(wd.amount),0)/1000000.0 AS withdrawal_ada
FROM secondfi.audit_cluster_txs act
JOIN public.tx t ON t.hash = decode(act.tx_hash,'hex')
LEFT JOIN public.withdrawal wd ON wd.tx_id = t.id
GROUP BY 1;

COMMIT;
