# Lane B — Key-Exposure Detector Validation

This bundle validates the Ring 2 exposure detector
(`scripts/exposure_detector.py`) against known transactions. It proves the
detector correctly flags a signature produced by the SecondFi signer defect and
correctly clears a signature produced before the defect existed.

**This is the Lane B *primitive*, validated — not a census.** No wallet list is
enumerated here. See `BLAST_RADIUS_METHODOLOGY.md` §3/§5 for the full Lane B plan
and the dual-use handling rule.

## The detector

For each vkey witness, the defect (nonce `r = SHA-512(M)` instead of
`SHA-512(prefix ‖ M)`) makes the signature satisfy `SHA-512(M)·B == R`, where `M`
is the 32-byte transaction body hash (= the transaction id) and `R` is the first
32 bytes of the signature. A match proves the signing key is recoverable from
public data — i.e. **exposed**.

**Safety line:** the detector computes only `SHA-512(M)·B == R`. It never computes
`a = (s − r)·H⁻¹`, never derives, stores, or prints a private key. It is exposure
detection, not key recovery.

## Cases

| Case | tx | Expectation | Result |
| --- | --- | --- | --- |
| Vulnerable | `4655145484f7a0f83ddea7c2c52c7ac1f86f9fc7a99ef04f78a7ab177ce02203` (2026-06-10, inside the exposure window; the tx Tibane cites as reproducing their predicted nonce) | `exposed = true` | **true — both vkey witnesses** |
| Control | `24a1930c6f99a8a7dd08e94ad546d0828ac79ab220e8f8f0f9758427eed7241e` (2025-07-30, ~10 months before the 2026-06-08 defect) | `exposed = false` | **false** |

Full detector output: `detector_output.jsonl`.

**Notable:** in the vulnerable tx, both vkey witnesses carry the *identical*
`R = 5666e273…`. Two distinct keys emitting the same `R` for the same message is
a ~2⁻²⁵⁵ event under correct Ed25519 signing; under this defect it is expected
(both nonces are `SHA-512(M)`, message-only). This independently corroborates the
mechanism in `EXTERNAL_ANALYSIS_TIBANE.md` — this repository computed it directly,
rather than quoting it.

## Reproduce

The detector reads raw transaction CBOR (offline, no API key in the script). The
two CBOR inputs are checked in as `cbor_vuln_*.hex` and `cbor_control_*.hex`; they
were fetched from Blockfrost `/txs/{hash}/cbor` on 2026-07-04.

```sh
python3 scripts/exposure_detector.py \
  4655145484f7a0f83ddea7c2c52c7ac1f86f9fc7a99ef04f78a7ab177ce02203 \
  --cbor-file evidence/lane_b/cbor_vuln_4655145484f7a0f83ddea7c2c52c7ac1f86f9fc7a99ef04f78a7ab177ce02203.hex

python3 scripts/exposure_detector.py \
  24a1930c6f99a8a7dd08e94ad546d0828ac79ab220e8f8f0f9758427eed7241e \
  --cbor-file evidence/lane_b/cbor_control_24a1930c6f99a8a7dd08e94ad546d0828ac79ab220e8f8f0f9758427eed7241e.hex
```

To re-fetch CBOR for any tx: `GET /txs/{hash}/cbor` with a Blockfrost mainnet
`project_id`, take the `.cbor` field. Any tx-CBOR source (Ogmios, local node) works
equally — the detector is source-agnostic.

## Why this stays a validation, not a census

Running the detector across the whole exposure window would enumerate Ring 2 (the
true blast radius). That output is dual-use: publish aggregates and a
self-service checker; hold the raw exposed-and-funded wallet list as `withheld`
custody evidence; coordinate disclosure; never compute keys. The two txs here are
already public (one cited by Tibane, one already in this repository's evidence),
so this validation is safe to publish as-is.
