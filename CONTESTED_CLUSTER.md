# Contested Cluster — Intent of the ~129M "new_william_direct" Sweep

> Suggested supplement contributed for independent review (BEACNpool forensics).
> Additive note; does not modify existing evidence files.

The `new_william_direct` cluster in this package documents the on-chain **fact** that ~129.4M ADA
was swept from ~2,570 source wallets into the central wallet
`addr1q8g8cgwqw98q2mrzrwgcy3wectdxwem8a8zp9r2mn6wjy7q4x7gcpv39wwurj7n72akw4kd0dgmv72gz4j92fvhn29ss7vuz99`
and consolidated into the holding wallet
`addr1qxd39k4peszxlf0x59e88hngpe5u9882y2lyhdzazsq4kfvmztd2rnqyd7j7dgtjw00xsrnfc2ww5g47fw6969qptvjshwxpl3`.

**The *intent* of that sweep is contested and not resolvable from chain data alone.** This note
records that explicitly so the package does not imply a conclusion the evidence cannot support.

## The two readings

1. **Malicious drain** — an attacker swept the wallets and is holding the proceeds.
2. **White-hat rescue** — per SecondFi's public statements, SecondFi triggered emergency measures to
   sweep at-risk wallets to secure them, to be routed to an independent third-party custodian and
   returned to affected users.

**On-chain, a malicious sweep and a protective sweep are mechanically identical** (key-signed
consolidation into one wallet). The chain shows *that* funds moved and *where* — not *why*.

## What is verifiable on-chain (FACT, point-in-time)

- ~129.43M ADA is consolidated in the single holding wallet `addr1qxd39k4p…`.
- As originally observed, it had **not** been laundered, swapped, bridged, or sent to any exchange.
- **Superseding live-chain update:** ABCDE warehouse tracing (chain tip block `13628316`,
  `2026-07-03 03:35:18 UTC`) shows the original holding stake moved the large UTxOs on `2026-06-25`
  to a new destination stake `stake1u9yayc8l3ljkz6kqv87h8l8q4l0nl6sg62l4w300vwn4x9geuqdst` — all six
  large txs draw inputs exclusively from the original holding stake, and all six outputs land at the
  single address `addr1qyjfzgs74e90e7yk5yw7gey0ct35su6qmjsufpjc9w9t0ljf6fs0lrl9v94vqc0aw07wpt7l8l4q354l2az77ca82v2svfvlhl`,
  which now holds `129,429,998.977070 ADA` across six unspent UTxOs. (Naive stake-level queries show
  `129,430,008.977070` — the extra `10 ADA` is unrelated third-party dust; see
  `ABCDE_WAREHOUSE_FINDINGS.md` Findings 7-8.) The original holding stake retains only
  `1.001412 ADA` of its own change.
- Neither the original holding stake nor the destination stake (nor `$william-qa`) has ever been
  registered or delegated — the 129.43M sits unstaked, earning nothing.
- `$william-qa` has had **zero outgoing spends since 2026-06-23 12:20:32 UTC**, but kept *receiving*
  a drain/sweep tail (~1.94M ADA more, 1,134 txs, through 2026-07-01, including ~560k ADA of
  reward-account withdrawals). See `ABCDE_WAREHOUSE_FINDINGS.md` Findings 9-10.
- This **moved-but-still-unliquidated** behaviour is *consistent with a hold/custody posture* and is
  *not* the behaviour of a typical liquidating thief — but it does not, by itself, prove a rescue.

## What is stated but not yet on-chain-verifiable (per SecondFi)

- That the funds are "being routed to an independent, qualified third-party custodian."
- As of this note, **no custodian transfer has been observed on-chain, and no custodian or audit
  firm has been publicly named.**

## Resolver

The intent becomes verifiable when the funds move:
- → a **named, audited custodian** (supports the rescue account), **or**
- → **laundering / an exchange / dispersal** (supports the theft account).

Until then, public materials derived from this package should treat the `new_william_direct`
cluster's **intent as UNRESOLVED**, while the **external theft is separately confirmed** (the
`old_fee_sponsored` cluster; SecondFi also acknowledges ~16M ADA stolen across 374 addresses by
external actors).

## Recommended labeling

- Keep "swept / consolidated / held" (factual).
- Avoid unqualified "stolen / drained / attacker" for the `new_william_direct` cluster until the
  custodian-transfer-vs-laundering resolver fires.
