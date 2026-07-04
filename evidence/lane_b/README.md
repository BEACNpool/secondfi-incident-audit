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

## Scoped census results (first run)

Beyond the two-tx validation above, the detector was run across a scoped
population: **one representative transaction per blast-radius stake** — each
stake's latest in-window (`2026-06-08` → `2026-06-27`) self-signed, non-drain
transaction (candidate selection: `sql/abcde_secondfi_exposure_candidates.sql`;
the exposure signature is one the *victim* made, not the attacker-signed drain).
CBOR fetched from Blockfrost on 2026-07-04 (`scripts/fetch_tx_cbor.sh`); detector
aggregated by `scripts/run_exposure_census.py` (run under `cbor2` for full
coverage).

**2,588 stakes are cryptographically confirmed exposed** — their own on-chain
signature satisfies `SHA-512(M)·B == R`, proving the key was recoverable from
public data. This is a **lower bound**: one transaction per stake, so a stake not
confirmed here may still be exposed via a different transaction.

Public aggregate: `census_summary.csv`.

| ring_flow | in lists | candidate stakes | checked | confirmed exposed | rate |
| --- | --- | ---: | ---: | ---: | ---: |
| `ring0_theft` | yes | 147 | 147 | 136 | 92.5% |
| `ring0_theft` | no | 32 | 32 | 0 | 0.0% |
| `ring1_contested` | yes | 2,411 | 2,409 | 2,068 | 85.8% |
| `ring1_contested` | no | 448 | 448 | 370 | 82.6% |
| `mixed` | yes | 27 | 27 | 14 | 51.9% |
| **TOTAL** | | **3,065** | **3,063** | **2,588** | **84.5%** |

Two readings stand out:

- **The method self-validates.** The 32 `ring0` stakes that are *not* in the
  published source lists — the ones flagged as likely transit/counterparty in the
  flow census — return **0% exposed**. Real theft victims in the same ring return
  **92.5%**. Exposure cleanly separates victims from pass-through wallets.
- **The blast radius genuinely extends past the published lists.** Of the
  newly-captured contested-cluster stakes (not in the original lists), **82.6% are
  cryptographically confirmed exposed** — they are real affected wallets, not
  clustering noise.

### Custody of the withheld row-level list

Per `BLAST_RADIUS_METHODOLOGY.md` §5, the row-level exposed-stake list is
**dual-use** (an exposed-and-funded wallet is a target). It is held as `withheld`
custody evidence and is **not** committed to this public repository. For the
audit trail, the withheld file's integrity is recorded here without publishing
its contents:

- rows: `3,063`; exposed rows: `2,588`
- SHA-256: `da8d056984f1290bf2378a9cd0e8e44e1e3d98ad760ea537510b996e6d138b24`

The public surface is this aggregate plus (future) a self-service checker where a
user tests their own address. Raw exposed-and-funded rows go only to coordinated
recovery channels. No private key is ever computed.

## Why the two-tx cases above are safe to publish

Running the detector across the whole exposure window would enumerate all of Ring
2. The two txs in the validation section are already public (one cited by Tibane,
one already in this repository's evidence), and the scoped-census output above is
published only in aggregate — so nothing here exposes an individual
exposed-and-funded wallet.
