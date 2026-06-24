import { createAuditPdf } from "./audit-pdf.js";

const state = {
  phase: "all",
  playing: true,
  timeRatio: 1,
  selected: null,
  search: "",
  audit: {
    url: "",
    input: "",
  },
  particles: [],
  particleHits: [],
  data: null,
  positions: {},
  timeMin: 0,
  timeMax: 0,
};

const els = {
  metrics: document.querySelector("#metrics"),
  confidence: document.querySelector("#confidence-label"),
  canvas: document.querySelector("#flow-canvas"),
  wrap: document.querySelector("#canvas-wrap"),
  nodeLayer: document.querySelector("#node-layer"),
  hover: document.querySelector("#hover-card"),
  timeline: document.querySelector("#timeline"),
  detailTitle: document.querySelector("#detail-title"),
  detailBody: document.querySelector("#detail-body"),
  txTable: document.querySelector("#tx-table"),
  walletTable: document.querySelector("#wallet-table"),
  txCount: document.querySelector("#tx-count"),
  walletCount: document.querySelector("#wallet-count"),
  search: document.querySelector("#search-input"),
  auditButton: document.querySelector("#audit-button"),
  auditDownload: document.querySelector("#audit-download"),
  auditStatus: document.querySelector("#audit-status"),
  auditDialog: document.querySelector("#audit-dialog"),
  auditDialogText: document.querySelector("#audit-dialog-text"),
  auditConfirm: document.querySelector("#audit-confirm"),
  auditCancel: document.querySelector("#audit-cancel"),
  slider: document.querySelector("#time-slider"),
  play: document.querySelector("#play-toggle"),
  viewSummary: document.querySelector("#view-summary"),
  timeReadout: document.querySelector("#time-readout"),
  eventReadout: document.querySelector("#event-readout"),
};

const phaseMeta = {
  all: {
    name: "Full audit trail",
    chip: "Audit trail",
    summary: "Audit map: impacted wallets on the left, receiving wallets in the middle, and holding or cash-out paths on the right.",
  },
  old_sweep: {
    name: "Drain wave 1: fee-sponsored",
    chip: "Wave 1",
    summary: "Victim wallets were drained into the first receiving wallet group. The dashed green line marks the fee sponsor that paid transaction fees, not custody.",
  },
  new_sweep: {
    name: "Drain wave 2: $william-qa",
    chip: "Wave 2",
    summary: "Victim funds moved into the $william-qa handle wallet during the second and larger wave; it is labeled as a possible safety-net staging wallet, control unverified.",
  },
  outgoing: {
    name: "Outflows / safety-net candidates",
    chip: "Outflow",
    summary: "After funds landed, some wallets sent funds onward; possible safety-net holdings are labeled separately from DEX/exchange/change outputs.",
  },
};

const ctx = els.canvas.getContext("2d");
const colors = {
  old_sweep: "#4f8bff",
  new_sweep: "#ff6b7d",
  outgoing: "#ffbf5b",
  sponsor: "#52e0a4",
  muted: "rgba(183,203,230,.28)",
};

const nodeDefs = [
  ["victim_sources_old", 0.14, 0.34, "source"],
  ["near_intents_fee_sponsor", 0.14, 0.52, "sponsor"],
  ["old_destination_group", 0.38, 0.40, "destination"],
  ["old_USDCx_proceeds", 0.61, 0.38, "holding"],
  ["external_outgoing", 0.84, 0.42, "holding"],
  ["victim_sources_new", 0.14, 0.72, "source"],
  ["new_william_qa", 0.38, 0.72, "destination"],
  ["new_big_holding", 0.66, 0.72, "holding"],
];

const mobileNodeDefs = [
  ["victim_sources_old", 0.24, 0.20, "source"],
  ["near_intents_fee_sponsor", 0.24, 0.35, "sponsor"],
  ["old_destination_group", 0.68, 0.28, "destination"],
  ["old_USDCx_proceeds", 0.68, 0.43, "holding"],
  ["external_outgoing", 0.68, 0.58, "holding"],
  ["victim_sources_new", 0.24, 0.75, "source"],
  ["new_william_qa", 0.68, 0.75, "destination"],
  ["new_big_holding", 0.68, 0.88, "holding"],
];

const phaseNodeDefs = {
  old_sweep: [
    ["victim_sources_old", 0.28, 0.45, "source"],
    ["near_intents_fee_sponsor", 0.28, 0.63, "sponsor"],
    ["old_destination_group", 0.68, 0.52, "destination"],
  ],
  new_sweep: [
    ["victim_sources_new", 0.28, 0.54, "source"],
    ["new_william_qa", 0.70, 0.54, "destination"],
  ],
  outgoing: [
    ["old_destination_group", 0.24, 0.35, "destination"],
    ["old_USDCx_proceeds", 0.24, 0.55, "holding"],
    ["external_outgoing", 0.70, 0.45, "holding"],
    ["new_william_qa", 0.24, 0.78, "destination"],
    ["new_big_holding", 0.70, 0.76, "holding"],
  ],
};

const mobilePhaseNodeDefs = {
  old_sweep: [
    ["victim_sources_old", 0.30, 0.45, "source"],
    ["near_intents_fee_sponsor", 0.30, 0.65, "sponsor"],
    ["old_destination_group", 0.72, 0.54, "destination"],
  ],
  new_sweep: [
    ["victim_sources_new", 0.28, 0.58, "source"],
    ["new_william_qa", 0.72, 0.58, "destination"],
  ],
  outgoing: [
    ["old_destination_group", 0.31, 0.30, "destination"],
    ["old_USDCx_proceeds", 0.31, 0.50, "holding"],
    ["external_outgoing", 0.73, 0.40, "holding"],
    ["new_william_qa", 0.31, 0.75, "destination"],
    ["new_big_holding", 0.73, 0.72, "holding"],
  ],
};

const entityLabels = {
  victim_sources_old: "impacted wallets: wave 1",
  near_intents_fee_sponsor: "fee sponsor paid tx fees",
  old_destination_group: "first receiving wallets A/B/C",
  old_A_cybermuna: "receiving wallet A / cybermuna",
  old_B_adanerone: "receiving wallet B / adanerone",
  old_C_555888: "receiving wallet C / 555888",
  old_USDCx_proceeds: "possible safety net: USDCx",
  victim_sources_new: "impacted wallets: wave 2",
  new_william_qa: "$william-qa safety net",
  new_big_holding: "129M safety-net holding",
  external_outgoing: "DEX / exchange outflows",
};

const entityRoles = {
  victim_sources_old: "179 impacted source/reward IDs in drain wave 1",
  victim_sources_new: "2,568 impacted source IDs in drain wave 2",
  old_destination_group: "Grouped view of the first receiving wallets: cybermuna, adanerone, and 555888",
  old_A_cybermuna: "Known wave 1 receiving wallet",
  old_B_adanerone: "Known wave 1 receiving wallet",
  old_C_555888: "Known wave 1 receiving wallet",
  old_USDCx_proceeds: "USDCx-heavy wallet with funds still sitting; possible safety-net holding, control unverified",
  new_william_qa: "$william-qa handle wallet; possible safety-net staging wallet for wave 2, control unverified",
  new_big_holding: "Large 129.43M ADA holding destination after $william-qa consolidation; possible safety-net holding, control unverified",
  external_outgoing: "Observed onward outputs to DEX, exchange, or change addresses",
};

const phaseNodes = {
  old_sweep: ["victim_sources_old", "near_intents_fee_sponsor", "old_destination_group"],
  new_sweep: ["victim_sources_new", "new_william_qa"],
  outgoing: ["old_destination_group", "old_USDCx_proceeds", "new_william_qa", "new_big_holding", "external_outgoing"],
};

function fmtAda(value) {
  const n = Number(value || 0);
  if (n >= 1_000_000) return `₳${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `₳${(n / 1_000).toFixed(1)}K`;
  return `₳${n.toLocaleString(undefined, { maximumFractionDigits: 3 })}`;
}

function fmtInt(value) {
  return Number(value || 0).toLocaleString();
}

function truncate(value, front = 12, back = 8) {
  if (!value) return "";
  if (value.length <= front + back + 3) return value;
  return `${value.slice(0, front)}...${value.slice(-back)}`;
}

function cardanoLink(id) {
  if (!id) return "#";
  if (id.startsWith("stake1")) return `https://cardanoscan.io/stakekey/${id}`;
  if (/^[0-9a-f]{64}$/i.test(id)) return `https://cardanoscan.io/transaction/${id}`;
  if (id.length > 40) return `https://cardanoscan.io/address/${id}`;
  return `https://cardanoscan.io/transaction/${id}`;
}

function formatUtc(ts, includeSeconds = false) {
  const iso = new Date(ts * 1000).toISOString();
  return iso.slice(5, includeSeconds ? 19 : 16).replace("T", " ") + " UTC";
}

function displayEntity(entity) {
  return entityLabels[entity.id] || entity.label;
}

function destinationLabel(event) {
  return entityLabels[event.to] || event.toLabel || "";
}

function clusterLabel(value) {
  return String(value || "")
    .split(";")
    .filter(Boolean)
    .map((item) => ({
      old_fee_sponsored: "drain wave 1: fee-sponsored",
      new_william_direct: "drain wave 2: $william-qa",
      post_destination: "culprit wallet outflow",
      review_only: "review only",
    })[item] || item.replaceAll("_", " "))
    .join(" + ");
}

function displayKind(kind) {
  if (kind === "safety_net_candidate") return "safety candidate";
  if (kind === "safety_net_holding") return "safety holding";
  return String(kind || "").replaceAll("_", " ");
}

function phaseName(phase) {
  return phaseMeta[phase]?.name || phase;
}

function phaseChip(phase) {
  return phaseMeta[phase]?.chip || phaseName(phase);
}

function phaseClass(phase) {
  if (phase === "old_sweep") return "phase-chip phase-old";
  if (phase === "new_sweep") return "phase-chip phase-new";
  return "phase-chip phase-out";
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function detailRow(label, value) {
  return `<div class="detail-row"><span>${escapeHtml(label)}</span><div>${value}</div></div>`;
}

function fmtAdaFull(value) {
  return `${Number(value || 0).toLocaleString(undefined, { maximumFractionDigits: 6 })} ADA`;
}

function classifyAuditInput(value) {
  const input = String(value || "").trim();
  if (/^stake1[0-9a-z]+$/i.test(input)) return "stakekey";
  if (/^addr1[0-9a-z]+$/i.test(input)) return "address";
  if (/^[0-9a-f]{64}$/i.test(input)) return "tx";
  return "";
}

function auditTypeLabel(type) {
  return (
    {
      address: "Cardano address",
      stakekey: "Cardano stake key",
      tx: "Cardano transaction hash",
    }[type] || "Unknown input"
  );
}

function sameId(a, b) {
  return String(a || "").toLowerCase() === String(b || "").toLowerCase();
}

function uniqueBy(items, keyFn) {
  const seen = new Set();
  const out = [];
  for (const item of items) {
    const key = keyFn(item);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }
  return out;
}

function eventMatchesEntity(event, entityId) {
  if (!entityId) return false;
  const [from, to] = endpointFor(event);
  return (
    event.from === entityId ||
    event.to === entityId ||
    from === entityId ||
    to === entityId ||
    (event.recipientOutputs || []).some((output) => output.entityId === entityId)
  );
}

function findAuditMatches(input, type) {
  const data = state.data;
  const normalized = input.trim();
  const event = type === "tx" ? data.events.find((item) => sameId(item.txHash, normalized)) : null;
  const wallet = type !== "tx" ? data.wallets.find((item) => sameId(item.sourceId, normalized)) : null;
  const entity =
    type !== "tx"
      ? data.entities.find((item) => sameId(item.address, normalized) || sameId(item.stake, normalized))
      : null;
  const direct = new Map();
  const add = (item) => {
    if (item) direct.set(item.id, item);
  };

  add(event);
  if (type !== "tx") {
    for (const item of data.events) {
      if (item.sourceIds.some((sourceId) => sameId(sourceId, normalized))) add(item);
      if (entity && eventMatchesEntity(item, entity.id)) add(item);
    }
    for (const hash of wallet?.sampleTxHashes || []) {
      add(data.events.find((item) => sameId(item.txHash, hash)));
    }
  }

  const directEvents = [...direct.values()].sort((a, b) => a.timestamp - b.timestamp);
  const relatedSourceIds = new Set();
  for (const item of directEvents) {
    for (const sourceId of item.sourceIds || []) relatedSourceIds.add(sourceId);
  }
  if (wallet) relatedSourceIds.add(wallet.sourceId);
  const relatedWallets = data.wallets
    .filter((item) => relatedSourceIds.has(item.sourceId) || sameId(item.sourceId, normalized))
    .sort((a, b) => b.ada - a.ada);

  return { event, wallet, entity, directEvents, relatedWallets };
}

function phaseBreakdown(events) {
  const map = new Map();
  for (const event of events) {
    const item = map.get(event.phase) || { phase: event.phase, txs: 0, ada: 0, assets: 0 };
    item.txs += 1;
    item.ada += Number(event.ada || 0);
    item.assets += Number(event.assetRows || 0);
    map.set(event.phase, item);
  }
  return map;
}

function auditDestinationFor(event) {
  const outputs = event.recipientOutputs || [];
  if (outputs.length === 1) {
    const output = outputs[0];
    const entity = state.data.entities.find((item) => item.id === output.entityId);
    return entity ? displayEntity(entity) : output.recipientName || truncate(output.address || "", 16, 10);
  }
  const [from, to] = endpointFor(event);
  const entity = state.data.entities.find((item) => item.id === to);
  return entity ? displayEntity(entity) : destinationLabel(event) || to || from;
}

function entityById(id) {
  return state.data.entities.find((item) => item.id === id);
}

function entityForAddress(address, stake) {
  return state.data.entities.find((item) => (address && sameId(item.address, address)) || (stake && sameId(item.stake, stake)));
}

function refLabel(value, front = 10, back = 6) {
  return truncate(String(value || ""), front, back);
}

function outputDisplay(output) {
  const entity = entityById(output.entityId) || entityForAddress(output.address, output.stake);
  if (entity) return displayEntity(entity);
  return output.recipientName || refLabel(output.address || output.stake || "output");
}

function eventRecipientOutputs(event) {
  if (event.recipientOutputs?.length) return event.recipientOutputs;
  const entity = entityById(event.to);
  if (!entity) return [];
  return [
    {
      ada: event.ada,
      address: entity.address,
      stake: entity.stake,
      assetRows: event.assetRows,
      entityId: entity.id,
      outputIndex: null,
      recipientName: displayEntity(entity),
    },
  ];
}

function outputIndexLabel(output, fallbackIndex = 0) {
  return output.outputIndex === null || output.outputIndex === undefined ? `record ${fallbackIndex + 1}` : `output #${output.outputIndex}`;
}

function buildAuditRegisters(input, type, matches) {
  const allEvents = state.data.events;
  const verificationRows = [];
  const sourceRegister = new Map();
  const destinationRegister = new Map();
  const txRegister = new Map();
  const addressRegister = new Map();
  const feeRegister = new Map();
  const sourceRegisterRows = [];
  const destinationStats = new Map();
  const feeSponsorRows = [];
  const drainLedgerRows = [];
  const downstreamMovementRows = [];
  const downstreamOutputRows = [];
  const auditTrailRows = [];
  const processedDownstream = new Set();
  const recipientEntities = new Map();
  let step = 1;
  let drainCount = 0;
  let outputCount = 0;
  let movementCount = 0;

  const addVerification = (ref, kind, value, url) => {
    if (!value) return;
    verificationRows.push([ref, kind, value, url || cardanoLink(value)]);
  };

  const addTxRef = (hash) => {
    if (!hash) return "";
    if (!txRegister.has(hash)) {
      const ref = `TX${String(txRegister.size + 1).padStart(3, "0")}`;
      txRegister.set(hash, ref);
      addVerification(ref, "transaction", hash, cardanoLink(hash));
    }
    return txRegister.get(hash);
  };

  const addAddressRef = (value, kind = "address") => {
    if (!value) return "";
    const key = `${kind}:${value}`;
    if (!addressRegister.has(key)) {
      const ref = `${kind === "stake" ? "K" : "A"}${String(addressRegister.size + 1).padStart(3, "0")}`;
      addressRegister.set(key, ref);
      addVerification(ref, kind, value, cardanoLink(value));
    }
    return addressRegister.get(key);
  };

  const addSourceRef = (sourceId, sourceType = "") => {
    if (!sourceId) return "";
    if (!sourceRegister.has(sourceId)) {
      const wallet = state.data.wallets.find((item) => sameId(item.sourceId, sourceId));
      const ref = `S${String(sourceRegister.size + 1).padStart(3, "0")}`;
      sourceRegister.set(sourceId, ref);
      const idType = sourceType || wallet?.idType || (sourceId.startsWith("stake1") ? "stake" : "address");
      sourceRegisterRows.push([
        ref,
        idType,
        sourceId,
        wallet ? clusterLabel(wallet.clusters) : "source in matched tx",
        wallet ? fmtInt(wallet.txCount) : "1",
        wallet ? fmtAdaFull(wallet.ada) : "",
      ]);
      addVerification(ref, idType === "stake" ? "stake key" : "address", sourceId, cardanoLink(sourceId));
    }
    return sourceRegister.get(sourceId);
  };

  const addDestinationRef = (outputOrEntity) => {
    const entity = outputOrEntity?.id ? outputOrEntity : entityById(outputOrEntity?.entityId) || entityForAddress(outputOrEntity?.address, outputOrEntity?.stake);
    const key = entity?.id || outputOrEntity?.address || outputOrEntity?.stake || outputOrEntity?.recipientName || "unknown";
    if (!destinationRegister.has(key)) {
      const ref = `R${String(destinationRegister.size + 1).padStart(3, "0")}`;
      destinationRegister.set(key, ref);
      destinationStats.set(key, {
        ref,
        key,
        label: entity ? displayEntity(entity) : outputDisplay(outputOrEntity || {}),
        address: entity?.address || outputOrEntity?.address || "",
        stake: entity?.stake || outputOrEntity?.stake || "",
        firstSeen: "",
        receivedAda: 0,
        drainTxs: 0,
        downstreamTxs: 0,
      });
      if (entity?.address || outputOrEntity?.address) addAddressRef(entity?.address || outputOrEntity?.address, "address");
      if (entity?.stake || outputOrEntity?.stake) addAddressRef(entity?.stake || outputOrEntity?.stake, "stake");
    }
    return destinationRegister.get(key);
  };

  const destinationKeyForOutput = (output) => {
    const entity = entityById(output.entityId) || entityForAddress(output.address, output.stake);
    return entity?.id || output.address || output.stake || output.recipientName || "unknown";
  };

  const updateDestinationStats = (output, event, ada) => {
    const key = destinationKeyForOutput(output);
    const ref = addDestinationRef(output);
    const stats = destinationStats.get(key);
    stats.firstSeen = !stats.firstSeen || event.time < stats.firstSeen ? event.time : stats.firstSeen;
    stats.receivedAda += Number(ada || 0);
    stats.drainTxs += 1;
    if (output.entityId) {
      const current = recipientEntities.get(output.entityId) || { ref, firstTimestamp: event.timestamp, firstTime: event.time };
      if (event.timestamp < current.firstTimestamp) {
        current.firstTimestamp = event.timestamp;
        current.firstTime = event.time;
      }
      recipientEntities.set(output.entityId, current);
    }
    return ref;
  };

  const addFeeSponsorRows = (event, txRef) => {
    for (const [index, inputRow] of (event.sponsorInputs || []).entries()) {
      const key = `${event.txHash}:${index}:${inputRow.txHash}:${inputRow.outputIndex}`;
      if (feeRegister.has(key)) continue;
      const ref = `F${String(feeRegister.size + 1).padStart(3, "0")}`;
      feeRegister.set(key, ref);
      const sponsorRef = addAddressRef(inputRow.address, "address");
      feeSponsorRows.push([
        ref,
        txRef,
        sponsorRef,
        fmtAdaFull(inputRow.ada),
        fmtAdaFull(event.feeAda),
        `${refLabel(inputRow.txHash, 8, 6)}:${inputRow.outputIndex}`,
        "fee input only",
      ]);
      auditTrailRows.push([
        String(step++),
        event.time,
        sponsorRef,
        "paid transaction fee",
        txRef,
        fmtAdaFull(event.feeAda),
        ref,
      ]);
    }
  };

  const addDownstreamEvent = (event, fromRef) => {
    if (processedDownstream.has(event.txHash)) return;
    processedDownstream.add(event.txHash);
    const txRef = addTxRef(event.txHash);
    const outputs = event.outputs || [];
    const moveRef = `M${String(++movementCount).padStart(3, "0")}`;
    const fromEntity = entityById(event.from);
    const readableTo = destinationLabel(event) || `${outputs.length} output(s)`;
    downstreamMovementRows.push([
      moveRef,
      event.time,
      fromRef,
      txRef,
      readableTo,
      fmtAdaFull(event.ada),
      fmtInt(outputs.length),
    ]);
    const destStats = fromEntity ? destinationStats.get(fromEntity.id) : null;
    if (destStats) destStats.downstreamTxs += 1;
    auditTrailRows.push([
      String(step++),
      event.time,
      fromRef,
      "downstream movement",
      readableTo,
      fmtAdaFull(event.ada),
      txRef,
    ]);
    outputs.forEach((output, index) => {
      const outRef = `O${String(++outputCount).padStart(3, "0")}`;
      const outputEntity = entityForAddress(output.address, output.stake);
      const toRef = outputEntity ? addDestinationRef(outputEntity) : addAddressRef(output.address, "address");
      const stakeRef = output.stake ? addAddressRef(output.stake, "stake") : "";
      if (outputEntity) {
        const stats = destinationStats.get(outputEntity.id);
        if (stats) {
          stats.firstSeen = !stats.firstSeen || event.time < stats.firstSeen ? event.time : stats.firstSeen;
          stats.receivedAda += Number(output.ada || 0);
        }
      }
      downstreamOutputRows.push([
        outRef,
        moveRef,
        toRef,
        stakeRef || "none",
        fmtAdaFull(output.ada),
        fmtInt(output.asset_rows || output.assetRows || 0),
        outputIndexLabel(output, index),
      ]);
      auditTrailRows.push([
        `${step - 1}.${index + 1}`,
        event.time,
        txRef,
        outputIndexLabel(output, index),
        toRef,
        fmtAdaFull(output.ada),
        outRef,
      ]);
    });
  };

  const directDrainEvents = matches.directEvents.filter((event) => event.phase === "old_sweep" || event.phase === "new_sweep");
  const directOutgoingEvents = matches.directEvents.filter((event) => event.phase === "outgoing");

  for (const event of directDrainEvents) {
    const txRef = addTxRef(event.txHash);
    const sourceRefs = (event.sourceIds || []).map((sourceId) => addSourceRef(sourceId)).filter(Boolean);
    const sourceRefText = sourceRefs.length ? sourceRefs.join(", ") : event.sourceCount ? `${fmtInt(event.sourceCount)} sources` : "source not listed";
    addFeeSponsorRows(event, txRef);
    const outputs = eventRecipientOutputs(event);
    outputs.forEach((output, index) => {
      const outRef = `O${String(++outputCount).padStart(3, "0")}`;
      const ada = output.ada ?? event.ada;
      const destinationRef = updateDestinationStats(output, event, ada);
      const feeRefs = [...feeRegister.values()].slice(-((event.sponsorInputs || []).length || 0)).join(", ");
      drainCount += 1;
      drainLedgerRows.push([
        `D${String(drainCount).padStart(3, "0")}`,
        event.time,
        sourceRefText,
        txRef,
        outRef,
        destinationRef,
        fmtAdaFull(ada),
        feeRefs || "none",
      ]);
      auditTrailRows.push([
        String(step++),
        event.time,
        sourceRefText,
        `${phaseChip(event.phase)} drain ${outputIndexLabel(output, index)}`,
        destinationRef,
        fmtAdaFull(ada),
        txRef,
      ]);
    });
  }

  for (const [entityId, recipient] of recipientEntities.entries()) {
    const downstream = allEvents
      .filter((event) => event.phase === "outgoing" && event.from === entityId && event.timestamp >= recipient.firstTimestamp)
      .sort((a, b) => a.timestamp - b.timestamp || a.txHash.localeCompare(b.txHash));
    downstream.forEach((event) => addDownstreamEvent(event, recipient.ref));
  }

  if (!directDrainEvents.length && directOutgoingEvents.length) {
    for (const event of directOutgoingEvents) {
      const entity = entityById(event.from);
      const fromRef = entity ? addDestinationRef(entity) : addSourceRef(event.from || event.sourceIds?.[0] || "");
      addDownstreamEvent(event, fromRef || "matched source");
    }
  }

  const destinationRows = [...destinationStats.values()]
    .sort((a, b) => a.ref.localeCompare(b.ref))
    .map((item) => [
      item.ref,
      item.label,
      item.address ? addAddressRef(item.address, "address") : "",
      item.stake ? addAddressRef(item.stake, "stake") : "",
      item.firstSeen || "n/a",
      fmtAdaFull(item.receivedAda),
      fmtInt(item.downstreamTxs),
    ]);

  const noTrailReason =
    auditTrailRows.length || matches.directEvents.length
      ? ""
      : `No direct row was found for ${auditTypeLabel(type).toLowerCase()} ${input} in the included incident inventory.`;

  return {
    auditTrailRows,
    sourceRegisterRows,
    drainLedgerRows,
    destinationRows,
    feeSponsorRows,
    downstreamMovementRows,
    downstreamOutputRows,
    verificationRows: uniqueBy(verificationRows, (row) => row.join("|")),
    noTrailReason,
  };
}

function auditMatchSummary(type, matches) {
  if (matches.event) return "Matched one transaction in the included incident evidence set.";
  if (matches.wallet && matches.entity) return "Matched an impacted source wallet and a known incident entity.";
  if (matches.wallet) return "Matched an impacted source wallet ID in the included evidence set.";
  if (matches.entity) return "Matched a known incident destination, sponsor, holding, or outflow entity.";
  if (type === "address") return "No direct match in this static evidence set for the entered address.";
  if (type === "stakekey") return "No direct match in this static evidence set for the entered stake key.";
  return "No direct match in this static evidence set for the entered transaction hash.";
}

function buildAuditFindings(input, type, matches, subjectAda, sourceCount) {
  const findings = [];
  const events = matches.directEvents;
  const first = events[0];
  const last = events[events.length - 1];
  if (matches.event) {
    findings.push(
      `The searched transaction is included in the incident dataset as ${phaseName(matches.event.phase)} at ${matches.event.time}. It records ${fmtAdaFull(matches.event.ada)} and ${fmtInt(matches.event.assetRows)} asset rows moving toward ${auditDestinationFor(matches.event)}.`,
    );
    findings.push(
      `The transaction contains ${fmtInt(matches.event.sourceCount || matches.event.sourceIds.length)} source ID(s), allowing the searched tx to be compared against the same flow labels used in the public map.`,
    );
  } else if (matches.wallet) {
    findings.push(
      `The searched ${auditTypeLabel(type).toLowerCase()} is present as a high-confidence impacted source ID in cluster ${clusterLabel(matches.wallet.clusters)}.`,
    );
    findings.push(
      `Direct matched movement totals ${fmtAdaFull(subjectAda)} across ${fmtInt(events.length)} transaction(s), with first observed incident movement at ${matches.wallet.firstTime}.`,
    );
  } else if (matches.entity) {
    findings.push(
      `The searched ${auditTypeLabel(type).toLowerCase()} maps to "${displayEntity(matches.entity)}", role: ${entityRoles[matches.entity.id] || matches.entity.role}.`,
    );
    findings.push(
      `The entity has ${fmtInt(events.length)} directly related mapped transaction(s) in this evidence set, totaling ${fmtAdaFull(subjectAda)} through the incident graph.`,
    );
  } else {
    findings.push(
      `The entered ${auditTypeLabel(type).toLowerCase()} was not found as a direct source ID, known entity, or transaction hash in this static evidence dataset.`,
    );
    findings.push(
      type === "address"
        ? "For ordinary base addresses, this browser-only report cannot derive the associated stake credential unless that exact address appears in the evidence set. Search the stake key as well when available."
        : "A no-match result should be treated as scope-limited: it means no direct match in this dataset, not a chain-wide exoneration.",
    );
  }
  if (first && last) {
    findings.push(
      `The subject-specific trail runs from ${first.time} through ${last.time}; this sits inside the larger mapped incident window of ${state.data.summary.timeStart} through ${state.data.summary.timeEnd}.`,
    );
  }
  const drainEvents = events.filter((event) => event.phase === "old_sweep" || event.phase === "new_sweep");
  const exactOutputs = drainEvents.filter((event) => (event.recipientOutputs || []).length).length;
  if (drainEvents.length) {
    findings.push(
      `The chronological trail links ${fmtInt(exactOutputs)} direct drain transaction(s) to concrete receiving output records, then follows mapped downstream movements from those receiving wallets where present.`,
    );
  }
  if (sourceCount) findings.push(`The related source-ID set for this audit contains ${fmtInt(sourceCount)} unique source ID(s).`);
  findings.push(
    `Incident-wide comparison baseline: ${fmtInt(state.data.summary.walletCount)} impacted wallet IDs, ${fmtInt(state.data.events.length)} mapped transactions, and ${fmtAdaFull(state.data.summary.combinedAda)} traced to known destinations at the current confidence cut.`,
  );
  return findings;
}

function buildAuditReport(input) {
  const type = classifyAuditInput(input);
  const normalized = input.trim();
  const matches = findAuditMatches(normalized, type);
  const directEvents = matches.directEvents;
  const subjectAda = directEvents.reduce((sum, event) => sum + Number(event.ada || 0), 0);
  const subjectAssets = directEvents.reduce((sum, event) => sum + Number(event.assetRows || 0), 0);
  const sourceCount = new Set(directEvents.flatMap((event) => event.sourceIds || [])).size;
  const subjectPhases = phaseBreakdown(directEvents);
  const balance =
    matches.entity?.stake && state.data.summary.knownBalances
      ? state.data.summary.knownBalances[matches.entity.stake]
      : null;
  const firstEvent = directEvents[0];
  const lastEvent = directEvents[directEvents.length - 1];
  const registers = buildAuditRegisters(normalized, type, matches);

  const subjectRows = [
    ["Classification", auditTypeLabel(type)],
    ["Matched status", auditMatchSummary(type, matches)],
    ["Direct tx count", fmtInt(directEvents.length)],
    ["Direct ADA total", fmtAdaFull(subjectAda)],
    ["Direct asset rows", fmtInt(subjectAssets)],
    ["Unique source IDs", fmtInt(sourceCount)],
    ["First matched UTC", firstEvent?.time || "No direct matched tx"],
    ["Last matched UTC", lastEvent?.time || "No direct matched tx"],
  ];
  if (matches.wallet) {
    subjectRows.push(["Source cluster", clusterLabel(matches.wallet.clusters)]);
    subjectRows.push(["Source confidence", `${matches.wallet.confidence}%`]);
  }
  if (matches.entity) {
    subjectRows.push(["Entity label", displayEntity(matches.entity)]);
    subjectRows.push(["Entity role", entityRoles[matches.entity.id] || matches.entity.role]);
    subjectRows.push(["Entity confidence", `${matches.entity.confidence}%`]);
  }
  if (balance) {
    subjectRows.push(["Known current balance", `${fmtAdaFull(balance.total_ada)} (${balance.status})`]);
  }

  const evidenceRows = directEvents.map((event) => [
    event.time.replace("T", " ").replace("Z", ""),
    phaseName(event.phase),
    fmtAdaFull(event.ada),
    fmtInt(event.assetRows),
    event.txHash,
    auditDestinationFor(event),
  ]);

  const walletRows = uniqueBy(matches.relatedWallets, (wallet) => wallet.sourceId).map((wallet) => [
    wallet.sourceId,
    wallet.idType,
    clusterLabel(wallet.clusters),
    fmtInt(wallet.txCount),
    fmtAdaFull(wallet.ada),
  ]);

  const phaseRows = state.data.phases.map((phase) => {
    const item = subjectPhases.get(phase.id) || { txs: 0, ada: 0 };
    return [phase.label, fmtInt(phase.txCount), fmtAdaFull(phase.ada), fmtInt(item.txs), fmtAdaFull(item.ada)];
  });

  const linkRows = [
    ["Searched identifier", cardanoLink(normalized)],
    ["Incident source list hash", state.data.summary.sourceListHash],
  ];
  if (matches.event) linkRows.push(["Matched tx", matches.event.txUrl]);
  if (matches.wallet) {
    linkRows.push(["Matched source ID", matches.wallet.url]);
    for (const hash of matches.wallet.sampleTxHashes.slice(0, 8)) linkRows.push(["Sample source tx", cardanoLink(hash)]);
  }
  if (matches.entity?.addressUrl) linkRows.push(["Entity address", matches.entity.addressUrl]);
  if (matches.entity?.stakeUrl) linkRows.push(["Entity stake key", matches.entity.stakeUrl]);
  for (const event of directEvents.slice(0, 18)) linkRows.push([`${phaseChip(event.phase)} tx`, event.txUrl]);
  for (const source of state.data.sources || []) linkRows.push([source.label, source.url]);

  return {
    input: normalized,
    type,
    typeLabel: auditTypeLabel(type),
    subtitle: "Subject-specific trail generated from the same static evidence dataset used by the interactive incident map.",
    generatedAt: new Date().toISOString(),
    datasetGeneratedAt: state.data.summary.generatedAt,
    sourceListHash: state.data.summary.sourceListHash,
    matchSummary: auditMatchSummary(type, matches),
    findings: buildAuditFindings(normalized, type, matches, subjectAda, sourceCount),
    subjectRows,
    evidenceRows,
    auditTrailRows: {
      headers: ["Step", "UTC", "From", "Action", "To", "ADA", "Proof"],
      rows: registers.auditTrailRows,
      widths: [34, 76, 96, 116, 74, 76, 52],
      options: { size: 6.9, lineHeight: 8.7, maxRows: 130, maxCellLines: 7, monoColumns: [0, 2, 4, 6] },
    },
    sourceRegisterRows: {
      headers: ["Source ref", "Type", "Identifier", "Cluster", "Txs", "ADA"],
      rows: registers.sourceRegisterRows,
      widths: [48, 38, 176, 132, 34, 96],
      options: { size: 7, lineHeight: 8.8, maxRows: 80, maxCellLines: 7, monoColumns: [0, 2] },
    },
    drainLedgerRows: {
      headers: ["Drain ref", "UTC", "Source ref", "Tx ref", "Output ref", "Destination", "ADA", "Fee ref"],
      rows: registers.drainLedgerRows,
      widths: [46, 74, 92, 48, 46, 68, 86, 64],
      options: { size: 6.8, lineHeight: 8.6, maxRows: 140, maxCellLines: 7, monoColumns: [0, 2, 3, 4, 5, 7] },
    },
    destinationRows: {
      headers: ["Destination ref", "Label", "Address ref", "Stake ref", "First seen", "Received ADA", "Downstream txs"],
      rows: registers.destinationRows,
      widths: [58, 116, 54, 54, 76, 108, 58],
      options: { size: 7, lineHeight: 8.8, maxRows: 90, maxCellLines: 8, monoColumns: [0, 2, 3] },
    },
    feeSponsorRows: {
      headers: ["Fee ref", "Drain tx", "Sponsor addr", "Input ADA", "Fee ADA", "Sponsor UTxO", "Role"],
      rows: registers.feeSponsorRows,
      widths: [44, 54, 62, 72, 58, 132, 102],
      options: { size: 6.9, lineHeight: 8.7, maxRows: 90, maxCellLines: 8, monoColumns: [0, 1, 2, 5] },
    },
    downstreamMovementRows: {
      headers: ["Move ref", "UTC", "From", "Tx ref", "To", "ADA", "Outputs"],
      rows: registers.downstreamMovementRows,
      widths: [48, 76, 54, 54, 120, 110, 62],
      options: { size: 6.9, lineHeight: 8.7, maxRows: 120, maxCellLines: 7, monoColumns: [0, 2, 3] },
    },
    downstreamOutputRows: {
      headers: ["Output ref", "Move ref", "Recipient", "Stake", "ADA", "Assets", "Output index"],
      rows: registers.downstreamOutputRows,
      widths: [54, 50, 64, 54, 94, 42, 166],
      options: { size: 6.9, lineHeight: 8.7, maxRows: 160, maxCellLines: 8, monoColumns: [0, 1, 2, 3] },
    },
    verificationRows: {
      headers: ["Ref", "Type", "Value", "Cardanoscan URL"],
      rows: registers.verificationRows,
      widths: [48, 74, 196, 206],
      options: { size: 6.9, lineHeight: 8.7, maxRows: 180, maxCellLines: 10, monoColumns: [0, 2, 3] },
    },
    noTrailReason: registers.noTrailReason,
    walletRows,
    phaseRows,
    linkRows: uniqueBy(linkRows, (row) => row.join("|")),
    methodNotes: [
      "This report is generated from the included SecondFi incident evidence dataset loaded by the public visualization.",
      "Chronological trail rows use stable local refs; the verification register maps each ref to the full transaction hash, address, stake key, or Cardanoscan URL.",
      "Direct drain rows preserve concrete receiving outputs when present in the evidence set. Downstream rows preserve mapped known-wallet outflows and their recorded outputs.",
      "Fee sponsor rows identify fee inputs separately from receiving outputs.",
      "Safety-net labels are investigative labels only; control of those wallets is unverified in this static dataset.",
      "A no-match result is limited to this evidence set and should not be read as a complete chain-wide investigation.",
    ],
  };
}

function clearAuditDownload() {
  if (state.audit.url) URL.revokeObjectURL(state.audit.url);
  state.audit.url = "";
  state.audit.input = "";
  els.auditDownload.hidden = true;
  els.auditDownload.removeAttribute("href");
  els.auditDownload.removeAttribute("download");
}

function updateAuditControls() {
  const input = els.search.value.trim();
  const type = classifyAuditInput(input);
  els.auditButton.hidden = !type;
  els.auditStatus.textContent = type ? `${auditTypeLabel(type)} ready` : "";
  if (state.audit.input && state.audit.input !== input) clearAuditDownload();
}

function openAuditDialog() {
  const input = els.search.value.trim();
  const type = classifyAuditInput(input);
  if (!type) return;
  els.auditDialogText.textContent = `Do you want an audit trail of "${input}"?`;
  if (typeof els.auditDialog.showModal === "function") {
    els.auditDialog.showModal();
  } else if (window.confirm(`Do you want an audit trail of "${input}"?`)) {
    runAudit();
  }
}

function runAudit() {
  const input = els.search.value.trim();
  const type = classifyAuditInput(input);
  if (!type) return;
  clearAuditDownload();
  els.auditStatus.textContent = "Building audit...";
  const report = buildAuditReport(input);
  const { blob, filename } = createAuditPdf(report);
  state.audit.url = URL.createObjectURL(blob);
  state.audit.input = input;
  els.auditDownload.href = state.audit.url;
  els.auditDownload.download = filename;
  els.auditDownload.hidden = false;
  els.auditStatus.textContent = "Audit ready";
}

function eventTimeCut() {
  return state.timeMin + (state.timeMax - state.timeMin) * state.timeRatio;
}

function phaseMatches(item) {
  return state.phase === "all" || item.phase === state.phase;
}

function searchMatches(text) {
  if (!state.search) return true;
  return text.toLowerCase().includes(state.search.toLowerCase());
}

function visibleEvents() {
  const cut = eventTimeCut();
  return state.data.events.filter((event) => phaseMatches(event) && event.timestamp <= cut);
}

function hasVisiblePhase(phase) {
  const cut = eventTimeCut();
  return state.data.events.some((event) => event.phase === phase && event.timestamp <= cut);
}

function routeHasVisibleEvents(from, to) {
  const cut = eventTimeCut();
  return state.data.events.some((event) => {
    if (!phaseMatches(event) || event.timestamp > cut) return false;
    const [eventFrom, eventTo] = endpointFor(event);
    return eventFrom === from && eventTo === to;
  });
}

function nodeIsActive(id) {
  if (state.phase !== "all") {
    if (!(phaseNodes[state.phase]?.includes(id) || false)) return false;
    if (id === "near_intents_fee_sponsor") return hasVisiblePhase("old_sweep");
    return state.data.events.some((event) => {
      if (event.phase !== state.phase || event.timestamp > eventTimeCut()) return false;
      const [from, to] = endpointFor(event);
      return from === id || to === id;
    });
  }
  if (id === "near_intents_fee_sponsor") return hasVisiblePhase("old_sweep");
  return state.data.events.some((event) => {
    if (event.timestamp > eventTimeCut()) return false;
    const [from, to] = endpointFor(event);
    return from === id || to === id || (id === "old_destination_group" && event.phase === "old_sweep");
  });
}

function nodeIsVisible(id) {
  return nodeIsActive(id);
}

function renderStatus() {
  const events = visibleEvents();
  const ada = events.reduce((sum, event) => sum + event.ada, 0);
  els.viewSummary.textContent = phaseMeta[state.phase]?.summary || "";
  els.timeReadout.textContent = `Showing through ${formatUtc(eventTimeCut(), true)}`;
  els.eventReadout.textContent = `${fmtInt(events.length)} txs visible · ${fmtAda(ada)}`;
}

function metric(label, value, sub) {
  return `<article class="metric"><div class="label">${label}</div><div class="value">${value}</div><div class="sub">${sub || ""}</div></article>`;
}

function renderMetrics() {
  const s = state.data.summary;
  els.confidence.textContent = s.confidenceLabel;
  els.metrics.innerHTML = [
    metric("Impacted wallets", fmtInt(s.walletCount), `${fmtInt(s.stakeCount)} stake IDs / ${fmtInt(s.nonStakeAddressCount)} no-stake addresses`),
    metric("ADA traced", fmtAda(s.combinedAda), "to known destinations, high-confidence cut"),
    metric("Mapped txs", fmtInt(state.data.events.length), `${fmtInt(s.oldTxCount + s.newTxCount)} drain txs + outflows`),
    metric("Drain wave 1", fmtAda(s.oldAda), `${fmtInt(s.oldWalletCount)} source/reward IDs`),
    metric("Drain wave 2", fmtAda(s.newAda), `${fmtInt(s.newWalletCount)} source IDs into $william-qa`),
    metric("Wallet overlap", fmtInt(s.oldNewOverlap), `source-list hash ${s.sourceListHash.slice(0, 10)}...`),
  ].join("");
}

function currentNodeDefs() {
  const rect = els.wrap.getBoundingClientRect();
  const isMobile = rect.width < 620;
  if (state.phase !== "all") {
    const focused = isMobile ? mobilePhaseNodeDefs[state.phase] : phaseNodeDefs[state.phase];
    if (focused) return focused;
  }
  return isMobile ? mobileNodeDefs : nodeDefs;
}

function currentStageDefs() {
  const isMobile = els.wrap.getBoundingClientRect().width < 620;
  if (state.phase === "old_sweep") {
    return [
      [isMobile ? "1. Drained" : "1. Drained wallets", 0.28, 0.16],
      [isMobile ? "2. Received" : "2. Receiving wallets", 0.68, 0.16],
    ];
  }
  if (state.phase === "new_sweep") {
    return [
      [isMobile ? "1. Drained" : "1. Drained wallets", 0.28, 0.20],
      [isMobile ? "2. Received" : "2. Receiving wallet", 0.70, 0.20],
    ];
  }
  if (state.phase === "outgoing") {
    return [
      [isMobile ? "1. Wallets" : "1. Source wallets", 0.24, 0.14],
      [isMobile ? "2. Hold / out" : "2. Holding / outflows", 0.70, 0.14],
    ];
  }
  if (isMobile) {
    return [
      ["1. Drain", 0.15, 0.12],
      ["2. Receive", 0.38, 0.12],
      ["3. Hold", 0.62, 0.12],
      ["4. Outflow", 0.85, 0.12],
    ];
  }
  return [
    ["1. Drained wallets", 0.14, 0.12],
    ["2. Receiving wallets", 0.38, 0.12],
    ["3. Proceeds / holding", 0.64, 0.12],
    ["4. Cash-out / change", 0.84, 0.12],
  ];
}

function computePositions() {
  const rect = els.wrap.getBoundingClientRect();
  const defs = currentNodeDefs();
  state.positions = {};
  for (const [id, nx, ny, cls] of defs) {
    state.positions[id] = { x: nx * rect.width, y: ny * rect.height, className: cls };
  }
}

function renderNodes() {
  computePositions();
  const entities = new Map(state.data.entities.map((entity) => [entity.id, entity]));
  const defs = currentNodeDefs();
  const rect = els.wrap.getBoundingClientRect();
  const stageHtml = currentStageDefs()
    .map(([label, nx, ny]) => `<div class="stage-label" style="left:${nx * rect.width}px;top:${ny * rect.height}px">${escapeHtml(label)}</div>`)
    .join("");
  const nodeHtml = defs
    .map(([id, , , cls]) => {
      const entity = entities.get(id);
      const pos = state.positions[id];
      if (!entity || !pos) return "";
      const active = nodeIsActive(id);
      const visible = nodeIsVisible(id);
      return `<button class="node-button ${cls} ${active ? "active-flow" : "context-only"} ${visible ? "" : "phase-hidden"}" style="left:${pos.x}px;top:${pos.y}px" data-node="${id}">
        <span class="node-kicker">${escapeHtml(displayKind(entity.kind))}</span>
        <span class="node-label">${escapeHtml(displayEntity(entity))}</span>
      </button>`;
    })
    .join("");
  els.nodeLayer.innerHTML = stageHtml + nodeHtml;
  els.nodeLayer.querySelectorAll("[data-node]").forEach((node) => {
    node.addEventListener("click", () => selectEntity(node.dataset.node));
  });
}

function bezierPoint(a, b, t, bend = 0.18) {
  const dx = b.x - a.x;
  const c1 = { x: a.x + dx * 0.32, y: a.y - Math.abs(dx) * bend };
  const c2 = { x: a.x + dx * 0.68, y: b.y + Math.abs(dx) * bend };
  const u = 1 - t;
  return {
    x: u ** 3 * a.x + 3 * u ** 2 * t * c1.x + 3 * u * t ** 2 * c2.x + t ** 3 * b.x,
    y: u ** 3 * a.y + 3 * u ** 2 * t * c1.y + 3 * u * t ** 2 * c2.y + t ** 3 * b.y,
  };
}

function nodeVisualSize(id) {
  const node = els.nodeLayer.querySelector(`[data-node="${id}"]`);
  if (node) {
    return {
      halfWidth: node.offsetWidth / 2,
      halfHeight: node.offsetHeight / 2,
    };
  }
  const rect = els.wrap.getBoundingClientRect();
  return rect.width < 620
    ? { halfWidth: 56, halfHeight: 24 }
    : { halfWidth: 84, halfHeight: 28 };
}

function edgePoint(center, toward, size) {
  const dx = toward.x - center.x;
  const dy = toward.y - center.y;
  if (!dx && !dy) return { ...center };
  const xScale = Math.abs(dx) > 0 ? (size.halfWidth + 7) / Math.abs(dx) : Infinity;
  const yScale = Math.abs(dy) > 0 ? (size.halfHeight + 6) / Math.abs(dy) : Infinity;
  const scale = Math.min(xScale, yScale, 0.48);
  return {
    x: center.x + dx * scale,
    y: center.y + dy * scale,
  };
}

function pathAnchors(from, to) {
  const start = state.positions[from];
  const end = state.positions[to];
  if (!start || !end) return null;
  return {
    a: edgePoint(start, end, nodeVisualSize(from)),
    b: edgePoint(end, start, nodeVisualSize(to)),
  };
}

function drawPath(from, to, color, width = 1.2, alpha = 0.32, dash = [], bend = 0.06) {
  if (!nodeIsVisible(from) || !nodeIsVisible(to)) return;
  const anchors = pathAnchors(from, to);
  if (!anchors) return;
  const { a, b } = anchors;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.setLineDash(dash);
  ctx.beginPath();
  ctx.moveTo(a.x, a.y);
  const dx = b.x - a.x;
  ctx.bezierCurveTo(a.x + dx * 0.35, a.y - Math.abs(dx) * bend, a.x + dx * 0.65, b.y + Math.abs(dx) * bend, b.x, b.y);
  ctx.stroke();
  ctx.restore();
}

function resizeCanvas() {
  const rect = els.wrap.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  els.canvas.width = Math.floor(rect.width * dpr);
  els.canvas.height = Math.floor(rect.height * dpr);
  els.canvas.style.width = `${rect.width}px`;
  els.canvas.style.height = `${rect.height}px`;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  renderNodes();
}

function seedFrom(text) {
  let n = 0;
  for (let i = 0; i < text.length; i += 1) n = (n * 31 + text.charCodeAt(i)) >>> 0;
  return n / 4294967295;
}

function buildParticles() {
  const events = state.data.events;
  const stride = Math.max(1, Math.ceil(events.length / 520));
  state.particles = events
    .map((event, index) => ({ event, index, seed: seedFrom(event.id) }))
    .filter((particle, index) => index % stride === 0 || particle.event.phase === "outgoing" || particle.event.ada > 500000)
    .slice(0, 760);
}

function endpointFor(event) {
  if (event.phase === "old_sweep") return ["victim_sources_old", "old_destination_group"];
  if (event.phase === "new_sweep") return ["victim_sources_new", "new_william_qa"];
  if (event.to === "new_big_holding") return ["new_william_qa", "new_big_holding"];
  if (event.from === "old_USDCx_proceeds") return ["old_USDCx_proceeds", "external_outgoing"];
  if (event.from?.startsWith("old_")) return ["old_destination_group", "external_outgoing"];
  return [event.from, event.to];
}

function phaseVisibleOnGraph(phase) {
  if (state.phase !== "all" && state.phase !== phase) return false;
  return hasVisiblePhase(phase);
}

function drawFrame(now) {
  const rect = els.wrap.getBoundingClientRect();
  ctx.clearRect(0, 0, rect.width, rect.height);

  if (phaseVisibleOnGraph("old_sweep")) {
    drawPath("victim_sources_old", "old_destination_group", colors.old_sweep, 1.8, 0.36);
    drawPath("near_intents_fee_sponsor", "old_destination_group", colors.sponsor, 1.2, 0.34, [4, 6]);
  }

  if (phaseVisibleOnGraph("new_sweep")) {
    drawPath("victim_sources_new", "new_william_qa", colors.new_sweep, 1.8, 0.42);
  }

  if (phaseVisibleOnGraph("outgoing")) {
    if (routeHasVisibleEvents("new_william_qa", "new_big_holding")) {
      drawPath("new_william_qa", "new_big_holding", colors.outgoing, 1.8, 0.46);
    }
    if (routeHasVisibleEvents("old_destination_group", "external_outgoing")) {
      drawPath("old_destination_group", "external_outgoing", colors.outgoing, 1.3, 0.3);
    }
    if (routeHasVisibleEvents("old_USDCx_proceeds", "external_outgoing")) {
      drawPath("old_USDCx_proceeds", "external_outgoing", colors.outgoing, 1.1, 0.26);
    }
  }

  const cut = eventTimeCut();
  state.particleHits = [];
  for (const particle of state.particles) {
    const event = particle.event;
    if (!phaseMatches(event) || event.timestamp > cut) continue;
    const [from, to] = endpointFor(event);
    const anchors = pathAnchors(from, to);
    if (!anchors) continue;
    const { a, b } = anchors;
    const speed = event.phase === "new_sweep" ? 0.00008 : 0.00006;
    const t = state.playing ? ((now * speed + particle.seed) % 1) : 0.72;
    const point = bezierPoint(a, b, t, event.phase === "outgoing" ? 0.04 : 0.06);
    const jitter = (particle.seed - 0.5) * 8;
    const x = point.x;
    const y = point.y + jitter;
    const radius = Math.max(1.1, Math.min(3.4, Math.log10(event.ada + 10) * 0.55));
    ctx.save();
    ctx.globalAlpha = event.phase === "outgoing" ? 0.86 : 0.68;
    ctx.fillStyle = colors[event.phase] || colors.outgoing;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    state.particleHits.push({ x, y, radius: Math.max(8, radius + 4), event });
  }

  requestAnimationFrame(drawFrame);
}

function renderTimeline() {
  const width = els.timeline.clientWidth || 800;
  const height = els.timeline.clientHeight || 76;
  const pad = 34;
  const scale = (ts) => pad + ((ts - state.timeMin) / (state.timeMax - state.timeMin)) * (width - pad * 2);
  const bucketMap = new Map();
  for (const event of state.data.events) {
    if (state.phase !== "all" && event.phase !== state.phase) continue;
    const start = Math.floor(event.timestamp / 300) * 300;
    const key = `${start}:${event.phase}`;
    const bucket = bucketMap.get(key) || { start, phase: event.phase, txCount: 0 };
    bucket.txCount += 1;
    bucketMap.set(key, bucket);
  }
  const buckets = [...bucketMap.values()].sort((a, b) => a.start - b.start);
  const maxTx = Math.max(...buckets.map((bucket) => bucket.txCount), 1);
  const bars = buckets
    .map((bucket) => {
      const barH = Math.max(3, (bucket.txCount / maxTx) * 38);
      const cls = bucket.phase === "old_sweep" ? "bar-old" : bucket.phase === "new_sweep" ? "bar-new" : "bar-outgoing";
      return `<rect class="${cls}" data-bucket="${bucket.start}" data-phase="${bucket.phase}" x="${scale(bucket.start)}" y="${48 - barH}" width="3" height="${barH}" rx="1"></rect>`;
    })
    .join("");
  const cursorX = scale(eventTimeCut());
  els.timeline.innerHTML = `<svg viewBox="0 0 ${width} ${height}" preserveAspectRatio="none">
    <line class="axis" x1="${pad}" x2="${width - pad}" y1="50" y2="50"></line>
    ${bars}
    <line class="cursor" x1="${cursorX}" x2="${cursorX}" y1="8" y2="60"></line>
    <text x="${pad}" y="70">${new Date(state.timeMin * 1000).toISOString().slice(5, 16).replace("T", " ")}</text>
    <text x="${width - pad - 82}" y="70">${new Date(state.timeMax * 1000).toISOString().slice(5, 16).replace("T", " ")}</text>
  </svg>`;
  els.timeline.querySelectorAll("[data-bucket]").forEach((bar) => {
    bar.addEventListener("click", () => selectBucket(bar.dataset.bucket, bar.dataset.phase));
  });
}

function renderTables() {
  const query = state.search;
  const events = visibleEvents().filter((event) => {
    const haystack = `${event.txHash} ${event.phase} ${event.toLabel} ${event.sourceIds.join(" ")}`;
    return searchMatches(haystack);
  });
  const rows = events.slice(-180).reverse();
  els.txCount.textContent = `${fmtInt(events.length)} matched`;
  els.txTable.innerHTML = rows
    .map((event) => {
      const firstSource = event.sourceIds[0] || "";
      return `<tr data-event="${event.id}">
        <td class="mono">${event.time.replace("T", " ").replace("Z", "")}</td>
        <td><span class="${phaseClass(event.phase)}">${phaseChip(event.phase)}</span></td>
        <td class="amount">${fmtAda(event.ada)}</td>
        <td>${fmtInt(event.assetRows)}</td>
        <td><a class="mono truncate" href="${cardanoLink(firstSource)}" target="_blank" rel="noreferrer">${escapeHtml(truncate(firstSource))}</a></td>
        <td><a class="mono" href="${event.txUrl}" target="_blank" rel="noreferrer">${escapeHtml(truncate(event.txHash, 8, 6))}</a></td>
      </tr>`;
    })
    .join("");
  els.txTable.querySelectorAll("[data-event]").forEach((row) => {
    row.addEventListener("click", () => selectEvent(row.dataset.event));
  });

  const wallets = state.data.wallets.filter((wallet) => {
    const haystack = `${wallet.sourceId} ${wallet.clusters} ${wallet.roles}`;
    return searchMatches(haystack);
  });
  els.walletCount.textContent = `${fmtInt(wallets.length)} matched`;
  els.walletTable.innerHTML = wallets
    .slice(0, 220)
    .map((wallet) => `<tr data-wallet="${wallet.sourceId}">
      <td><a class="mono truncate" href="${wallet.url}" target="_blank" rel="noreferrer">${escapeHtml(truncate(wallet.sourceId, 14, 10))}</a></td>
      <td>${wallet.idType}</td>
      <td>${escapeHtml(clusterLabel(wallet.clusters))}</td>
      <td class="mono">${wallet.firstTime.replace("T", " ").replace("Z", "")}</td>
      <td><a href="${wallet.url}" target="_blank" rel="noreferrer">Cardanoscan</a></td>
    </tr>`)
    .join("");
  els.walletTable.querySelectorAll("[data-wallet]").forEach((row) => {
    row.addEventListener("click", () => selectWallet(row.dataset.wallet));
  });
}

function renderOverview() {
  const s = state.data.summary;
  els.detailTitle.textContent = "Incident overview";
  const balances = s.knownBalances || {};
  const holding = balances["stake1uxd39k4peszxlf0x59e88hngpe5u9882y2lyhdzazsq4kfg7pxzgy"];
  const william = balances["stake1uy2n0yvqkgjh8wpe0fl9wm82mxhk5dk09yp2ez4ykte4zcgg2e9m5"];
  els.detailBody.innerHTML = `
    <div class="detail-grid">
      ${detailRow("Wallet IDs", `<strong>${fmtInt(s.walletCount)}</strong> high-confidence impacted source IDs`)}
      ${detailRow("ADA moved", `<span class="amount">${fmtAda(s.combinedAda)}</span> to known destinations`)}
      ${detailRow("Safety-net hold", holding ? `<span class="amount">${fmtAda(holding.total_ada)}</span> in big holding stake` : `<span class="warn">balance not loaded</span>`)}
      ${detailRow("$william-qa", william ? `<span class="amount">${fmtAda(william.total_ada)}</span> remaining on possible staging stake` : `<span class="warn">balance not loaded</span>`)}
      ${detailRow("Drain wave 1", `${fmtInt(s.oldTxCount)} fee-sponsored drain txs into the first receiving wallet group`)}
      ${detailRow("Drain wave 2", `${fmtInt(s.newTxCount)} direct drain txs into $william-qa`)}
    </div>
    <p class="small-note">UTC timestamps. Labels use 95%+ confidence evidence from the local source reports; review-only pre-burst rows are intentionally excluded from the main source list.</p>`;
}

function renderViewSummary() {
  state.selected = { type: "view", id: state.phase };
  const events = visibleEvents();
  const ada = events.reduce((sum, event) => sum + event.ada, 0);
  const sourceCount = new Set(events.flatMap((event) => event.sourceIds)).size;
  els.detailTitle.textContent = phaseName(state.phase);
  els.detailBody.innerHTML = `<div class="detail-grid">
    ${detailRow("Visible txs", fmtInt(events.length))}
    ${detailRow("ADA", `<span class="amount">${fmtAda(ada)}</span>`)}
    ${detailRow("Source IDs", fmtInt(sourceCount))}
    ${detailRow("Through", `<span class="mono">${formatUtc(eventTimeCut(), true)}</span>`)}
    ${detailRow("Meaning", escapeHtml(phaseMeta[state.phase]?.summary || ""))}
  </div>`;
}

function selectEntity(id) {
  const entity = state.data.entities.find((item) => item.id === id);
  if (!entity) return;
  state.selected = { type: "entity", id };
  document.querySelectorAll(".node-button").forEach((node) => node.classList.toggle("active", node.dataset.node === id));
  els.detailTitle.textContent = displayEntity(entity);
  const related = state.data.events.filter((event) => event.from === id || event.to === id || (id === "old_destination_group" && event.phase === "old_sweep"));
  const links = [
    entity.addressUrl ? `<a href="${entity.addressUrl}" target="_blank" rel="noreferrer">address</a>` : "",
    entity.stakeUrl ? `<a href="${entity.stakeUrl}" target="_blank" rel="noreferrer">stake key</a>` : "",
  ].filter(Boolean);
  els.detailBody.innerHTML = `<div class="detail-grid">
    ${detailRow("Role", escapeHtml(entityRoles[id] || entity.role))}
    ${detailRow("Confidence", `${entity.confidence}%`)}
    ${entity.address ? detailRow("Address", `<a class="mono truncate" href="${entity.addressUrl}" target="_blank" rel="noreferrer">${escapeHtml(entity.address)}</a>`) : ""}
    ${entity.stake ? detailRow("Stake key", `<a class="mono truncate" href="${entity.stakeUrl}" target="_blank" rel="noreferrer">${escapeHtml(entity.stake)}</a>`) : ""}
    ${detailRow("Txs shown", fmtInt(related.length))}
    ${links.length ? detailRow("Open", `<div class="link-list">${links.join("")}</div>`) : ""}
    ${entity.note ? detailRow("Note", escapeHtml(entity.note)) : ""}
  </div>`;
}

function selectEvent(id) {
  const event = state.data.events.find((item) => item.id === id);
  if (!event) return;
  state.selected = { type: "event", id };
  els.detailTitle.textContent = `${phaseName(event.phase)} tx`;
  const sources = event.sourceIds.slice(0, 16);
  els.detailBody.innerHTML = `<div class="detail-grid">
    ${detailRow("UTC time", `<span class="mono">${event.time}</span>`)}
    ${detailRow("Tx", `<a class="mono truncate" href="${event.txUrl}" target="_blank" rel="noreferrer">${event.txHash}</a>`)}
    ${detailRow("Phase", `<span class="${phaseClass(event.phase)}">${phaseName(event.phase)}</span>`)}
    ${detailRow("ADA", `<span class="amount">${fmtAda(event.ada)}</span>`)}
    ${detailRow("Assets", fmtInt(event.assetRows))}
    ${detailRow("Destination", escapeHtml(destinationLabel(event)))}
    ${detailRow("Sources", `<div class="source-list">${sources.map((id) => `<a class="mono" href="${cardanoLink(id)}" target="_blank" rel="noreferrer">${escapeHtml(id)}</a>`).join("")}</div>`)}
    ${event.sourceIds.length > sources.length ? detailRow("More", `${fmtInt(event.sourceIds.length - sources.length)} additional sources in tx`) : ""}
  </div>`;
}

function selectWallet(id) {
  const wallet = state.data.wallets.find((item) => item.sourceId === id);
  if (!wallet) return;
  els.detailTitle.textContent = "Impacted wallet ID";
  const txLinks = wallet.sampleTxHashes.map((hash) => `<a class="mono" href="${cardanoLink(hash)}" target="_blank" rel="noreferrer">${truncate(hash, 8, 6)}</a>`).join("");
  els.detailBody.innerHTML = `<div class="detail-grid">
    ${detailRow("Source ID", `<a class="mono truncate" href="${wallet.url}" target="_blank" rel="noreferrer">${escapeHtml(wallet.sourceId)}</a>`)}
    ${detailRow("Type", escapeHtml(wallet.idType))}
    ${detailRow("Cluster", escapeHtml(clusterLabel(wallet.clusters)))}
    ${detailRow("Confidence", `${wallet.confidence}%`)}
    ${detailRow("First seen", `<span class="mono">${wallet.firstTime}</span>`)}
    ${detailRow("Tx count", fmtInt(wallet.txCount))}
    ${detailRow("ADA", `<span class="amount">${fmtAda(wallet.ada)}</span>`)}
    ${txLinks ? detailRow("Sample txs", `<div class="link-list">${txLinks}</div>`) : ""}
  </div>`;
}

function selectBucket(bucketStart, phase) {
  const ts = Number(bucketStart);
  state.timeRatio = (ts - state.timeMin) / (state.timeMax - state.timeMin);
  els.slider.value = Math.round(state.timeRatio * 1000);
  if (state.phase === "all") {
    state.phase = phase;
    document.querySelectorAll("#phase-controls button").forEach((btn) => btn.classList.toggle("active", btn.dataset.phase === phase));
  }
  renderTimeline();
  renderTables();
  renderNodes();
  renderStatus();
  const bucketEvents = state.data.events.filter((event) => event.phase === phase && event.timestamp >= ts && event.timestamp < ts + 300);
  els.detailTitle.textContent = `${phaseName(phase)} window`;
  els.detailBody.innerHTML = `<div class="detail-grid">
    ${detailRow("Window", `<span class="mono">${formatUtc(ts)} - ${formatUtc(ts + 300)}</span>`)}
    ${detailRow("Txs", fmtInt(bucketEvents.length))}
    ${detailRow("ADA", `<span class="amount">${fmtAda(bucketEvents.reduce((sum, event) => sum + event.ada, 0))}</span>`)}
    ${detailRow("Assets", fmtInt(bucketEvents.reduce((sum, event) => sum + event.assetRows, 0)))}
  </div>`;
}

function canvasPointer(event) {
  const rect = els.canvas.getBoundingClientRect();
  return { x: event.clientX - rect.left, y: event.clientY - rect.top };
}

function nearestParticle(point) {
  let best = null;
  let bestDist = Infinity;
  for (const hit of state.particleHits) {
    const dist = Math.hypot(point.x - hit.x, point.y - hit.y);
    if (dist < hit.radius && dist < bestDist) {
      best = hit;
      bestDist = dist;
    }
  }
  return best;
}

function setupInteractions() {
  document.querySelectorAll("#phase-controls button").forEach((button) => {
    button.addEventListener("click", () => {
      state.phase = button.dataset.phase;
      document.querySelectorAll("#phase-controls button").forEach((btn) => btn.classList.toggle("active", btn === button));
      renderNodes();
      renderTimeline();
      renderTables();
      renderStatus();
      renderViewSummary();
    });
  });
  els.play.addEventListener("click", () => {
    state.playing = !state.playing;
    els.play.textContent = state.playing ? "Pause" : "Play";
  });
  els.slider.addEventListener("input", () => {
    state.timeRatio = Number(els.slider.value) / 1000;
    renderNodes();
    renderTimeline();
    renderTables();
    renderStatus();
    if (!state.selected || state.selected.type === "view") renderViewSummary();
  });
  els.search.addEventListener("input", () => {
    state.search = els.search.value.trim();
    renderTables();
    updateAuditControls();
  });
  els.auditButton.addEventListener("click", openAuditDialog);
  els.auditConfirm.addEventListener("click", () => {
    runAudit();
  });
  els.auditCancel.addEventListener("click", () => {
    els.auditStatus.textContent = "";
  });
  els.canvas.addEventListener("mousemove", (event) => {
    const hit = nearestParticle(canvasPointer(event));
    if (!hit) {
      els.hover.hidden = true;
      return;
    }
    els.hover.hidden = false;
    els.hover.style.left = `${Math.min(event.offsetX + 14, els.wrap.clientWidth - 292)}px`;
    els.hover.style.top = `${Math.max(8, event.offsetY - 22)}px`;
    els.hover.innerHTML = `<strong>${phaseName(hit.event.phase)}</strong><br><span class="mono">${hit.event.time}</span><br>${fmtAda(hit.event.ada)} · ${fmtInt(hit.event.assetRows)} asset rows`;
  });
  els.canvas.addEventListener("mouseleave", () => {
    els.hover.hidden = true;
  });
  els.canvas.addEventListener("click", (event) => {
    const hit = nearestParticle(canvasPointer(event));
    if (hit) selectEvent(hit.event.id);
  });
  window.addEventListener("resize", () => {
    resizeCanvas();
    renderTimeline();
  });
}

async function init() {
  const response = await fetch("./data/incident-viz-data.json");
  state.data = await response.json();
  state.timeMin = Math.min(...state.data.events.map((event) => event.timestamp));
  state.timeMax = Math.max(...state.data.events.map((event) => event.timestamp));
  renderMetrics();
  resizeCanvas();
  buildParticles();
  renderTimeline();
  renderTables();
  renderStatus();
  renderOverview();
  state.selected = { type: "view", id: "all" };
  setupInteractions();
  requestAnimationFrame(drawFrame);
}

init().catch((error) => {
  console.error(error);
  els.detailTitle.textContent = "Load failed";
  els.detailBody.innerHTML = `<p class="warn">${escapeHtml(error.message)}</p>`;
});
