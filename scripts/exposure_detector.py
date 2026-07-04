#!/usr/bin/env python3
"""SecondFi incident — Ed25519 key-exposure detector (Lane B primitive).

Given a Cardano transaction id and its raw transaction CBOR, this checks each
vkey witness for the SecondFi signer defect: a nonce computed as r = SHA-512(M)
(message only) instead of the RFC 8032 r = SHA-512(prefix || M). Such a signature
satisfies

    SHA-512(M) * B == R

where M is the 32-byte transaction body hash (= the transaction id), B is the
Ed25519 base point, and R is the first 32 bytes of the 64-byte signature. A match
proves the signing key was EXPOSED (recoverable from public chain data).

SAFETY (hard line): this tool proves exposure only. It NEVER computes, stores, or
prints a private key. It does not use the signature scalar s for anything beyond
reporting its presence. See BLAST_RADIUS_METHODOLOGY.md sec. 3 and 5.

Input is raw CBOR (offline, reproducible, no API key in this script). Fetch the
CBOR separately, e.g. Blockfrost /txs/{hash}/cbor, and pass it in.

Usage:
    python3 exposure_detector.py <tx_id_hex> <tx_cbor_hex>
    python3 exposure_detector.py <tx_id_hex> --cbor-file path/to/raw.hex
    echo '<cbor_hex>' | python3 exposure_detector.py <tx_id_hex> -

Exit code 0 always; results are printed as JSON lines. `exposed` is the finding.
"""
import sys
import json
import hashlib

# ---- Ed25519 group arithmetic (RFC 8032 reference, public domain) ----
p = 2**255 - 19
L = 2**252 + 27742317777372353535851937790883648493
d = (-121665 * pow(121666, p - 2, p)) % p
I = pow(2, (p - 1) // 4, p)


def _xrecover(y):
    xx = (y * y - 1) * pow(d * y * y + 1, p - 2, p)
    x = pow(xx, (p + 3) // 8, p)
    if (x * x - xx) % p != 0:
        x = (x * I) % p
    if x % 2 != 0:
        x = p - x
    return x


By = (4 * pow(5, p - 2, p)) % p
Bx = _xrecover(By)
B = (Bx % p, By % p)


def _edwards(P, Q):
    x1, y1 = P
    x2, y2 = Q
    x3 = (x1 * y2 + x2 * y1) * pow(1 + d * x1 * x2 * y1 * y2, p - 2, p)
    y3 = (y1 * y2 + x1 * x2) * pow(1 - d * x1 * x2 * y1 * y2, p - 2, p)
    return (x3 % p, y3 % p)


def _scalarmult(P, e):
    if e == 0:
        return (0, 1)
    Q = _scalarmult(P, e // 2)
    Q = _edwards(Q, Q)
    if e & 1:
        Q = _edwards(Q, P)
    return Q


def _encodepoint(P):
    x, y = P
    bits = [(y >> i) & 1 for i in range(255)] + [x & 1]
    return bytes(sum(bits[i * 8 + j] << j for j in range(8)) for i in range(32))


def predicted_R(M: bytes) -> bytes:
    """R that a signature would carry if its nonce were r = SHA-512(M)."""
    r = int.from_bytes(hashlib.sha512(M).digest(), "little") % L
    return _encodepoint(_scalarmult(B, r))


# ---- minimal CBOR decoder (enough to reach the witness set) ----
class _Cur:
    __slots__ = ("b", "i")

    def __init__(self, b):
        self.b = b
        self.i = 0


def _rd(c):
    b0 = c.b[c.i]
    c.i += 1
    mt, ai = b0 >> 5, b0 & 0x1F
    if ai < 24:
        val = ai
    elif ai == 24:
        val = c.b[c.i]; c.i += 1
    elif ai == 25:
        val = int.from_bytes(c.b[c.i:c.i + 2], "big"); c.i += 2
    elif ai == 26:
        val = int.from_bytes(c.b[c.i:c.i + 4], "big"); c.i += 4
    elif ai == 27:
        val = int.from_bytes(c.b[c.i:c.i + 8], "big"); c.i += 8
    elif ai == 31:
        val = None  # indefinite
    else:
        raise ValueError("bad additional info")

    if mt == 0:
        return val
    if mt == 1:
        return -1 - val
    if mt == 2 or mt == 3:  # bytes / text
        if val is None:
            out = bytearray()
            while c.b[c.i] != 0xFF:
                out += _rd(c)
            c.i += 1
            data = bytes(out)
        else:
            data = c.b[c.i:c.i + val]; c.i += val
        return data if mt == 2 else data.decode("utf-8", "replace")
    if mt == 4:  # array
        if val is None:
            arr = []
            while c.b[c.i] != 0xFF:
                arr.append(_rd(c))
            c.i += 1
            return arr
        return [_rd(c) for _ in range(val)]
    if mt == 5:  # map
        if val is None:
            m = {}
            while c.b[c.i] != 0xFF:
                k = _rd(c); m[_key(k)] = _rd(c)
            c.i += 1
            return m
        m = {}
        for _ in range(val):
            k = _rd(c); m[_key(k)] = _rd(c)
        return m
    if mt == 6:  # tag — skip tag, return tagged value
        return _rd(c)
    if mt == 7:
        return val
    raise ValueError("unsupported major type %d" % mt)


def _key(k):
    return k if isinstance(k, (int, str)) else k.hex() if isinstance(k, (bytes, bytearray)) else k


def vkey_witnesses(tx_cbor: bytes):
    """Return list of (vkey_hex, sig_hex) from the tx witness set (map key 0)."""
    c = _Cur(tx_cbor)
    top = _rd(c)                    # [body, witness_set, is_valid?, aux?]
    wset = top[1]
    vks = wset.get(0, []) if isinstance(wset, dict) else []
    out = []
    for w in vks:
        vk, sig = w[0], w[1]
        out.append((bytes(vk), bytes(sig)))
    return out


def check_tx(tx_id_hex: str, tx_cbor_hex: str):
    M = bytes.fromhex(tx_id_hex)
    tx_cbor = bytes.fromhex(tx_cbor_hex)
    results = []
    for vk, sig in vkey_witnesses(tx_cbor):
        R = sig[:32]                # first half of the 64-byte signature
        exposed = predicted_R(M) == R
        results.append({
            "tx_id": tx_id_hex,
            "vkey": vk.hex(),
            "R": R.hex(),
            "exposed": exposed,
        })
    return results


def _read_cbor_arg(argv):
    if argv[2] == "--cbor-file":
        with open(argv[3]) as f:
            return f.read().strip()
    if argv[2] == "-":
        return sys.stdin.read().strip()
    return argv[2]


if __name__ == "__main__":
    if len(sys.argv) < 3:
        print(__doc__)
        sys.exit(0)
    tx_id = sys.argv[1].strip()
    cbor_hex = _read_cbor_arg(sys.argv)
    for r in check_tx(tx_id, cbor_hex):
        print(json.dumps(r))
