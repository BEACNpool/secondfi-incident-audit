# Supplemental Findings (for independent review)

> Contributed by BEACNpool forensics as suggested additions. Independently reconstructed against a
> separate Cardano `db-sync` mainnet index (i.e. a different data path than this package's Blockfrost
> exports). FACT = on-chain & reproducible; INFERENCE = labelled; UNCERTAINTY = explicit.

## 1. Funding origin — both clusters seeded from the same exchange hot wallet

Both clusters' operational wallets were first funded from the **same wallet**
`addr1vx7j284mqe59w2mka36gf5xq0hvu8ms2989553fk5qh3prcapfpj3` — which has the profile of a **major CEX
hot/omnibus wallet** (~984k received UTxOs, live since 2024-08, both deposits and withdrawals) and is
**community-tagged as Binance** across multiple prior unrelated thefts (e.g. SIREN/Xerberus Oct 2024;
a Chinese-language victim report May 2025).

| cluster | recipient | amount | time (UTC) | tx |
|---|---|---|---|---|
| old_fee_sponsored | treasury `addr1v8wfpcg4…07rfjm` | 129.20 ADA | 2025-07-30 15:53:29 | `24a1930c6f99a8a7dd08e94ad546d0828ac79ab220e8f8f0f9758427eed7241e` |
| new_william_direct | `$william-qa` (first-ever inflow) | 3.50 ADA | 2026-06-22 17:34:04 | `5f1c9e58b25ebf88798c7c8b7a0bbf3eb3c02140f150d0301b3f503c1ed7a62e` |

**INFERENCE / CAVEAT:** the address is a *shared omnibus* (millions of legitimate withdrawals), so
"both used it" is **not** proof of a single operator. But it yields **two specific timestamped
withdrawals** an exchange could resolve to account(s). If both map to one account, the clusters unify
under one individual. A KYC trail exists either way (a KYC account can also be a bought/mule account —
a lead, not a confirmed identity).

## 2. Mechanism — key compromise, NOT a protocol or contract exploit (FACT)

- Drain transactions carry **0 Plutus redeemers, 0 reference inputs**; every drained source address is
  a **normal key-wallet** (no script/contract held the funds).
- → The funds moved via valid, ordinary **key-signed** transactions. This is **not** a Cardano
  protocol/ledger flaw and **not** a smart-contract exploit; no chain reorganisation occurred.
- Victims are predominantly **established, multi-year wallets** that were **actively transacting** up
  to the incident, with **no shared on-chain factor** (pool, dApp, contract, or token) across them ⇒
  the compromise vector is **off-chain** (seed/private-key handling), invisible on-chain.

## 3. Caveat on the new-cluster source count

The `new_william_direct` `source_wallet_count` (~2,570) **overstates the number of independent
victims.** Tracing the tail shows it includes:
- **Related-wallet clusters** — e.g. a hub `addr1q9xq37kqja9pwrvddmf4ss8ckdpqw2y3marghtleh…` →
  intermediary `addr1qy2t7exqv02j6krlxsh23zdzn9w3m…` → ~21 small wallets (≈50 ADA each, batch-funded
  2025-11-22) all consolidated into `$william-qa`.
- **Transit wallets** that merely received fresh funds during the incident window and passed dust
  through, and small **dust wallets** (≈1 ADA).

Source-wallet-count is therefore an **upper bound** on impacted parties, not a victim tally. (This is
also a mild signal toward the "consolidation of related wallets" reading discussed in
`CONTESTED_CLUSTER.md`, though it remains unproven.)

## 4. Independent cross-validation

Reconstructed independently against a separate `db-sync` mainnet index; totals reproduce this
package's figures:
- **old_fee_sponsored:** 178–179 source stake accounts · **12,193,786.56 ADA** to collectors
  $cybermuna / $adanerone / $555888 · window 2026-06-21 20:29 → 06-22 00:35 UTC · downstream routed
  via DeFi script `addr1z8p79rpkcdz8x9d6tft0x0dx5mwuzac2sa4gm8cvkw5hcn…` (a large shared protocol,
  ~1.58B ADA throughput — a laundering venue, not a private sink).
- **new_william_direct:** ~2,570 source stakes · **~129.44M ADA** to `$william-qa` → ~129.43M held in
  the cold vault.

Two independent reconstructions agreeing on these totals is offered as mutual corroboration.
