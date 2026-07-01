# Incident Analysis & Remediation Recommendations

> Suggested analysis contributed for independent review (BEACNpool forensics). Synthesizes this
> repository's own fund-flow evidence (`CONTESTED_CLUSTER.md`, `SUPPLEMENTAL_FINDINGS.md`,
> `evidence/`) with independently cross-referenced external root-cause research
> (`EXTERNAL_ANALYSIS_TIBANE.md`) into one incident summary and a set of remediation
> recommendations. The fund-flow and provenance facts below trace to the manifest entries cited
> throughout; the recommendations in §5 are this contributor's analysis/opinion, not on-chain fact,
> and are labeled as such.

## Executive summary

This was not a smart-contract exploit, a chain bug, or brute-forced wallets — it was a broken
in-house Ed25519 signer that EMURGO shipped to production without an audit, replacing a signer that
was working correctly. Every wallet that signed a transaction between **2026-06-08** and the patch
(~06-25) leaked its private key the instant it signed, because the signing nonce was computed from
public data only. Attackers (and possibly SecondFi's own emergency responders — see §3) exploited
that starting 2026-06-21 in two distinguishable waves totaling **~141.6M ADA** moved: **12.19M ADA
confirmed stolen and laundered**, and **~129.44M ADA swept but sitting unmoved and unlaundered**,
with its intent (theft vs. rescue) still unresolved on-chain as of this writing.

## 1. Root cause — the crypto bug

Correct Ed25519 signing derives the per-signature secret nonce `r` from a **secret** key-half
(`prefix`/`kR`) mixed with the message: `r = SHA-512(prefix ‖ M)`. That secrecy is the entire
security argument.

SecondFi's June 2026 rewrite shipped a signer that instead computed `r = SHA-512(M)` — message only,
secret dropped. Once the nonce is public, the signing equation `s = (r + H·a) mod L` collapses to one
linear equation in one unknown, solvable from a **single** ordinary signature:

```
a = (s − r) · H⁻¹ mod L
```

This is strictly worse than classical nonce reuse (which needs two signatures sharing a nonce, as in
the 2010 PlayStation 3 ECDSA break) — Ed25519 was specifically designed to make that class of bug
impossible, and this implementation broke the guarantee by construction. `@noble/curves`, the
underlying vetted curve-arithmetic library, is not at fault; the defect was in a hand-written wrapper
around it that never passed the secret prefix into the hash. A detector confirms this with no false
positives: `SHA-512(M)·B == R`.

*(Source: `EXTERNAL_ANALYSIS_TIBANE.md`, `EVID-0013`. The nonce-recovery math itself was not
independently re-derived by this repository — see that document's "not independently verified"
section.)*

## 2. How it reached production — the actual failure

The broken signer was not a random npm dependency slipping in. It was **EMURGO's own in-house
multi-chain SDK**, internally called "Dullahan," written by a former EMURGO employee and published to
npm as `@stashers.io/trantor`. This repository independently verified, against primary sources (not
just the external researcher's report):

- Only one pre-1.0 version (`0.5.2`) was ever published to npm.
- `github.com/stashers-io/trantor` returns 404. EMURGO filed a GitHub DMCA takedown against it
  (record dated 2025-08-26, `EVID-0016`) claiming sole ownership of "proprietary software project
  Dullahan" and naming a former employee as the unauthorized publisher.
- The author's counter-notice (2025-09-09, `EVID-0017`) disputes only *licensing terms*, not that the
  code originated as EMURGO's own project.
- No independent security audit was ever completed. A Project Catalyst Fund 15 proposal to fund one
  (10,000 ADA) was never voted on.
- The June rewrite (app build 10.0.3, shipped 2026-06-08, never publicly tagged or open-sourced)
  removed the previously correct, working Rust signer (`cardano-serialization-lib`) and replaced it
  with this unaudited JS SDK. No produced-signature self-test and no differential test against the
  outgoing signer were run before shipping.

The cryptographic mistake itself is ordinary pre-release risk for unaudited code. **The incident is a
governance failure**: a co-founding Cardano entity promoted its own unvetted in-house signer over a
proven one, with none of the gates that would normally catch this.

## 3. Fund flow — what actually moved

Reconstructed from this repository's own evidence (`evidence/incident-viz-data.json`,
`CONTESTED_CLUSTER.md`, `SUPPLEMENTAL_FINDINGS.md`), independently cross-validated against a separate
`db-sync` mainnet index with matching totals:

| Cluster | ADA | Source wallets | Window (UTC) | Status |
| --- | --- | --- | --- | --- |
| `old_fee_sponsored` | 12,193,786.56 | 179 stakes | 2026-06-21 20:29 → 06-22 00:35 | **Confirmed theft** — laundered through a large DeFi script venue to collector wallets `$cybermuna`/`$adanerone`/`$555888` |
| `new_william_direct` | 129,438,847.56 | ~2,570 (upper bound, see note) | 2026-06-23 03:35 → 10:29 | **Contested** — held, unmoved since 2026-06-23 12:20 UTC |

Key findings:

- **All drains are ordinary key-signed transactions** — zero Plutus redeemers, zero reference inputs.
  This independently confirms the root-cause finding: it is key compromise, not a contract exploit.
- **Victims are established, multi-year, actively-transacting wallets with no shared on-chain factor**
  (no common pool/dApp/token) — the compromise vector is off-chain (the app's key handling), invisible
  from chain data alone.
- The `new_william_direct` source count (~2,570) **overstates victims** — tracing shows
  related-wallet clusters, transit wallets, and dust wallets inflating the count; treat it as an upper
  bound, not a victim tally.
- Both clusters' operational wallets were **first funded from the same wallet**, a Binance-tagged
  CEX hot/omnibus address — not proof of a single operator, but two specific timestamped withdrawals
  an exchange could resolve via KYC.
- The contested cluster's 129.43M ADA **has not been laundered, swapped, bridged, or sent to an
  exchange** — consistent with, but not proof of, a hold-for-return rescue posture (SecondFi's public
  claim). No named custodian transfer has been observed on-chain yet. **On-chain, a malicious sweep
  and a protective sweep are mechanically identical**; only a verifiable transfer to a named custodian
  resolves this.
- Structural note: because the vulnerability lets anyone compute an exposed wallet's key from public
  chain data, SecondFi itself had the same technical ability as an attacker to race and sweep at-risk
  wallets first. That does not prove the rescue claim, but it explains how a legitimate
  emergency-response sweep would look mechanically identical to a theft.
- SecondFi's own public figure (~16M ADA / 374 addresses) does not cleanly match the 12.19M ADA / 179
  addresses measured in the confirmed-theft cluster in this repository's own data — this reconciliation
  remains open.

## 4. Confidence and attribution

Per this repository's confidence taxonomy (`AUDIT_SCOPE.md`):

- Fund-flow findings in §3: `confirmed` (this repository's own on-chain evidence, cross-validated
  against a second independent index).
- "The vulnerable signer computed the nonce without the secret key-half": `moderate_confidence` —
  plausible, internally consistent with RFC 8032, partially corroborated by this repository's own
  primary-source checks (npm, GitHub, DMCA archive, on-chain tx timing), but the core cryptographic
  derivation was not independently reproduced by this repository.
- "The vulnerable SDK originated as EMURGO's own in-house Dullahan project": `high_confidence` — this
  specific claim is directly corroborated by EMURGO's own DMCA filing, an independent primary source.
- "The shipped 10.0.3 build's binary is trantor's code at 89% identifier match": `low_confidence` from
  this repository's perspective — a Tibane-only claim, not independently reproduced here.
- Intent of the `new_william_direct` sweep (rescue vs. theft): explicitly `UNRESOLVED` per
  `CONTESTED_CLUSTER.md` until a named-custodian transfer or laundering event is observed.

## 5. Recommendations (analysis/opinion — not on-chain fact)

**A. Immediate incident response**

1. Resolve the contested cluster publicly and verifiably: name the custodian and execute a
   transparent, traceable on-chain transfer of the 129.43M ADA to it. This is the single highest-leverage
   action for trust and is cheap to do; until it happens, the rescue-vs-theft question stays open.
2. Confirm the patch is fully deployed across all distribution channels and that no build after 10.0.3
   still ships the trantor signer.
3. Push urgent user guidance (see §5D) to anyone who may still be holding an affected key.
4. Pursue the CEX/KYC lead on the shared funding wallet for the confirmed-theft cluster, and coordinate
   with the laundering DeFi venue operator where possible.
5. Treat the two clusters as separate remediation tracks: the 12.19M ADA laundered wave likely needs a
   law-enforcement/exchange-driven recovery path and a separate user make-whole plan; the 129.44M ADA
   may be directly returnable if the custodial-transfer resolver in item 1 fires.

**B. Engineering fix (the crypto bug)**

- Sign exclusively through a vetted, audited primitive that never exposes the nonce (e.g., the
  previously-used audited Rust `cardano-serialization-lib`, or `libsodium crypto_sign`) — never
  hand-roll Ed25519 nonce derivation.
- Add a mandatory produced-signature self-test on every signing path: assert
  `SHA-512(M)·B != R` for every signature emitted before it is broadcast.
- Audit all key-derivation paths for silently dropped or zeroed secret material, especially at
  adapter/wrapper boundaries where key objects are reshaped between layers.

**C. Governance/process fix — the actual root cause**

- Treat any signer swap for custodial-scale software as a hard release gate: no cutover without a
  completed, independent audit, regardless of whether the code is in-house or third-party.
- Require differential testing: run a new signer against the same test vectors as the outgoing one and
  diff outputs byte-for-byte before cutover.
- Fund and complete security audits *before* code reaches users holding real value, not contingent on
  unrelated governance timing.
- Require reproducible, source-available builds for anything custodial-scale.
- Apply supply-chain review discipline to in-house code, not just third-party dependencies — a single
  departed author with no peer review and no maturity signal beyond a pre-1.0 version number should
  block production promotion on its own.

**D. User-facing guidance**

- If your wallet signed **any** transaction between 2026-06-08 and the patch date, treat that key as
  permanently compromised. Reimporting the recovery phrase into a different, correct wallet does
  **not** help — the exposure is mathematical, not app-specific.
- Move funds now, in a single transaction, to a freshly generated key in known-good software, sent to
  an address that was never a SecondFi/Yoroi address. You are racing anyone who has already computed
  your key.
- Wallets that only ever *received* funds remain safe for now, but become exposed the instant they
  send — migrate before ever transacting again.

## Sources

- This repository: `evidence/incident-viz-data.json`, `CONTESTED_CLUSTER.md`,
  `SUPPLEMENTAL_FINDINGS.md`, `EVIDENCE_MANIFEST.md`.
- External cross-reference: `EXTERNAL_ANALYSIS_TIBANE.md` and its cited evidence
  (`EVID-0013`–`EVID-0018`), including this repository's own independent verification of npm registry
  metadata, GitHub DMCA archive records, and on-chain transaction timing.
