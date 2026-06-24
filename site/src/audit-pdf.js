const PAGE = {
  width: 612,
  height: 792,
  margin: 44,
};

const FONT = {
  regular: "F1",
  bold: "F2",
  mono: "F3",
};

const INK = {
  text: [0.09, 0.12, 0.17],
  body: [0.16, 0.22, 0.3],
  muted: [0.34, 0.42, 0.53],
  line: [0.68, 0.74, 0.82],
  strongLine: [0.13, 0.26, 0.46],
  blue: [0.02, 0.36, 0.64],
  green: [0.0, 0.46, 0.32],
};

const CONTENT_WIDTH = PAGE.width - PAGE.margin * 2;

function cleanText(value) {
  return String(value ?? "")
    .replaceAll("₳", "ADA ")
    .replaceAll("–", "-")
    .replaceAll("—", "-")
    .replaceAll("“", '"')
    .replaceAll("”", '"')
    .replaceAll("’", "'")
    .replaceAll("•", "-")
    .replace(/[^\x09\x0A\x0D\x20-\x7E]/g, "");
}

function pdfEscape(value) {
  return cleanText(value)
    .replaceAll("\\", "\\\\")
    .replaceAll("(", "\\(")
    .replaceAll(")", "\\)");
}

function approxCharFactor(font) {
  if (font === "mono") return 0.6;
  if (font === "bold") return 0.54;
  return 0.5;
}

function wrapText(value, maxWidth, size = 10, font = "regular") {
  const paragraphs = cleanText(value).split(/\n+/);
  const maxChars = Math.max(10, Math.floor(maxWidth / (size * approxCharFactor(font))));
  const lines = [];
  for (const paragraph of paragraphs) {
    const words = paragraph.trim().split(/\s+/).filter(Boolean);
    if (!words.length) {
      lines.push("");
      continue;
    }
    let line = "";
    for (const word of words) {
      if (word.length > maxChars) {
        if (line) {
          lines.push(line);
          line = "";
        }
        for (let i = 0; i < word.length; i += maxChars) lines.push(word.slice(i, i + maxChars));
        continue;
      }
      const next = line ? `${line} ${word}` : word;
      if (next.length > maxChars) {
        lines.push(line);
        line = word;
      } else {
        line = next;
      }
    }
    if (line) lines.push(line);
  }
  return lines;
}

function normalizeTableCells(cells, columnCount) {
  const row = Array.isArray(cells) ? cells : [cells];
  const normalized = row.slice(0, columnCount).map((cell) => {
    if (Array.isArray(cell)) return cell.map((item) => cleanText(item)).filter(Boolean).join(", ");
    if (cell && typeof cell === "object") return cleanText(JSON.stringify(cell));
    return cleanText(cell);
  });
  while (normalized.length < columnCount) normalized.push("");
  return normalized;
}

function fitWidths(widths, columnCount) {
  const fallback = Array.from({ length: columnCount }, () => CONTENT_WIDTH / Math.max(1, columnCount));
  const source = Array.isArray(widths) && widths.length === columnCount ? widths : fallback;
  const total = source.reduce((sum, width) => sum + Number(width || 0), 0);
  if (!total) return fallback;
  if (total > CONTENT_WIDTH) return source.map((width) => (Number(width || 0) / total) * CONTENT_WIDTH);
  const fitted = source.map((width) => Number(width || 0));
  fitted[fitted.length - 1] += CONTENT_WIDTH - total;
  return fitted;
}

function shortRef(value) {
  const text = cleanText(value).trim();
  if (text.length <= 26) return text;
  const urlPart = text.match(/\/([a-zA-Z0-9_-]{28,})(?:[/?#].*)?$/);
  const source = urlPart ? urlPart[1] : text;
  if (source.length <= 26) return source;
  return `${source.slice(0, 10)}...${source.slice(-8)}`;
}

function pickValue(row, keys) {
  for (const key of keys) {
    if (row[key] !== undefined && row[key] !== null && row[key] !== "") return row[key];
  }
  return "";
}

function rowFromObject(row, columns) {
  return columns.map((column) => {
    const value = pickValue(row, column.keys || [column.key]);
    return column.short ? shortRef(value) : value;
  });
}

function sectionFromAudit(audit, keys) {
  for (const key of keys) {
    const value = audit?.[key];
    if (Array.isArray(value)) return { rows: value };
    if (value && Array.isArray(value.rows)) return value;
  }
  for (const key of keys) {
    const value = audit?.sections?.[key];
    if (Array.isArray(value)) return { rows: value };
    if (value && Array.isArray(value.rows)) return value;
  }
  return null;
}

function rowsForSection(section, columns) {
  return (section?.rows || []).map((row) => (Array.isArray(row) ? row : rowFromObject(row || {}, columns)));
}

function valuesForAudit(audit, key, fallback = []) {
  return Array.isArray(audit?.[key]) ? audit[key] : fallback;
}

class PdfDoc {
  constructor(title) {
    this.title = cleanText(title);
    this.pages = [];
    this.pageNumber = 0;
    this.newPage();
  }

  newPage() {
    this.pageNumber += 1;
    this.pages.push({ ops: [], number: this.pageNumber });
    this.y = PAGE.height - PAGE.margin;
  }

  get page() {
    return this.pages[this.pages.length - 1];
  }

  ensure(height) {
    if (this.y - height < PAGE.margin + 26) {
      this.newPage();
      return true;
    }
    return false;
  }

  text(value, x, y, options = {}) {
    const size = options.size || 10;
    const font = FONT[options.font || "regular"];
    const color = options.color || INK.text;
    this.page.ops.push(
      `${color.map((n) => Number(n).toFixed(3)).join(" ")} rg BT /${font} ${size} Tf ${x.toFixed(2)} ${y.toFixed(2)} Td (${pdfEscape(value)}) Tj ET`,
    );
  }

  line(x1, y1, x2, y2, color = INK.line, width = 0.6) {
    this.page.ops.push(
      `q ${color.map((n) => Number(n).toFixed(3)).join(" ")} RG ${width} w ${x1.toFixed(2)} ${y1.toFixed(2)} m ${x2.toFixed(2)} ${y2.toFixed(2)} l S Q`,
    );
  }

  paragraph(value, options = {}) {
    const size = options.size || 10;
    const font = options.font || "regular";
    const leading = options.leading || size * 1.32;
    const indent = options.indent || 0;
    const width = options.width || PAGE.width - PAGE.margin * 2 - indent;
    const color = options.color || INK.body;
    const lines = wrapText(value, width, size, font);
    this.ensure(lines.length * leading + 4);
    for (const line of lines) {
      this.text(line, PAGE.margin + indent, this.y, { size, font, color });
      this.y -= leading;
    }
    this.y -= options.after ?? 4;
  }

  heading(value) {
    this.ensure(34);
    this.y -= 6;
    this.text(value, PAGE.margin, this.y, { size: 13, font: "bold", color: INK.blue });
    this.y -= 8;
    this.line(PAGE.margin, this.y, PAGE.width - PAGE.margin, this.y, INK.strongLine, 0.8);
    this.y -= 16;
  }

  titleBlock(title, subtitle) {
    this.text("CARDANO INCIDENT EVIDENCE AUDIT", PAGE.margin, this.y, { size: 9, font: "bold", color: INK.green });
    this.y -= 24;
    this.paragraph(title, { size: 20, font: "bold", leading: 23, color: INK.text, after: 4 });
    this.paragraph(subtitle, { size: 10, color: INK.body, after: 12 });
    this.line(PAGE.margin, this.y, PAGE.width - PAGE.margin, this.y, INK.strongLine, 1);
    this.y -= 18;
  }

  keyValues(rows) {
    const labelWidth = 130;
    const valueWidth = PAGE.width - PAGE.margin * 2 - labelWidth - 10;
    for (const [label, value] of rows) {
      const lines = wrapText(value, valueWidth, 9, "regular");
      const lineStep = 12.5;
      const height = Math.max(24, lines.length * lineStep + 11);
      this.ensure(height + 4);
      const rowTop = this.y;
      const baseline = rowTop - 12;
      this.text(label.toUpperCase(), PAGE.margin, baseline, { size: 8, font: "bold", color: INK.muted });
      let yy = baseline;
      for (const line of lines) {
        this.text(line, PAGE.margin + labelWidth, yy, { size: 9, color: INK.text });
        yy -= lineStep;
      }
      this.y = rowTop - height;
      this.line(PAGE.margin, this.y + 4, PAGE.width - PAGE.margin, this.y + 4, INK.line, 0.45);
    }
    this.y -= 8;
  }

  bullets(items) {
    for (const item of items) {
      this.paragraph(`- ${item}`, { size: 9.4, leading: 12.6, indent: 8, after: 2 });
    }
    this.y -= 4;
  }

  table(headers, rows, widths, options = {}) {
    const columnCount = headers.length;
    if (!columnCount) return;
    const sourceRows = rows || [];
    const tableWidths = fitWidths(widths, columnCount);
    const rowSize = options.size || 7.6;
    const lineHeight = options.lineHeight || 9.5;
    const paddingTop = options.paddingTop ?? 8;
    const paddingBottom = options.paddingBottom ?? 7;
    const paddingX = options.paddingX ?? 3;
    const headerMaxLines = options.headerMaxLines || 2;
    const bodyMaxLines = options.maxCellLines || options.bodyMaxLines || 5;
    const repeatHeader = options.repeatHeader !== false;
    const minRowHeight = options.minRowHeight || 18;
    const maxRows = options.maxRows || sourceRows.length;
    const tableRows = sourceRows.slice(0, maxRows).map((row) => normalizeTableCells(row, columnCount));
    const monoColumns = new Set(options.monoColumns || []);
    const rowMaxHeight = Math.max(40, PAGE.height - PAGE.margin * 2 - 86);
    const maxSafeLines = Math.max(1, Math.floor((rowMaxHeight - paddingTop - paddingBottom) / lineHeight));
    const fontFor = (index, isHeader = false) => {
      if (isHeader) return "bold";
      if (options.mono || monoColumns.has(index) || (index === 0 && options.firstColumnMono !== false)) return "mono";
      return "regular";
    };
    const wrapCells = (cells, isHeader = false) =>
      cells.map((cell, index) => {
        const font = fontFor(index, isHeader);
        const maxLines = Math.min(isHeader ? headerMaxLines : bodyMaxLines, maxSafeLines);
        const lines = wrapText(cell, tableWidths[index] - paddingX * 2, rowSize, font);
        if (lines.length <= maxLines) return lines;
        const clipped = lines.slice(0, maxLines);
        clipped[clipped.length - 1] = `${clipped[clipped.length - 1].replace(/\.+$/g, "")}...`;
        return clipped;
      });
    const heightFor = (wrapped) => Math.max(minRowHeight, Math.max(...wrapped.map((lines) => Math.max(1, lines.length))) * lineHeight + paddingTop + paddingBottom);
    const headerCells = normalizeTableCells(headers, columnCount);
    const headerWrapped = wrapCells(headerCells, true);
    const headerHeight = heightFor(headerWrapped);
    const drawWrappedRow = (wrapped, isHeader = false, rowHeight = heightFor(wrapped)) => {
      let x = PAGE.margin;
      this.line(PAGE.margin, this.y + 4, PAGE.width - PAGE.margin, this.y + 4, isHeader ? INK.strongLine : INK.line, 0.45);
      for (let i = 0; i < wrapped.length; i += 1) {
        const font = fontFor(i, isHeader);
        const color = isHeader ? INK.muted : INK.text;
        let yy = this.y - paddingTop;
        for (const line of wrapped[i]) {
          this.text(line, x + paddingX, yy, { size: rowSize, font, color });
          yy -= lineHeight;
        }
        x += tableWidths[i];
      }
      this.y -= rowHeight;
    };
    const drawHeader = () => {
      this.ensure(headerHeight + 8);
      drawWrappedRow(headerWrapped, true, headerHeight);
    };
    drawHeader();
    for (const row of tableRows) {
      const wrapped = wrapCells(row, false);
      const rowHeight = heightFor(wrapped);
      if (this.y - rowHeight < PAGE.margin + 26) {
        this.newPage();
        if (repeatHeader) drawHeader();
      }
      drawWrappedRow(wrapped, false, rowHeight);
    }
    if (sourceRows.length > tableRows.length) {
      this.paragraph(`${sourceRows.length - tableRows.length} additional rows omitted from this PDF table. Use the transaction hashes above for full chain verification.`, {
        size: 8,
        color: INK.muted,
      });
    }
    this.y -= 6;
  }

  addFooters() {
    for (const page of this.pages) {
      page.ops.push("q 0.130 0.260 0.460 RG 0.5 w 44 36 m 568 36 l S Q");
      page.ops.push(`0.340 0.420 0.530 rg BT /F1 8 Tf 44 22 Td (${pdfEscape(this.title)}) Tj ET`);
      page.ops.push(`0.340 0.420 0.530 rg BT /F1 8 Tf 520 22 Td (${page.number} / ${this.pages.length}) Tj ET`);
    }
  }

  build() {
    this.addFooters();
    const objects = [];
    objects[1] = "<< /Type /Catalog /Pages 2 0 R >>";
    objects[3] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>";
    objects[4] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>";
    objects[5] = "<< /Type /Font /Subtype /Type1 /BaseFont /Courier >>";
    const kids = [];
    let nextObj = 6;
    for (const page of this.pages) {
      const pageObj = nextObj;
      const streamObj = nextObj + 1;
      nextObj += 2;
      kids.push(`${pageObj} 0 R`);
      const content = page.ops.join("\n");
      objects[pageObj] =
        `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE.width} ${PAGE.height}] /Resources << /Font << /F1 3 0 R /F2 4 0 R /F3 5 0 R >> >> /Contents ${streamObj} 0 R >>`;
      objects[streamObj] = `<< /Length ${content.length} >>\nstream\n${content}\nendstream`;
    }
    objects[2] = `<< /Type /Pages /Kids [${kids.join(" ")}] /Count ${this.pages.length} >>`;

    let pdf = "%PDF-1.4\n";
    const offsets = [0];
    for (let i = 1; i < objects.length; i += 1) {
      offsets[i] = pdf.length;
      pdf += `${i} 0 obj\n${objects[i]}\nendobj\n`;
    }
    const xref = pdf.length;
    pdf += `xref\n0 ${objects.length}\n0000000000 65535 f \n`;
    for (let i = 1; i < objects.length; i += 1) {
      pdf += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
    }
    pdf += `trailer\n<< /Size ${objects.length} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
    return new Blob([pdf], { type: "application/pdf" });
  }
}

function safeFilename(value) {
  return cleanText(value).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80) || "audit";
}

const OPTIONAL_AUDIT_SECTIONS = [
  {
    title: "Chronological audit trail",
    keys: ["chronologicalAuditTrailRows", "chronologicalAuditRows", "auditTrailRows", "trailRows", "chronologyRows", "chronologicalAuditTrail", "auditTrail", "chronology"],
    widths: [38, 68, 64, 116, 72, 72, 50, 44],
    columns: [
      { header: "Step", keys: ["step", "seq", "sequence", "index", "ref"], short: true },
      { header: "UTC", keys: ["utc", "time", "timestamp", "date"] },
      { header: "Phase", keys: ["phase", "phaseLabel", "phaseName"] },
      { header: "Action", keys: ["action", "event", "description", "summary", "note"] },
      { header: "From ref", keys: ["fromRef", "from_ref", "sourceRef", "source", "from"], short: true },
      { header: "To ref", keys: ["toRef", "to_ref", "destinationRef", "destination", "to"], short: true },
      { header: "ADA", keys: ["ada", "amount", "adaAmount"] },
      { header: "Evidence", keys: ["evidenceRef", "evidence_ref", "txRef", "txHash", "hash", "url"], short: true },
    ],
    options: { size: 6.9, lineHeight: 8.7, maxRows: 90, maxCellLines: 7, monoColumns: [0, 4, 5, 7] },
  },
  {
    title: "Drain ledger",
    keys: ["drainLedgerRows", "drainRows", "drainLedger", "drains"],
    widths: [68, 62, 88, 58, 38, 108, 102],
    columns: [
      { header: "UTC", keys: ["utc", "time", "timestamp", "date"] },
      { header: "Drain ref", keys: ["drainRef", "drain_ref", "ref", "txRef", "txHash", "hash"], short: true },
      { header: "Source ref", keys: ["sourceRef", "source_ref", "sourceId", "source", "from"], short: true },
      { header: "ADA", keys: ["ada", "amount", "adaAmount"] },
      { header: "Assets", keys: ["assets", "assetRows", "assetCount"] },
      { header: "Destination ref", keys: ["destinationRef", "destination_ref", "destination", "to", "toLabel"], short: true },
      { header: "Evidence", keys: ["evidenceRef", "evidence_ref", "txRef", "txHash", "url"], short: true },
    ],
    options: { size: 6.9, lineHeight: 8.7, maxRows: 120, maxCellLines: 6, monoColumns: [1, 2, 5, 6] },
  },
  {
    title: "Source wallet register",
    keys: ["sourceWalletRegisterRows", "sourceRegisterRows", "sourceRows", "sourceWalletRegister", "sourceRegister", "sources"],
    widths: [62, 42, 168, 132, 38, 82],
    columns: [
      { header: "Source ref", keys: ["sourceRef", "source_ref", "ref", "id"], short: true },
      { header: "Type", keys: ["type", "idType", "kind"] },
      { header: "Identifier", keys: ["identifier", "sourceId", "address", "stake"], short: true },
      { header: "Cluster", keys: ["cluster", "clusters", "phase", "role"] },
      { header: "Txs", keys: ["txs", "txCount", "count"] },
      { header: "ADA", keys: ["ada", "amount", "totalAda"] },
    ],
    options: { size: 7, lineHeight: 8.8, maxRows: 90, maxCellLines: 7, monoColumns: [0, 2] },
  },
  {
    title: "Receiving destination register",
    keys: ["receivingDestinationRegisterRows", "destinationRegisterRows", "receivingDestinationRows", "destinationRows", "receivingDestinationRegister", "destinationRegister", "receivingDestinations"],
    widths: [80, 96, 116, 58, 34, 140],
    columns: [
      { header: "Destination ref", keys: ["destinationRef", "destination_ref", "ref", "id", "address", "stake"], short: true },
      { header: "Label", keys: ["label", "name", "recipientName", "entityLabel"] },
      { header: "Role", keys: ["role", "kind", "type", "status"] },
      { header: "ADA", keys: ["ada", "totalAda", "receivedAda"] },
      { header: "Txs", keys: ["txs", "txCount", "count"] },
      { header: "Address or stake ref", keys: ["addressRef", "stakeRef", "shortAddress", "shortStake", "address", "stake"], short: true },
    ],
    options: { size: 7.1, lineHeight: 8.9, maxRows: 80, maxCellLines: 7, monoColumns: [0, 5] },
  },
  {
    title: "Fee sponsor register",
    keys: ["feeSponsorRegisterRows", "feeSponsorRows", "sponsorRegisterRows", "sponsorRows", "feeSponsorRegister", "sponsorRegister", "feeSponsors"],
    widths: [80, 122, 56, 34, 92, 140],
    columns: [
      { header: "Sponsor ref", keys: ["sponsorRef", "sponsor_ref", "ref", "id", "address", "stake"], short: true },
      { header: "Role", keys: ["role", "kind", "type", "label"] },
      { header: "Fees ADA", keys: ["feesAda", "feeAda", "fees", "ada"] },
      { header: "Txs", keys: ["txs", "txCount", "count"] },
      { header: "Evidence", keys: ["evidenceRef", "evidence_ref", "txRef", "txHash", "url"], short: true },
      { header: "Notes", keys: ["notes", "note", "summary", "finding"] },
    ],
    options: { size: 7.1, lineHeight: 8.9, maxRows: 80, maxCellLines: 8, monoColumns: [0, 4] },
  },
  {
    title: "Downstream movement register",
    keys: ["downstreamMovementRegisterRows", "downstreamMovementRows", "movementRegisterRows", "movementRows", "downstreamMovementRegister", "movementRegister", "downstreamMovements"],
    widths: [68, 72, 82, 82, 56, 38, 126],
    columns: [
      { header: "UTC", keys: ["utc", "time", "timestamp", "date"] },
      { header: "Move ref", keys: ["movementRef", "movement_ref", "ref", "txRef", "txHash", "hash"], short: true },
      { header: "From ref", keys: ["fromRef", "from_ref", "sourceRef", "from", "source"], short: true },
      { header: "To ref", keys: ["toRef", "to_ref", "destinationRef", "to", "destination"], short: true },
      { header: "ADA", keys: ["ada", "amount", "adaAmount"] },
      { header: "Assets", keys: ["assets", "assetRows", "assetCount"] },
      { header: "Evidence", keys: ["evidenceRef", "evidence_ref", "txRef", "txHash", "url"], short: true },
    ],
    options: { size: 6.9, lineHeight: 8.7, maxRows: 100, maxCellLines: 7, monoColumns: [1, 2, 3, 6] },
  },
  {
    title: "Downstream output details",
    keys: ["downstreamOutputDetailRows", "downstreamOutputDetailsRows", "downstreamOutputRows", "outputDetailRows", "outputRows", "downstreamOutputDetails", "downstreamOutputs", "outputDetails"],
    widths: [70, 64, 34, 56, 38, 102, 160],
    columns: [
      { header: "Output ref", keys: ["outputRef", "output_ref", "ref", "id"], short: true },
      { header: "Tx ref", keys: ["txRef", "tx_ref", "txHash", "hash"], short: true },
      { header: "Idx", keys: ["index", "idx", "outputIndex"] },
      { header: "ADA", keys: ["ada", "amount", "adaAmount"] },
      { header: "Assets", keys: ["assets", "assetRows", "assetCount"] },
      { header: "Recipient ref", keys: ["recipientRef", "recipient_ref", "recipient", "address", "stake"], short: true },
      { header: "Notes", keys: ["notes", "note", "summary", "label", "recipientName"] },
    ],
    options: { size: 6.9, lineHeight: 8.7, maxRows: 120, maxCellLines: 8, monoColumns: [0, 1, 5] },
  },
];

function renderOptionalAuditSection(doc, audit, spec) {
  const section = sectionFromAudit(audit, spec.keys);
  const rows = rowsForSection(section, spec.columns);
  if (!rows.length) return;
  const headers = section.headers || spec.columns.map((column) => column.header);
  const widths = section.widths || spec.widths;
  doc.heading(section.title || spec.title);
  doc.table(headers, rows, widths, { ...spec.options, ...(section.options || {}) });
}

function verificationRowsForSection(section, columnCount) {
  const rows = section?.rows || [];
  const columns =
    columnCount === 3
      ? [
          { header: "Ref", keys: ["ref", "id", "label", "name", "evidenceRef"] },
          { header: "Type", keys: ["type", "kind", "category"] },
          { header: "URL or hash", keys: ["value", "url", "hash", "txHash", "address", "stake", "sourceListHash"] },
        ]
      : [
          { header: "Label", keys: ["label", "name", "ref", "id", "type", "kind"] },
          { header: "URL or hash", keys: ["value", "url", "hash", "txHash", "address", "stake", "sourceListHash"] },
        ];
  return rows.map((row) => (Array.isArray(row) ? row : rowFromObject(row || {}, columns)));
}

function renderVerificationRegister(doc, audit) {
  const section = sectionFromAudit(audit, ["verificationRows", "verificationRegisterRows", "verificationLinkRows", "verificationRegister", "verificationLinks", "linkRows", "links"]);
  const rawRows = section?.rows || [];
  const columnCount =
    section?.headers?.length ||
    (rawRows.some((row) => Array.isArray(row) && row.length > 2) || rawRows.some((row) => !Array.isArray(row) && row && ("type" in row || "kind" in row || "category" in row)) ? 3 : 2);
  const rows = verificationRowsForSection(section, columnCount);
  if (!rows.length) return;
  const headers = section.headers || (columnCount === 3 ? ["Ref", "Type", "URL or hash"] : ["Label", "URL or hash"]);
  const widths = section.widths || (headers.length === 3 ? [86, 82, 356] : [118, 406]);
  doc.heading(section.title || "Verification register");
  doc.table(headers, rows, widths, {
    size: 7.2,
    lineHeight: 9,
    maxRows: 80,
    maxCellLines: 10,
    monoColumns: headers.length === 3 ? [0, 2] : [1],
    ...(section.options || {}),
  });
}

export function createAuditPdf(audit) {
  const doc = new PdfDoc("SecondFi incident evidence audit");
  doc.titleBlock("SecondFi Incident Evidence Audit", audit.subtitle);

  doc.keyValues([
    ["Searched input", audit.input],
    ["Input type", audit.typeLabel],
    ["Generated UTC", audit.generatedAt],
    ["Dataset generated", audit.datasetGeneratedAt],
    ["Dataset hash", audit.sourceListHash],
    ["Finding", audit.matchSummary],
  ]);

  doc.heading("Executive summary");
  doc.bullets(valuesForAudit(audit, "findings"));

  doc.heading("Subject trail");
  doc.keyValues(valuesForAudit(audit, "subjectRows"));

  for (const section of OPTIONAL_AUDIT_SECTIONS) renderOptionalAuditSection(doc, audit, section);

  const evidenceRows = valuesForAudit(audit, "evidenceRows");
  if (evidenceRows.length) {
    doc.heading("Direct transaction evidence");
    doc.table(["UTC", "Phase", "ADA", "Assets", "Tx hash", "Destination"], evidenceRows, [76, 86, 54, 42, 132, 134], { maxRows: 48, maxCellLines: 5, monoColumns: [4] });
  } else {
    doc.heading("Direct transaction evidence");
    doc.paragraph("No direct transaction in the included incident dataset matched the entered identifier. This is not proof that the identifier was uninvolved; it means this static evidence set does not contain a direct match for the searched string.");
  }

  const walletRows = valuesForAudit(audit, "walletRows");
  if (walletRows.length) {
    doc.heading("Related impacted wallet IDs");
    doc.table(["Source ID", "Type", "Cluster", "Txs", "ADA"], walletRows, [186, 42, 130, 38, 80], { maxRows: 35, mono: false, maxCellLines: 5 });
  }

  const phaseRows = valuesForAudit(audit, "phaseRows");
  if (phaseRows.length) {
    doc.heading("Comparison against full incident flow");
    doc.table(["Flow segment", "Incident txs", "Incident ADA", "Subject txs", "Subject ADA"], phaseRows, [150, 76, 92, 74, 92]);
  }

  renderVerificationRegister(doc, audit);

  doc.heading("Method and evidentiary notes");
  doc.bullets(valuesForAudit(audit, "methodNotes"));

  const blob = doc.build();
  const filename = `secondfi-audit-${safeFilename(audit.typeLabel)}-${safeFilename(audit.input)}.pdf`;
  return { blob, filename };
}
