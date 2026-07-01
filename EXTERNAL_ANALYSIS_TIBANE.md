# External Analysis Cross-Reference: Tibane Labs Root-Cause Research

This document cross-references this repository's fund-flow forensic evidence against a third-party
root-cause and supply-chain analysis of the same incident, published independently by Tibane Labs.
It is `public_reference` evidence per `AUDIT_SCOPE.md`, not a claim authored by this repository's
maintainers. Where we independently re-checked a claim against a primary source, that is stated
explicitly; everywhere else, the claim is attributed to Tibane Labs only.

- **Source page:** `https://www.tibane.net/research/secondfi-cardano` (client-rendered SPA; snapshot
  captured 2026-07-01, see `evidence/external/tibane_secondfi_cardano_page_snapshot_20260701.txt`)
- **Mechanism advisory (PDF):** `https://www.tibane.net/reports/20260626b_tibane_secondfi_mechanism.pdf`,
  dated 2026-06-25, copy at `evidence/external/20260626b_tibane_secondfi_mechanism.pdf`
- **Supply-chain analysis (PDF):** `https://www.tibane.net/reports/20260627c_tibane_secondfi_supplychain.pdf`,
  dated 2026-06-28, copy at `evidence/external/20260627c_tibane_secondfi_supplychain.pdf`
- **Author:** Tibane Labs (a Solana-ecosystem R&D outfit; this report is outside their usual chain
  focus, published as independent security research on Cardano)

## What this repository's evidence covers vs. what Tibane covers

| | This repository | Tibane Labs |
| --- | --- | --- |
| Scope | Fund-flow forensics: drain transactions, sponsor/recipient addresses, wallet clustering, downstream movement | Root cause: why keys were compromised, and how the vulnerable code reached production |
| Evidence | On-chain Cardano data (own indexer queries, Blockfrost enrichment) | On-chain Cardano data, npm registry, GitHub DMCA public archive, decompiled Android build |
| Output | `evidence/incident-viz-data.json`, PDF audit trails, wallet inventories | Two PDF advisories (mechanism + supply chain) |

The two bodies of evidence do not overlap in claims and are not in tension. This document exists so a
reader of this repository has a pointer to the "why," not just the "where the money went."

## Tibane's core technical claim (mechanism)

SecondFi (formerly Yoroi)'s June 2026 signer rewrite computed the Ed25519 per-signature nonce as
`r = SHA-512(M)` (message only) instead of the RFC 8032-correct `r = SHA-512(prefix ‖ M)`, where
`prefix` is the secret second half of a Cardano BIP32-Ed25519 extended key (`kL ‖ kR`). Dropping the
secret prefix makes the nonce public and key-independent, which collapses the EdDSA signing equation
`s = (r + H·a) mod L` to one equation in one unknown once a single signature exists:

```
a = (s − r) · H⁻¹ mod L      where r = SHA-512(M)
```

This is explicitly **not** classical nonce reuse (which needs two signatures sharing an `r` across
messages, as in the 2010 PlayStation 3 ECDSA break) — recovery here needs only **one** signature, and
Ed25519's design was specifically meant to make key exposure via `r` impossible. Tibane's detector for
an affected signature is a single check with no false positives: `SHA-512(M)·B == R`.

Tibane states they verified this end-to-end on live mainnet data: reproducing a predicted nonce `R`
from a real transaction, observing two distinct victim keys emit the identical `R` for the same
message (a ~2⁻²⁵⁵ event under correct signing), and recovering private scalars from single signatures,
confirmed by regenerating the public key (`a·B == A`). We did not redo this cryptographic derivation
ourselves — see "What we did and did not independently verify" below.

## Tibane's core supply-chain claim

The vulnerable signer was not a random upstream dependency. Tibane's supply-chain report identifies it
as EMURGO's own in-house multi-chain wallet SDK, internally called **"Dullahan,"** published to npm as
**`@stashers.io/trantor`** by a former EMURGO employee (attributed to Boris Kolar / stashers.io). Key
claims:

- Only one npm version was ever published: `0.5.2`, on 2025-08-25, pre-1.0.
- No publicly known independent security audit. A Project Catalyst Fund 15 proposal to fund one
  (10,000 ADA, ~10% of the ask) was never voted on — Fund 15's vote never occurred.
- SecondFi's June rewrite (app build 10.0.3, shipped 2026-06-08, never publicly tagged/open-sourced)
  replaced EMURGO's previously-correct Rust signer (`cardano-serialization-lib` via
  `react-native-haskell-shelley`) with this JS SDK.
- The first predictable-nonce signature appears on-chain the same day, 2026-06-08.
- EMURGO itself filed a GitHub DMCA takedown against `github.com/stashers-io/trantor` (2025-08-26)
  identifying the code as its own proprietary "Dullahan" project, taken by "one of our former
  employees." The author's counter-notice (2025-09-09) disputes only *licensing* (claims an MIT
  `LICENSE.txt` was present in the private repo since 2024-06-06), not the code's EMURGO origin.
- Attribution of the shipped Android build to trantor's code: Tibane says they decompiled the shipped
  APK (10.0.3) and found the live `sign()` function maps line-for-line onto trantor 0.5.2's published
  `curve.ts`, with 221 of 248 (89%) sampled distinctive identifiers present across all ten SDK modules.
- Tibane frames the incident as a governance failure (an unvetted in-house signer promoted over a
  working, established one, with no self-test or differential test), not a novel cryptography failure
  — noble's curve library, which trantor's wrapper calls into, is explicitly exonerated.

## What we (this repository) did and did not independently verify

We do not have the shipped SecondFi Android APK and did not attempt the decompilation ourselves. We
did independently re-check the claims that are checkable from primary public sources without it. All
raw responses are preserved in `evidence/external/tibane_claims_verification_20260701.json` plus the
two DMCA record copies.

**Confirmed by us, from primary sources (not just quoting Tibane):**

- `npm view @stashers.io/trantor` / registry API — confirms exactly one published version, `0.5.2`,
  no `repository`/`homepage` field, dependencies including `@noble/curves`, `@noble/hashes`,
  `@noble/ciphers` as Tibane describes.
- `github.com/stashers-io/trantor` and the `stashers` org both return HTTP 404 via the GitHub API —
  consistent with a takedown having occurred.
- GitHub's public DMCA archive contains both filings exactly as Tibane characterizes them: EMURGO's
  2025-08-26 notice claims sole ownership of "proprietary software project Dullahan" and names a
  former employee as the unauthorized publisher; the 2025-09-09 counter-notice disputes only MIT
  licensing terms and does not dispute that the code originated as EMURGO's Dullahan project.
- The transaction Tibane cites as reproducing their predicted nonce
  (`4655145484f7a0f83ddea7c2c52c7ac1f86f9fc7a99ef04f78a7ab177ce02203`) exists on Cardano mainnet via
  Blockfrost, timestamped 2026-06-10T01:10:04Z — inside Tibane's claimed 2026-06-08→2026-06-25
  exposure window.

**Not independently verified by us (attributed to Tibane only):**

- The Ed25519 nonce-recovery math itself — internally consistent with RFC 8032 and plausible, but we
  did not recompute private scalars or the shared-`R` collision ourselves.
- The 221/248 (89%) decompiled-identifier match against the shipped Android build — we did not obtain
  or decompile the APK.
- The identity of X/Twitter account `@boris_kolar` as the SDK's actual author — Tibane itself labels
  this attributed, not confirmed, and we treat it the same way.
- Aggregate victim/loss figures on the tibane.net landing page — Tibane labels these OSINT-sourced,
  not chain-verified, and we have not chain-verified them either.

## Confidence labels (per `AUDIT_SCOPE.md` taxonomy)

- Fund-flow evidence in this repository's own `evidence/` (outside this file): unchanged, `confirmed`
  where previously so labeled.
- "The vulnerable signer computed `r` without the secret key-half, per Tibane's technical description":
  `moderate_confidence` — plausible, internally consistent, partially corroborated by primary-source
  package/DMCA checks, but the core cryptographic derivation is not independently reproduced by this
  repository.
- "The vulnerable SDK originated as EMURGO's own in-house Dullahan project": `high_confidence` — this
  specific claim is directly corroborated by EMURGO's own DMCA filing, an independent primary source.
- "The shipped SecondFi 10.0.3 build's binary is trantor's code at 89% identifier match":
  `low_confidence` from this repository's perspective — Tibane-only claim, not independently
  reproduced here.

## Evidence manifest entries

See `EVIDENCE_MANIFEST.md` for `EVID-0013` through `EVID-0018`, covering the two PDFs, the page
snapshot, the DMCA records, and our verification bundle.
