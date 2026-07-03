# ABCDE Warehouse Findings

This note records live-chain checks run against BEACNpool's ABCDE `db-sync`
warehouse, separate from the static Blockfrost-derived evidence snapshots in
this repository.

Checked against ABCDE chain tip:

- block: `13628213`
- slot: `191481535`
- tip time: `2026-07-03 03:03:46 UTC`
- evidence load schema: `secondfi.audit_*`
- loader/views: `sql/abcde_secondfi_load.sql`, `sql/abcde_secondfi_analysis.sql`

## Loaded Evidence

The checked-in public evidence was loaded into ABCDE as normalized analysis
tables:

| table | rows |
| --- | ---: |
| `secondfi.audit_source_files` | 6 |
| `secondfi.audit_impacted_wallets` | 2,732 |
| `secondfi.audit_cluster_source_ids` | 2,748 |
| `secondfi.audit_cluster_txs` | 3,093 |
| `secondfi.audit_known_flow_txs` | 108 |
| `secondfi.audit_known_flow_outputs` | 397 |
| `secondfi.audit_trail_txs` | 240 |

The loaded evidence preserves source file SHA-256 hashes inside
`secondfi.audit_source_files`.

## Finding 1: Static Cluster Transactions Reproduce On-Chain

FACT: all 3,093 static cluster transactions loaded from the source reports were
found in ABCDE, and every evidence timestamp matched the chain timestamp.

| cluster | evidence txs | found on-chain | first UTC | last UTC | ADA to cluster |
| --- | ---: | ---: | --- | --- | ---: |
| `old_fee_sponsored` | 240 | 240 | `2026-06-21 20:29:41` | `2026-06-22 00:35:49` | `12,193,786.557442` |
| `new_william_direct` | 2,853 | 2,853 | `2026-06-22 17:34:04` | `2026-06-23 10:29:15` | `129,438,872.6872269986182239` |

FACT: across those 3,093 txs, ABCDE found:

- `0` Plutus redeemers
- `0` scripts
- `0` metadata rows
- `0` reference inputs
- `0` collateral inputs

Interpretation: this supports the existing key-wallet/key-compromise framing.
These txs do not look like a Cardano protocol exploit or a smart-contract
exploit.

## Finding 2: Shared Funding-Origin Lead Reproduces

FACT: the old-cluster treasury seed and the new `$william-qa` central seed both
spend from the same no-stake source address:

`addr1vx7j284mqe59w2mka36gf5xq0hvu8ms2989553fk5qh3prcapfpj3`

Old seed transaction:

- tx: `24a1930c6f99a8a7dd08e94ad546d0828ac79ab220e8f8f0f9758427eed7241e`
- time: `2025-07-30 15:53:29 UTC`
- source input from shared address: `99,319.035951 ADA`
- relevant output: `129.2 ADA` to
  `addr1v8wfpcg4qfhmnzprzysj6j9c53u5j56j8rvhyjp08s53s6g07rfjm`

New seed transaction:

- tx: `5f1c9e58b25ebf88798c7c8b7a0bbf3eb3c02140f150d0301b3f503c1ed7a62e`
- time: `2026-06-22 17:34:04 UTC`
- source input from shared address: `207.035879 ADA`
- relevant output: `3.5 ADA` to `$william-qa`
  `addr1q8g8cgwqw98q2mrzrwgcy3wectdxwem8a8zp9r2mn6wjy7q4x7gcpv39wwurj7n72akw4kd0dgmv72gz4j92fvhn29ss7vuz99`

INFERENCE / caveat: the shared source address has no stake credential and
behaves like a high-volume omnibus/exchange source. Shared source use is a
lead, not identity proof.

## Finding 3: The Original 129M Holding Wallet Moved After The Static Snapshot

FACT: the prior static balance snapshot showed
`stake1uxd39k4peszxlf0x59e88hngpe5u9882y2lyhdzazsq4kfg7pxzgy` holding
`129,430,001 ADA`. Live ABCDE tracing shows the large UTxOs at that stake were
spent on `2026-06-25`.

Important warehouse note: on this logical subscriber, `public.tx_out.consumed_by_tx_id`
is not reliable for live-balance checks. Use a `tx_in` anti-join instead.

Correct live balances by `tx_in` anti-join:

| label | stake | live UTxOs | live ADA | newest live UTxO |
| --- | --- | ---: | ---: | --- |
| new June 25 destination | `stake1u9yayc8l3ljkz6kqv87h8l8q4l0nl6sg62l4w300vwn4x9geuqdst` | 7 | `129,430,008.977070` | `2026-06-25 12:21:29` |
| `$william-qa` | `stake1uy2n0yvqkgjh8wpe0fl9wm82mxhk5dk09yp2ez4ykte4zcgg2e9m5` | 3,408 | `1,947,429.441141` | `2026-07-01 01:12:10` |
| original 129M holding stake | `stake1uxd39k4peszxlf0x59e88hngpe5u9882y2lyhdzazsq4kfg7pxzgy` | 2 | `11.001412` | `2026-06-25 12:23:23` |

The large June 25 outputs to the new destination stake are currently unspent in
ABCDE:

| time UTC | tx | output ADA |
| --- | --- | ---: |
| `2026-06-25 07:11:42` | `74ac8bd06199b51ba1a68f4041af2d927c1f72e48ac2ff75125f82a654d516de` | `3.0` |
| `2026-06-25 08:40:36` | `abfb8fa071dded55228f97799bcf21a9f8d1456b81b989aad549915bd9fcfb1d` | `32,357,499.0` |
| `2026-06-25 08:40:36` | `bc5b037ad18985ae3ac3210246c0c71a0177ffcf86a69c33b9952396aa808326` | `32,357,499.0` |
| `2026-06-25 09:29:44` | `7796fe64b00e91cafa4d7f55da8779826c85ed666d0eb9d1589976243d07245a` | `33,000,000.0` |
| `2026-06-25 09:29:44` | `1ba5543a66239d05bb89f30206bc08429590446e5b05a904c3c3994a55c71787` | `27,642,499.661250` |
| `2026-06-25 11:22:30` | `54528b9b10c84dc71cd66dbd3c1978845fd4679dd207aac856a80cf17b3e492d` | `4,072,498.315820` |

Interpretation: the earlier "unmoved since 2026-06-23" language is now stale.
The better chain-only wording is:

> The 129M custody stack moved from the original holding stake to a new June 25
> destination stake. The traced large destination outputs remain unspent at
> ABCDE tip, and no liquidation/exchange dispersal is established by this check.

## Finding 4: Old/New Source-ID Overlap

FACT: 17 source IDs appear in both `old_fee_sponsored` and
`new_william_direct` cluster source lists.

This supports retaining overlap language in `SUPPLEMENTAL_FINDINGS.md`, but it
does not by itself resolve operator identity or intent.

## Finding 5: Remaining `$william-qa` Balance Is Concentrated At The Central Address

FACT: using the same `tx_in` anti-join live-balance method, the
`$william-qa` stake currently holds `1,947,429.441141 ADA` live across 3,408
UTxOs. Almost all of it remains at the central address:

| address | live UTxOs | live ADA | newest live UTxO |
| --- | ---: | ---: | --- |
| `addr1q8g8cgwqw98q2mrzrwgcy3wectdxwem8a8zp9r2mn6wjy7q4x7gcpv39wwurj7n72akw4kd0dgmv72gz4j92fvhn29ss7vuz99` | 3,405 | `1,947,418.399262` | `2026-07-01 01:12:10` |
| `addr1q9yf7r3rjjx25p3l8whxcrwt075pd4u77g9g7eqts3avkzg4x7gcpv39wwurj7n72akw4kd0dgmv72gz4j92fvhn29ss3nyara` | 1 | `5.0` | `2026-06-25 12:25:18` |
| `addr1q9ammulpcmw0wrqnk9xeggw6upjdm09cwz0ztp2w5lzpv7c4x7gcpv39wwurj7n72akw4kd0dgmv72gz4j92fvhn29ss6nuy96` | 1 | `3.711648` | `2026-06-23 12:20:32` |
| `addr1qx79c3u2sk9ufjvtvj0mz4ke76x9zrzfcjznn9vh24lcxcc4x7gcpv39wwurj7n72akw4kd0dgmv72gz4j92fvhn29ssj42fmx` | 1 | `2.330231` | `2026-06-22 17:37:57` |

The largest live UTxOs at the central address include `694,491.577704 ADA`
(`717fef5eaf059aa1d3f0f30cca22ab7e6e4ce14ef7a9dd9148c8ba069d4a3fd3#0`,
created `2026-06-24 19:32:29 UTC`) and `207,000.919572 ADA`
(`1a33c80d53ba98c9c0179b370ccd93890fb9a0e302446b54a63779dceea27f3e#0`,
created `2026-06-24 09:13:59 UTC`).

---

# Follow-Up Pass (Findings 6-11)

Checked against ABCDE chain tip block `13628316`, slot `191483427`,
`2026-07-03 03:35:18 UTC`. Reproducible via `sql/abcde_secondfi_followup.sql`;
machine-readable receipts in `evidence/abcde/` (CSV, one file per view).

## Finding 6: None Of The Principal Stakes Was Ever Registered Or Delegated

FACT: the original 129M holding stake, the June 25 destination stake, the
`$william-qa` stake, the three old-wave collector stakes, and the fee-sponsor
stake have **zero** stake registrations, deregistrations, or delegations on
chain. (`abcde_followup_stake_status.csv`)

Interpretation: the 129.43M ADA sits undelegated and earns no staking rewards.
This is neutral between the theft and rescue readings — but it means "parked,"
not "productively custodied," and it is one more thing a named custodian setup
would normally change.

## Finding 7: June 25 Movement Receipts — Single Destination Address, Inputs Only From The Original Holding Stake

FACT: the six large June 25 transactions that fund the destination stake draw
their inputs **exclusively** from the original 129M holding stake
`stake1uxd39k4peszxlf0x59e88hngpe5u9882y2lyhdzazsq4kfg7pxzgy`, and all six
outputs land at one address:

`addr1qyjfzgs74e90e7yk5yw7gey0ct35su6qmjsufpjc9w9t0ljf6fs0lrl9v94vqc0aw07wpt7l8l4q354l2az77ca82v2svfvlhl`

(`abcde_followup_june25_outputs.csv`, `abcde_followup_june25_inputs.csv`)

PRECISION CORRECTION to Finding 3: the destination-stake live total of
`129,430,008.977070 ADA` includes a `10 ADA` output that is **not** controlled
by the destination wallet's payment key — it is third-party dust (Finding 8).
The destination wallet proper holds `129,429,998.977070 ADA` across six UTxOs
at the single address above. The same applies to the original holding stake's
residual (`11.001412 ADA` = `1.001412` own change + `10 ADA` third-party dust)
and to the `$william-qa` stake (`5 ADA` of its live total is third-party dust).

FACT: all six large destination UTxOs remain unspent at the checked tip, and
the destination stake holds zero native assets (pure ADA).

## Finding 8: A Third Party Dust-Tagged All The Key Stakes On June 25

FACT: a previously undocumented payment credential
`489f0e23948caa063f3bae6c0dcb7fa816d79ef20a8f640b847acb09` (home stake
`stake1u83s2rupm0cq9p2kdkauewugql9zuf3mvc32v07n35zwf0qxfwhlh`, first funded
`2026-06-23 17:57:22 UTC` with `186.8 ADA` from
`stake1u9tx9n7w796zyqjtdj8fsg3cj7r59khdvfr72g69xjf0mnqtmss5r`) created four
small outputs between `12:21:29` and `12:26:09 UTC` on `2026-06-25`, each
pairing **its own payment key** with the stake credential of an
incident-related wallet:

| tagged stake | ADA | tx |
| --- | ---: | --- |
| June 25 destination | 10 | `b58d16bf74975866f8214401a5031f7dbf760b5470b2a31b315d3f5c595f993a` |
| original 129M holding | 10 | `6bcb88b8e449bd911a7c5cf8bf860f5a058bfc16fad0545df9beb787a8db03fe` |
| `$william-qa` | 5 | `2b3ffebd11d8ae39f6c11079a12d254d4ec566a16e89fee048f0b11dabaab8c3` |
| `stake1u8ayctasp0dyt3fpymcm4x9ce8dju3sv9zjryxvl7azhf6gnhyhe3` | 5 | `332b420b4cef31b950b644f1970774bcc07e2b028b8ddabbde7a9b0151e54781` |

(`abcde_followup_dust_tagging.csv`)

METHOD NOTE (important for all stake-level balance claims): constructing an
address that combines your payment key with someone else's stake credential
requires **no signature** from that stake's owner. These outputs therefore
prove nothing about who controls the tagged stakes — but they *do* inflate
naive stake-level balance queries, which is why Finding 7 nets them out.

UNCERTAINTY: the tagger's identity and purpose are unknown (plausible readings:
an investigator marking wallets, or the operator self-marking; the chain does
not distinguish). The fourth tagged stake is an older wallet (first seen
`2022-03-29`) that does not appear in the published source lists; why it was
tagged alongside the three incident wallets is unresolved and is itself a lead.
The tagger's funding wallet `stake1u9tx9n7w…qtmss5r` (~8,251 ADA live, active
`2025-10-30` → `2026-07-02`) is a further lead; neither is in the published
source lists.

## Finding 9: `$william-qa` Kept Receiving After The Burst — A ~1.94M ADA Tail Through 2026-07-01, While Never Spending

FACT: the `$william-qa` stake has **zero outgoing spends since
`2026-06-23 12:20:32 UTC`** (eight outgoing txs ever). After that moment it
continued to receive: `1,134` transactions delivering `1,938,563.10 ADA`
through `2026-07-01 01:12:10 UTC`. (`abcde_followup_postburst_inflow_txs.csv`)

FACT: of the current live balance, only `~8,863 ADA` (2,224 dust UTxOs) dates
from the June 23 burst day; `1,744,858 ADA` arrived `2026-06-24` and
`189,443 ADA` on `2026-06-25`, with small inflows continuing through
`2026-07-01` (including `1,200 ADA` on `2026-07-01`).
(`abcde_followup_william_live_by_day.csv`)

FACT: the tail involves `1,028` distinct counterparty stakes (UTxO senders plus
reward accounts): `568` are in the published evidence source lists, `460` are
**not**. Roughly `754,589 ADA` of tail UTxO inputs came from stakes not in the
published lists.

Interpretation: the published source lists are a snapshot of the June 22-23
burst; the drain/sweep activity into the same central wallet continued for at
least eight more days from hundreds of additional wallets. Public totals framed
as "the sweep" should either state the snapshot window or include this tail.

FACT (assets): the `$william-qa` stake also holds `4,919` distinct native
assets across `1,606` live UTxOs — tokens/NFTs were swept alongside ADA. Any
make-whole accounting that only tracks ADA is incomplete.

## Finding 10: Reward Accounts Were Drained Too — Stake Keys Were Compromised, Not Just Payment Keys

FACT: reward-account withdrawals appear throughout the incident flows:

| where | txs with withdrawals | distinct reward accounts | ADA |
| --- | ---: | ---: | ---: |
| `old_fee_sponsored` cluster (44/240 txs) | 44 | 44 | `125,535.824551` |
| `new_william_direct` cluster (150/2,853 txs) | 150 | 154 | `170,404.532123` |
| post-burst tail to `$william-qa` | 608 | 608+ | `560,223.532470` |

(`abcde_followup_cluster_withdrawals.csv`,
`abcde_followup_postburst_inflow_txs.csv` — the tail split is
`316,267.58 ADA` from listed stakes, `243,955.95 ADA` from unlisted stakes.)

Interpretation: a Cardano reward withdrawal must be signed by the **stake
key**, which is distinct from the payment key. Draining both is consistent
with the published root-cause account (any key that produced a signature
through the broken signer leaked), and it means victim exposure includes
accumulated staking rewards, not just UTxO balances. It also matters for
accounting: withdrawal ADA enters these txs without appearing as a UTxO input,
so input-only tracing undercounts what moved.

## Finding 11: Old-Wave Collectors Are Effectively Empty; The Central Wallet Never Dispersed

FACT, live state at the checked tip (`abcde_followup_key_wallet_live.csv`):

| wallet | live ADA | last outgoing (UTC) |
| --- | ---: | --- |
| `$cybermuna` collector | `14.913145` | `2026-06-22 01:54:39` |
| `$adanerone` collector | `29.913651` | `2026-06-22 00:23:33` |
| `$555888` collector | `401.523935` | `2026-06-22 11:53:42` |
| old fee sponsor | `1,175.245943` | `2026-06-22 00:35:49` |
| `$william-qa` | `1,947,429.441141` | `2026-06-23 12:20:32` |
| June 25 destination | `129,430,008.977070` (incl. 10 dust) | — (never spent) |

Interpretation: the old-wave (confirmed-theft) proceeds fully left the
collector wallets by June 22 — the dispersal claim now has live-state receipts.
The contested-cluster stack, by contrast, shows the opposite pattern: no
outbound movement at all except the single custody hop on June 25.

## Supporting receipt: shared funding-origin address scale

FACT: the shared funding-origin address
`addr1vx7j284mqe59w2mka36gf5xq0hvu8ms2989553fk5qh3prcapfpj3` has `994,387`
outputs on chain, first seen `2024-08-27 06:12:15 UTC`, and was still active at
`2026-07-03 03:27:45 UTC`. This supports the "high-volume omnibus/exchange
source" characterization in Finding 2 (and therefore also the caveat that
shared use of it is a lead, not identity proof).

## Reproduction

- Loader: `sql/abcde_secondfi_load.sql` (evidence JSON → `secondfi.audit_*`).
- Base views: `sql/abcde_secondfi_analysis.sql` (Findings 1-5).
- Follow-up views: `sql/abcde_secondfi_followup.sql` (Findings 6-11).
- CSV receipts + regeneration steps: `evidence/abcde/README.md`.
- Live-chain caveat: re-running at a later tip can legitimately change `live`
  flags and balances; every export records the tip it was taken at.
