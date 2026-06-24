# Audit PDF Verification Plan

This harness is for browser/PDF verification after the main implementation lands. Do not run it against the live URL until the main implementation owner says live verification is ready.

## Dependencies

The repo does not currently expose a root `package.json` or Playwright dependency. Install Playwright inside the verification support area only:

```bash
npm --prefix audit-test install --save-dev playwright
npm --prefix audit-test exec -- playwright install chromium
```

Poppler is needed for PDF checks:

```bash
command -v pdfinfo pdftotext pdftoppm
```

## Local Browser Run

Serve the static app from the repo root:

```bash
python3 -m http.server 8765 --directory .
```

In another shell, run one or more representative IDs:

```bash
BASE_URL=http://127.0.0.1:8765/incident-viz/ \
SEARCH_ID=78a9cee37a43aa3a64fec2d6571332a6733656e6f85e0621d9aec783b5977324 \
TARGET_NAME=local \
node audit-test/audit-pdf-browser-check.cjs
```

```bash
for SEARCH_ID in \
  addr1v9uv75s5y30tjrvwmecd96c6m5r46rs5v74jlm3lfvsnymsscne3p \
  stake1u8d7uq7zmf7may94ptralh2wyrlxzlmd68pu03tljsmtvlsucm6kt \
  78a9cee37a43aa3a64fec2d6571332a6733656e6f85e0621d9aec783b5977324
do
  BASE_URL=http://127.0.0.1:8765/incident-viz/ TARGET_NAME=local SEARCH_ID="$SEARCH_ID" \
    node audit-test/audit-pdf-browser-check.cjs
done
```

Downloads and ready-state screenshots are saved under `audit-test/downloads-local/`.

## Live Browser Run

Only after live approval:

```bash
BASE_URL=https://REPLACE-WITH-LIVE-URL/ \
SEARCH_ID=78a9cee37a43aa3a64fec2d6571332a6733656e6f85e0621d9aec783b5977324 \
TARGET_NAME=live \
HEADLESS=0 \
node audit-test/audit-pdf-browser-check.cjs
```

The script also accepts CLI flags:

```bash
node audit-test/audit-pdf-browser-check.cjs \
  --base-url http://127.0.0.1:8765/incident-viz/ \
  --search-id 78a9cee37a43aa3a64fec2d6571332a6733656e6f85e0621d9aec783b5977324 \
  --target local
```

## PDF Checks

Run these after the browser harness saves a PDF:

```bash
TARGET=local
PDF="$(ls -t "audit-test/downloads-${TARGET}"/*.pdf | head -n 1)"
pdfinfo "$PDF" | tee "audit-test/downloads-${TARGET}/pdfinfo.txt"
```

```bash
TARGET=local
PDF="$(ls -t "audit-test/downloads-${TARGET}"/*.pdf | head -n 1)"
TXT="audit-test/downloads-${TARGET}/$(basename "${PDF%.pdf}").txt"
pdftotext -layout "$PDF" "$TXT"
grep -Ei "CARDANO INCIDENT EVIDENCE AUDIT|Classification|Matched status|Transaction hashes|fee sponsorship|custody" "$TXT"
```

```bash
TARGET=local
PDF="$(ls -t "audit-test/downloads-${TARGET}"/*.pdf | head -n 1)"
RENDER_DIR="audit-test/downloads-${TARGET}/render"
mkdir -p "$RENDER_DIR"
pdftoppm -png -r 160 "$PDF" "$RENDER_DIR/$(basename "${PDF%.pdf}")"
open "$RENDER_DIR/$(basename "${PDF%.pdf}")-1.png"
```

Optional artifact checksum:

```bash
shasum -a 256 "$PDF" > "$PDF.sha256"
```

Expected browser result: search ID typed into the public app, Audit clicked, confirmation dialog text includes the searched ID, Audit ready appears, and the generated PDF downloads successfully.

Expected PDF result: `pdfinfo` reports readable metadata/pages, `pdftotext` exposes the audit title and evidence fields, and `pdftoppm` renders visually readable PNG pages with no clipped or overlapping text.
