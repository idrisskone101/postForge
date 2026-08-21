#!/usr/bin/env node
/**
 * Playwright driver for: control-postforge browser …
 */
import { mkdirSync, writeFileSync, readFileSync, existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { createRequire } from "node:module";
import { spawnSync } from "node:child_process";

const require = createRequire(import.meta.url);
const PW_DIR = "/tmp/postforge-verify-pw-pkg";
const STATE_DIR = process.env.POSTFORGE_VERIFY_STATE_DIR || "/tmp/postforge-verify-state";
const LAST_URL = `${STATE_DIR}/last-url.txt`;

function ensurePlaywright() {
  const local = `${PW_DIR}/node_modules/playwright`;
  if (!existsSync(local)) {
    mkdirSync(PW_DIR, { recursive: true });
    if (!existsSync(`${PW_DIR}/package.json`)) {
      writeFileSync(
        `${PW_DIR}/package.json`,
        JSON.stringify({ name: "postforge-verify-pw", private: true }, null, 2),
      );
    }
    const add = spawnSync("pnpm", ["add", "playwright@1.51.0"], {
      cwd: PW_DIR,
      stdio: "inherit",
    });
    if (add.status !== 0) {
      console.error("Failed to install playwright into", PW_DIR);
      process.exit(1);
    }
    const browsers = spawnSync("pnpm", ["exec", "playwright", "install", "chromium"], {
      cwd: PW_DIR,
      stdio: "inherit",
    });
    if (browsers.status !== 0) {
      console.error("Failed to install chromium for playwright");
      process.exit(1);
    }
  }
  return require(local);
}

function parseArgs(argv) {
  const out = { _: [], flags: {} };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith("--")) {
      const key = a.slice(2);
      const next = argv[i + 1];
      if (!next || next.startsWith("--")) out.flags[key] = true;
      else {
        out.flags[key] = next;
        i++;
      }
    } else out._.push(a);
  }
  return out;
}

function parseViewport(raw) {
  if (!raw || raw === true) return { width: 1440, height: 1024 };
  const m = String(raw).match(/^(\d+)x(\d+)$/);
  if (!m) throw new Error(`Bad viewport ${raw}; expected WxH`);
  return { width: Number(m[1]), height: Number(m[2]) };
}

async function launchBrowser(chromium) {
  try {
    return await chromium.launch({ headless: true, channel: "chrome" });
  } catch {
    return await chromium.launch({ headless: true });
  }
}

function locatorFor(page, flags) {
  const role = flags.role;
  const name = flags.name;
  if (role && name) return page.getByRole(role, { name: new RegExp(`^${escapeRe(name)}$`, "i") });
  if (flags.selector) return page.locator(String(flags.selector));
  if (name) return page.getByRole("link", { name: new RegExp(escapeRe(name), "i") });
  throw new Error("Need --role/--name or --selector");
}

function escapeRe(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function readLastUrl(baseUrl) {
  try {
    return readFileSync(LAST_URL, "utf8").trim() || `${baseUrl}/`;
  } catch {
    return `${baseUrl}/`;
  }
}

function writeLastUrl(url) {
  mkdirSync(STATE_DIR, { recursive: true });
  writeFileSync(LAST_URL, url);
}

async function main() {
  const raw = process.argv.slice(2);
  let baseUrl = process.env.POSTFORGE_VERIFY_BASE_URL || "http://127.0.0.1:3000";
  const filtered = [];
  for (let i = 0; i < raw.length; i++) {
    if (raw[i] === "--base-url") baseUrl = raw[++i];
    else filtered.push(raw[i]);
  }

  const cmd = filtered[0];
  const rest = filtered.slice(1);
  const { flags } = parseArgs(rest);
  const viewport = parseViewport(flags.viewport);

  if (!cmd || cmd === "help" || cmd === "--help") {
    console.log(`Usage:
  browser doctor
  browser goto <path>
  browser click --role <role> --name <name>
  browser fill --role <role> --name <name> --value <text>
  browser snapshot --aria --path <file>
  browser screenshot --path <file> [--viewport 1440x1024]
  browser resize --viewport 390x844`);
    return;
  }

  const { chromium } = ensurePlaywright();
  const browser = await launchBrowser(chromium);
  try {
    const page = await browser.newPage({ viewport });

    if (cmd === "doctor") {
      await page.goto(`${baseUrl}/`, { waitUntil: "networkidle", timeout: 90000 });
      await page.getByRole("navigation", { name: /Workspace navigation/i }).waitFor({ timeout: 30000 });
      // Brand link may be aria-hidden on one of two shell copies; navigation is the stable signal.
      const homeHeading = page.getByRole("heading", { name: /^Home$/i });
      await homeHeading.waitFor({ timeout: 15000 });
      writeLastUrl(page.url());
      console.log("browser doctor ok");
      return;
    }

    if (cmd === "goto") {
      const path = rest[0] || "/";
      const url = path.startsWith("http")
        ? path
        : `${baseUrl}${path.startsWith("/") ? path : `/${path}`}`;
      await page.goto(url, { waitUntil: "networkidle", timeout: 90000 });
      writeLastUrl(page.url());
      console.log(page.url());
      return;
    }

    await page.goto(readLastUrl(baseUrl), { waitUntil: "networkidle", timeout: 90000 });

    if (cmd === "click") {
      await locatorFor(page, flags).first().click({ timeout: 30000 });
      await page.waitForLoadState("networkidle").catch(() => {});
      writeLastUrl(page.url());
      console.log(page.url());
      return;
    }

    if (cmd === "fill") {
      if (flags.value === undefined) throw new Error("--value required");
      await locatorFor(page, flags).first().fill(String(flags.value), { timeout: 30000 });
      console.log("filled");
      return;
    }

    if (cmd === "snapshot") {
      if (!flags.path || flags.path === true) throw new Error("--path required");
      const out = resolve(String(flags.path));
      mkdirSync(dirname(out), { recursive: true });
      const aria = await page.locator("body").ariaSnapshot();
      writeFileSync(out, aria);
      console.log(out);
      return;
    }

    if (cmd === "screenshot") {
      if (!flags.path || flags.path === true) throw new Error("--path required");
      const out = resolve(String(flags.path));
      mkdirSync(dirname(out), { recursive: true });
      await page.screenshot({ path: out, fullPage: true });
      console.log(out);
      return;
    }

    if (cmd === "resize") {
      await page.setViewportSize(viewport);
      writeLastUrl(page.url());
      console.log(`resized ${viewport.width}x${viewport.height}`);
      return;
    }

    throw new Error(`Unknown browser command: ${cmd}`);
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
