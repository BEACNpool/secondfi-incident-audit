#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");
const { pathToFileURL } = require("url");

let chromium;
try {
  ({ chromium } = require("playwright"));
} catch (error) {
  console.error("Playwright is not installed for this harness.");
  console.error("Install it with: npm --prefix audit-test install --save-dev playwright");
  console.error("Then install the browser with: npm --prefix audit-test exec -- playwright install chromium");
  process.exit(2);
}

const DEFAULT_TIMEOUT_MS = 45000;
const DEFAULT_KEY_DELAY_MS = 18;

function parseArgs(argv) {
  const args = {};
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (!arg.startsWith("--")) continue;
    const body = arg.slice(2);
    const equalsIndex = body.indexOf("=");
    if (equalsIndex >= 0) {
      args[body.slice(0, equalsIndex)] = body.slice(equalsIndex + 1);
    } else {
      const next = argv[index + 1];
      if (next && !next.startsWith("--")) {
        args[body] = next;
        index += 1;
      } else {
        args[body] = "true";
      }
    }
  }
  return args;
}

function usage() {
  return [
    "Usage:",
    "  BASE_URL=http://127.0.0.1:8765/incident-viz/ SEARCH_ID=<address|stake|tx> node audit-test/audit-pdf-browser-check.cjs",
    "",
    "Flags mirror the env vars:",
    "  --base-url <url-or-local-path>",
    "  --search-id <address|stake|tx>",
    "  --target <local|live|name>",
    "  --headless <true|false>",
    "",
    "Optional env vars: TARGET_NAME, HEADLESS, SLOW_MO_MS, KEY_DELAY_MS, SCREENSHOT, TIMEOUT_MS",
  ].join("\n");
}

function readOption(args, flagName, envName) {
  return args[flagName] || args[flagName.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase())] || process.env[envName];
}

function parseBool(value, fallback) {
  if (value === undefined || value === null || value === "") return fallback;
  const normalized = String(value).trim().toLowerCase();
  if (["1", "true", "yes", "y", "on"].includes(normalized)) return true;
  if (["0", "false", "no", "n", "off"].includes(normalized)) return false;
  return fallback;
}

function parsePositiveInt(value, fallback) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

function slug(value) {
  const cleaned = String(value || "")
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/^file:\/\//, "local-file")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
  return cleaned || "target";
}

function normalizeBaseUrl(input) {
  const trimmed = String(input || "").trim();
  if (!trimmed) return "";
  if (/^https?:\/\//i.test(trimmed) || /^file:\/\//i.test(trimmed)) return trimmed;
  if (/^(localhost|127\.0\.0\.1|\[?::1\]?)(:\d+)?(\/|$)/i.test(trimmed)) return `http://${trimmed}`;

  const resolvedPath = path.resolve(process.cwd(), trimmed);
  if (fs.existsSync(resolvedPath) && fs.statSync(resolvedPath).isDirectory()) {
    return pathToFileURL(path.join(resolvedPath, "index.html")).href;
  }
  return pathToFileURL(resolvedPath).href;
}

function targetFromBaseUrl(baseUrl) {
  try {
    const parsed = new URL(baseUrl);
    if (parsed.protocol === "file:") return "local-file";
    if (["localhost", "127.0.0.1", "::1"].includes(parsed.hostname)) return "local";
    return parsed.hostname;
  } catch (error) {
    return "target";
  }
}

function sanitizeFilename(value) {
  const fallback = `audit-${Date.now()}.pdf`;
  const basename = path.basename(String(value || fallback));
  const sanitized = basename.replace(/[^A-Za-z0-9._-]+/g, "-").replace(/^-+|-+$/g, "");
  return sanitized || fallback;
}

function uniquePath(filePath) {
  if (!fs.existsSync(filePath)) return filePath;
  const ext = path.extname(filePath);
  const base = filePath.slice(0, filePath.length - ext.length);
  return `${base}-${new Date().toISOString().replace(/[:.]/g, "")}${ext}`;
}

async function firstVisible(page, candidates, label, timeoutMs) {
  const errors = [];
  for (const candidate of candidates) {
    const locator = candidate();
    try {
      await locator.waitFor({ state: "visible", timeout: Math.min(timeoutMs, 7000) });
      return locator;
    } catch (error) {
      errors.push(error.message);
    }
  }
  throw new Error(`Could not find visible ${label}. Tried ${candidates.length} locator(s).\n${errors.join("\n")}`);
}

async function waitForAuditReady(page, timeoutMs) {
  await page.waitForFunction(
    () => {
      const status = document.querySelector("#audit-status")?.textContent || "";
      const link = document.querySelector("#audit-download");
      return /audit ready/i.test(status) && link && !link.hidden && link.href && link.getAttribute("download");
    },
    null,
    { timeout: timeoutMs },
  );
}

function verifyPdfFile(pdfPath) {
  const stat = fs.statSync(pdfPath);
  if (stat.size < 1024) throw new Error(`Downloaded PDF is unexpectedly small: ${stat.size} bytes`);

  const fd = fs.openSync(pdfPath, "r");
  try {
    const header = Buffer.alloc(5);
    fs.readSync(fd, header, 0, header.length, 0);
    if (header.toString("utf8") !== "%PDF-") {
      throw new Error(`Downloaded file does not start with %PDF-: ${pdfPath}`);
    }
  } finally {
    fs.closeSync(fd);
  }

  return stat.size;
}

async function run() {
  const args = parseArgs(process.argv.slice(2));
  const baseUrlInput = readOption(args, "base-url", "BASE_URL");
  const searchId = readOption(args, "search-id", "SEARCH_ID");

  if (!baseUrlInput || !searchId) {
    console.error(usage());
    process.exit(1);
  }

  const baseUrl = normalizeBaseUrl(baseUrlInput);
  const timeoutMs = parsePositiveInt(readOption(args, "timeout-ms", "TIMEOUT_MS"), DEFAULT_TIMEOUT_MS);
  const headless = parseBool(readOption(args, "headless", "HEADLESS"), false);
  const slowMo = parsePositiveInt(readOption(args, "slow-mo-ms", "SLOW_MO_MS"), headless ? 0 : 50);
  const keyDelay = parsePositiveInt(readOption(args, "key-delay-ms", "KEY_DELAY_MS"), DEFAULT_KEY_DELAY_MS);
  const screenshotEnabled = parseBool(readOption(args, "screenshot", "SCREENSHOT"), true);
  const targetName = slug(readOption(args, "target", "TARGET_NAME") || targetFromBaseUrl(baseUrl));
  const downloadDir = path.resolve(__dirname, `downloads-${targetName}`);
  fs.mkdirSync(downloadDir, { recursive: true });

  const browser = await chromium.launch({ headless, slowMo });
  const context = await browser.newContext({
    acceptDownloads: true,
    viewport: { width: 1440, height: 1050 },
  });
  const page = await context.newPage();

  page.on("dialog", async (dialog) => {
    if (/audit trail/i.test(dialog.message())) {
      await dialog.accept();
    } else {
      await dialog.dismiss();
    }
  });

  try {
    await page.goto(baseUrl, { waitUntil: "domcontentloaded", timeout: timeoutMs });
    await page.waitForLoadState("networkidle", { timeout: timeoutMs }).catch(() => {});
    await page.waitForFunction(
      () => {
        const label = document.querySelector("#confidence-label")?.textContent || "";
        return !/loading evidence/i.test(label);
      },
      null,
      { timeout: timeoutMs },
    ).catch(() => {});

    const searchInput = await firstVisible(
      page,
      [
        () => page.locator("#search-input"),
        () => page.locator("input[type='search']").first(),
        () => page.getByPlaceholder(/search tx|stake|address|label/i),
      ],
      "search input",
      timeoutMs,
    );

    await searchInput.click({ delay: 75 });
    await page.keyboard.press(process.platform === "darwin" ? "Meta+A" : "Control+A");
    await page.keyboard.press("Backspace");
    await page.keyboard.type(searchId, { delay: keyDelay });
    await page.waitForTimeout(300);

    const auditButton = await firstVisible(
      page,
      [
        () => page.locator("#audit-button"),
        () => page.getByRole("button", { name: /^audit$/i }),
      ],
      "Audit button",
      timeoutMs,
    );

    await auditButton.click({ delay: 90 });

    const dialog = page.locator("#audit-dialog[open]");
    await dialog.waitFor({ state: "visible", timeout: 5000 }).catch(() => {});
    const dialogText = await page.locator("#audit-dialog-text").textContent({ timeout: 5000 }).catch(() => "");
    if (dialogText && !dialogText.includes(searchId)) {
      throw new Error(`Audit dialog did not include the searched ID. Dialog text: ${dialogText}`);
    }

    const alreadyReady = await page
      .waitForFunction(
        () => {
          const status = document.querySelector("#audit-status")?.textContent || "";
          return /audit ready/i.test(status);
        },
        null,
        { timeout: 750 },
      )
      .then(() => true)
      .catch(() => false);

    if (!alreadyReady) {
      const confirmButton = await firstVisible(
        page,
        [
          () => page.locator("#audit-confirm"),
          () => page.getByRole("button", { name: /^(yes|confirm|create)$/i }),
        ],
        "audit confirmation button",
        timeoutMs,
      );
      await confirmButton.click({ delay: 90 });
    }

    await waitForAuditReady(page, timeoutMs);

    const downloadLink = await firstVisible(
      page,
      [
        () => page.locator("#audit-download"),
        () => page.getByRole("link", { name: /download audit pdf/i }),
      ],
      "audit download link",
      timeoutMs,
    );

    const screenshotPath = screenshotEnabled
      ? path.join(downloadDir, `audit-ready-${new Date().toISOString().replace(/[:.]/g, "")}.png`)
      : "";
    if (screenshotEnabled) {
      await page.screenshot({ path: screenshotPath, fullPage: true });
    }

    const [download] = await Promise.all([
      page.waitForEvent("download", { timeout: timeoutMs }),
      downloadLink.click({ delay: 90 }),
    ]);

    const suggested = sanitizeFilename(download.suggestedFilename());
    const pdfPath = uniquePath(path.join(downloadDir, suggested.endsWith(".pdf") ? suggested : `${suggested}.pdf`));
    await download.saveAs(pdfPath);
    const bytes = verifyPdfFile(pdfPath);

    console.log(
      JSON.stringify(
        {
          baseUrl,
          targetName,
          searchId,
          downloadDir,
          pdfPath,
          bytes,
          screenshotPath: screenshotPath || null,
        },
        null,
        2,
      ),
    );
  } finally {
    await context.close();
    await browser.close();
  }
}

run().catch((error) => {
  console.error(error.stack || error.message || String(error));
  process.exit(1);
});
