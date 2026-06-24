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
- It has **not** been laundered, swapped, bridged, or sent to any exchange.
- It has been **unmoved since 2026-06-23 12:20:32 UTC** (re-verified ~24h+ later).
- This **held-and-unlaundered** behaviour is *consistent with a hold/custody posture* and is *not*
  the behaviour of a typical liquidating thief — but it does not, by itself, prove a rescue.

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
