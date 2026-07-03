# EMURGO Accountability Assessment — SecondFi Incident

**Evidence and accountability assessment of EMURGO's conduct, as a Cardano
founding entity, in the SecondFi (formerly Yoroi) incident.**

> **What this document is.** An evidence-backed assessment of the founding
> entity's conduct, organized as a case. §§1-4 are **findings** — each traces to
> evidence in this repository or to cited public sources, and carries a confidence
> label from `AUDIT_SCOPE.md` (`confirmed` / `high_confidence` / `moderate_confidence`).
> §§5-6 are an explicitly-labeled **accountability argument** — governance opinion
> and a *contended* legal theory, not adjudicated fact, in the same spirit as the
> labeled recommendations in `INCIDENT_ANALYSIS_AND_REMEDIATION.md` §5.
>
> **What this document is not.** It is not a legal determination, a criminal
> attribution, or a court finding. `AUDIT_SCOPE.md` excludes those, and this
> document does not make them: it distinguishes, at every step, what the evidence
> establishes from what is argued. It is a **point-in-time** assessment at ABCDE
> chain tip `13628316` / `2026-07-03 03:35 UTC`; the public two-week refund window
> had **not** elapsed as of writing, and several claims turn on records that
> should still be collected (§8).

---

## 1. The entity and its role

- **FACT** (`confirmed`): EMURGO is one of Cardano's three founding entities and
  the long-time operator of the Yoroi wallet, which was rebranded/succeeded by
  SecondFi. SecondFi's app is published under EMURGO's identifier
  (`com.emurgo`). *(Public record; EMURGO's own product pages and app listing.)*
- **FACT** (`high_confidence`): The signing code at the center of the incident was
  **EMURGO's own proprietary in-house SDK** ("Dullahan"), not a third-party
  dependency. This is established by **EMURGO's own GitHub DMCA takedown filing**
  (2025-08-26, `EVID-0016`), in which EMURGO claims sole ownership of "proprietary
  software project Dullahan" and names a former employee as the unauthorized
  publisher of `github.com/stashers-io/trantor`. The author's counter-notice
  (2025-09-09, `EVID-0017`) disputes only *licensing*, not EMURGO origin.

The significance: EMURGO cannot characterize the defect as an external supply-chain
compromise it fell victim to. By its own sworn legal filing, the broken code was
its own.

## 2. The conduct under review

### 2.1 A regression from an audited, open component to an unaudited, closed one
- **FACT** (`high_confidence`, per `EXTERNAL_ANALYSIS_TIBANE.md`, `EVID-0013/0018`):
  Yoroi signed with the **audited, open-source** Rust `cardano-serialization-lib`
  (via `react-native-haskell-shelley`). SecondFi app build **10.0.3 (2026-06-08)**
  replaced it with the in-house JS signer, **never publicly tagged, never
  open-sourced, never independently audited**. The first predictable-nonce
  signature appears on-chain the **same day**, 2026-06-08.
- The open→closed transition is the **enabling event**: public review had, for
  years, been the control that would have caught a nonce-derivation defect of this
  class. Closing the signer removed it. *(See §5 for the intent question — means
  and opportunity are shown; deliberate insertion is **not** established, §7.)*

### 2.2 The defect is uniquely catastrophic
- **FACT** (`moderate_confidence`, mechanism attributed to Tibane, internally
  consistent with RFC 8032): the signer computed the Ed25519 nonce as
  `r = SHA-512(M)` — message only, secret prefix dropped — which exposes the
  private key from a **single ordinary signature**. This is worse than classical
  nonce reuse; Ed25519 was specifically designed to make this impossible. It also
  fails **silently**: affected signatures verify normally and look ordinary
  on-chain. This repository independently confirmed, on-chain, that all incident
  drains are ordinary key-signed transactions (0 redeemers/scripts/reference
  inputs — `ABCDE_WAREHOUSE_FINDINGS.md` Finding 1), consistent with key
  compromise rather than a contract exploit.

### 2.3 No completed audit — and the honest limit of the "paid to audit" claim
- **FACT** (`high_confidence`): No independent security audit of the signer was
  completed before it shipped to custodial-scale production.
- **CORRECTION / precision (important):** the Project Catalyst **Fund 15** proposal
  that would have funded an audit (~10,000 ADA, ~10% of a larger ask) **was never
  voted on — Fund 15's vote never occurred** (`EXTERNAL_ANALYSIS_TIBANE.md`). So
  the specific claim *"EMURGO accepted payment for this audit and failed to
  deliver it"* is **not supported** by our record — that money was never
  disbursed. Any accountability argument (§5) must rest on a **different**
  obligation basis (founding-entity duty of care and the public commitments in §3),
  not on a paid-and-unperformed audit contract. Stating it the wrong way hands a
  critic an easy rebuttal.

### 2.4 The harm is real and partly confirmed as theft
- **FACT** (`confirmed`, this repository's on-chain evidence): the
  `old_fee_sponsored` wave — **12,193,786.56 ADA** from 179 source stakes — was
  **stolen and laundered** through a DeFi venue to collector wallets that were
  emptied by 2026-06-22 (`ABCDE_WAREHOUSE_FINDINGS.md` Findings 1, 11). Reward
  accounts were drained too (stake-key signatures), and the sweep into the central
  wallet continued for 8+ days beyond the burst window from wallets outside the
  published lists (Findings 9-10). Real users lost real funds through EMURGO's own
  software.

## 3. EMURGO's public commitments (dated)

- **FACT** (`high_confidence`; secondary-source citation record
  `evidence/external/emurgo_public_statements_20260627.md`, `EVID-0024`):
  On/around **2026-06-27**, EMURGO/SecondFi publicly committed to **return funds to
  affected users on a roughly two-week timeline** ("one week to build the recovery
  mechanism and a second to test it before any returns begin"), took a final
  balance snapshot (2026-06-26), and **launched a reimbursement fund**, with claims
  filed through its support site.
- **FACT** (`high_confidence`, same source): EMURGO/SecondFi stated the ~129M ADA
  fourth event was an **emergency intervention by the SecondFi team itself**, which
  "moved about **129 million ADA to an independent third-party custodian** as an
  emergency measure," with "an external accounting firm engaged to verify those
  holdings."
- **FACT** (`high_confidence`, same source): **No custodian and no accounting firm
  has been named** in any reviewed public source.

These are voluntary, specific, public undertakings by the founding entity. They
are the strongest available basis for the accountability argument in §5 —
stronger than the (unsupported) paid-audit framing.

## 4. The discrepancy: public statements vs. the chain

This is the sharpest evidentiary point in this document, because it compares
EMURGO's own words against the ledger.

- **Public statement (2026-06-27):** the ~129M ADA was **"moved to an independent
  third-party custodian."**
- **On-chain (ABCDE tip `13628316`, `2026-07-03`):** the `129,429,998.977070 ADA`
  (six unspent UTxOs) sits at a **single ordinary payment-key address**
  (`address_has_script = false`), reached by one plain key-to-key hop on
  2026-06-25 from the original holding wallet, all inputs drawn solely from that
  holding wallet. The destination **stake has never been registered or delegated**,
  and the funds have **not moved since** (`ABCDE_WAREHOUSE_FINDINGS.md` Findings
  6-7; `evidence/abcde/abcde_followup_june25_outputs.csv`,
  `..._key_wallet_live.csv`).
- **INFERENCE** (`moderate_confidence`): **nothing on-chain corroborates the
  "third-party custodian" characterization.** The destination has no distinguishing
  custodial attribute — no script/multisig vault, no named-entity attribution, no
  onward transfer to a separate custodian. It is, on-chain, another ordinary wallet
  in the same custody chain.
- **UNCERTAINTY (stated honestly):** on-chain data **cannot disprove** the claim —
  a custodian *could* hold funds in a plain key wallet — but it provides **no
  support** for it, and no custodian or accounting firm has been named. The
  verifiable checkpoint (a transfer to a *named, auditable* custodian) has not
  occurred as of tip.

Two further gaps between the public account and the evidence:

- **"Reimbursement fund" ≈ the swept user funds.** The figure EMURGO "secured"
  (~129M) equals the contested cluster itself. **INFERENCE** (`moderate_confidence`):
  the "reimbursement fund" appears to *be* users' own swept funds held pending
  return, not fresh EMURGO capital. Returning users their own seized funds is not
  the same as compensation for the loss.
- **Loss-figure reconciliation is open.** EMURGO's public figure (~16M ADA / 374
  addresses) does not match this repository's confirmed-theft measurement
  (12.19M ADA / 179 stakes). Not asserted as misstatement — counting bases may
  differ — but it is an **unreconciled** discrepancy the founding entity has not
  explained.

**Timeline discipline:** the two-week window (from ~2026-06-27) had **not elapsed**
as of writing (2026-07-02). This document does **not** allege a missed refund
deadline. It documents that, at tip, the one on-chain action that would corroborate
the custodian claim has not appeared. Re-check after the stated window.

## 5. Accountability argument (governance opinion + contended legal theory)

> **Labeled argument, not fact.** The following is advocacy/analysis. It is
> deliberately separated from §§1-4 so the evidentiary findings stand on their own
> regardless of whether one accepts this framing.

1. **Duty of care of a founding entity.** EMURGO is not an anonymous dApp
   deployer. It is a founding entity that received Cardano's genesis ADA allocation
   and has represented Cardano wallet software to end users for years. A party that
   holds itself out as the safe, official wallet lineage — and that swaps a proven
   audited signer for its own unaudited one for custodial-scale key handling —
   assumes a **heightened duty of care**. Shipping 10.0.3 with no produced-signature
   self-test and no differential test against the outgoing signer is a breach of
   that duty on ordinary negligence principles (this is argument, not a court
   finding).

2. **The public commitments as a binding undertaking (contended).** By publicly and
   specifically promising, as the responsible party, to return affected users'
   funds on a stated timeline and to route the 129M to a verified custodian,
   EMURGO made a **unilateral public undertaking** that users have relied on
   (foregoing other remedies, filing claims through its site). Whether that rises
   to an enforceable contract or promissory-estoppel obligation is a
   **jurisdiction-specific legal question for counsel and a court** — this document
   contends there is a good-faith basis to test it, not that it is decided. The
   *factual* predicates (the promise, its specificity, reliance) are established in
   §3; the *legal characterization* is the contested step.

3. **Why the payment-based framing must be stated carefully.** The clean "they took
   money to do X and didn't" argument does **not** fit the audit (§2.3 — never
   funded). The defensible obligation basis is (a) founding-entity duty of care and
   (b) the §3 public undertakings — not a paid-and-unperformed audit contract.
   Leading publicly with the wrong basis would discredit the rest.

4. **The enforcement gap.** Even if every finding above holds, there is today **no
   Cardano mechanism to compel a founding entity to perform.** Reliance rests
   entirely on EMURGO's voluntary follow-through. That is the structural finding.

## 6. Structural finding and recommendation

- **Finding (argument):** the SecondFi incident exposes that Cardano can watch a
  founding entity ship its own unaudited crypto, cause verifiable user losses, and
  make public remediation promises — with **no independent body positioned to
  verify performance or enforce accountability.** Verification currently depends on
  volunteers (this repository, Tibane) and on the entity's own unnamed "external
  accounting firm."
- **Recommendation (opinion):** Cardano should stand up a **treasury-funded,
  independent legal and accountability function** — at minimum able to (a) commission
  binding independent audits of custodial-scale software from founding/major
  entities, (b) verify remediation commitments against on-chain reality, and
  (c) pursue enforcement or treasury-backed user remedies when a founding entity
  causes loss. A named custodian and a **named** auditor, publishing an on-chain
  verifiable custody trail, should be the minimum bar before treasury or community
  goodwill is extended in an incident like this.

## 7. What this document does NOT establish

- **Not deliberate malice / not a planted backdoor.** The defect's shape is
  consistent with a naive reimplementation *and* with deliberate insertion; the
  code alone does not distinguish them. Notably, the bug leaks every signer's key
  **to the entire public**, not to a private channel — which cuts *against* a
  self-interested backdoor and is why independent third-party thieves could exploit
  it (the confirmed 12.19M wave). **Intent of the code change is UNRESOLVED.**
- **Not proven theft of the 129M.** That cluster sits unmoved, unstaked, and
  unlaundered behind a single custody hop — a pattern *more* consistent with a hold
  posture than with liquidation. Its intent is **UNRESOLVED** (`CONTESTED_CLUSTER.md`).
- **Not a legal liability finding.** Whether EMURGO is legally liable is for counsel
  and a court. §5 argues there is a basis to test it; it does not decide it.

## 8. Evidence to collect to harden this into a case

1. **Primary EMURGO/SecondFi statements** — archive the official blog/support-site/
   social posts behind the §3 commitments directly (with web-archive snapshots and
   hashes), upgrading `EVID-0024` from secondary to primary.
2. **The named custodian and accounting firm** — identity, engagement terms, and an
   **on-chain custody address** for the 129M so the §4 custodian claim becomes
   verifiable.
3. **The signer's build/commit history** — who introduced the prefix-drop, in one
   change or an "innocent refactor," and whether a correct version preceded it. This
   is the single artifact that would move §7's code-intent from UNRESOLVED toward a
   finding.
4. **Catalyst/treasury funding record for EMURGO wallet work** — to establish (or
   rule out) any *funded* obligation, correcting §2.3 in either direction.
5. **KYC on the two CEX withdrawals** (shared Binance-tagged omnibus, `SUPPLEMENTAL_
   FINDINGS.md` §1) — resolves whether one operator is behind both theft waves.
6. **Re-check at/after the two-week window** (~2026-07-11) — did a named-custodian
   transfer and user returns actually occur.

## Sources

- This repository: `ABCDE_WAREHOUSE_FINDINGS.md`, `CONTESTED_CLUSTER.md`,
  `SUPPLEMENTAL_FINDINGS.md`, `INCIDENT_ANALYSIS_AND_REMEDIATION.md`,
  `EXTERNAL_ANALYSIS_TIBANE.md`, `evidence/abcde/`, `EVIDENCE_MANIFEST.md`.
- Public statements: `evidence/external/emurgo_public_statements_20260627.md`
  (`EVID-0024`) — The Block, The Crypto Times, Cryptopolitan (2026-06-27).
- EMURGO ownership admission: `EVID-0016` (GitHub DMCA archive, 2025-08-26).
