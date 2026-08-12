#!/usr/bin/env node
/**
 * Mobile Lighthouse gate for The Artist Post.
 *
 * Usage:
 *   pnpm lighthouse:mobile
 *   LH_BASE_URL=http://127.0.0.1:3000 pnpm lighthouse:mobile
 *   pnpm lighthouse:mobile -- --gate   # exit 1 if SEO/A11y/BP < 95 or Perf < 80
 *
 * Start the app first (`pnpm build && pnpm start -- -p 3000`) or point LH_BASE_URL
 * at staging (e.g. https://theartistpost.fluxlab.agency).
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import lighthouse from "lighthouse";
import * as chromeLauncher from "chrome-launcher";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const outDir = path.join(root, "lighthouse-reports");
const tmpDir = path.join(root, ".lh-tmp");
const gate = process.argv.includes("--gate");
const base = (process.env.LH_BASE_URL ?? "http://127.0.0.1:3000").replace(
  /\/$/,
  "",
);

fs.mkdirSync(outDir, { recursive: true });
fs.mkdirSync(tmpDir, { recursive: true });

const urls = [
  ["home", `${base}/`],
  ["explore", `${base}/explore`],
  ["kindness", `${base}/kindness-always`],
];

const THRESHOLDS = {
  performance: 80,
  accessibility: 95,
  "best-practices": 95,
  seo: 95,
};

const flags = {
  onlyCategories: ["performance", "accessibility", "best-practices", "seo"],
  formFactor: "mobile",
  screenEmulation: {
    mobile: true,
    width: 412,
    height: 823,
    deviceScaleFactor: 1.75,
    disabled: false,
  },
  throttlingMethod: "simulate",
  output: "json",
};

async function runOne(name, url, port) {
  const result = await lighthouse(url, { ...flags, port });
  if (!result) throw new Error(`No result for ${url}`);
  const outPath = path.join(outDir, `${name}.json`);
  fs.writeFileSync(outPath, result.report);
  const cats = result.lhr.categories;
  const scores = Object.fromEntries(
    Object.entries(cats).map(([k, v]) => [k, Math.round((v?.score ?? 0) * 100)]),
  );
  console.log(name, scores);
  return { name, url, scores, lhr: result.lhr };
}

function failures(scores) {
  return Object.entries(THRESHOLDS).flatMap(([key, min]) => {
    const score = scores[key] ?? 0;
    return score < min ? [{ category: key, score, min }] : [];
  });
}

async function main() {
  console.log(`Lighthouse mobile → ${base}${gate ? " (gated)" : ""}`);
  const chrome = await chromeLauncher.launch({
    chromeFlags: ["--headless=new", "--no-sandbox", "--disable-gpu"],
    userDataDir: tmpDir,
    ignoreDefaultFlags: false,
  });

  try {
    const results = [];
    for (const [name, url] of urls) {
      results.push(await runOne(name, url, chrome.port));
    }

    const summary = {
      at: new Date().toISOString(),
      base,
      thresholds: THRESHOLDS,
      results: results.map(({ name, url, scores }) => ({
        name,
        url,
        scores,
        failures: failures(scores),
      })),
    };
    fs.writeFileSync(
      path.join(outDir, "summary.json"),
      JSON.stringify(summary, null, 2),
    );

    const home = results.find((r) => r.name === "home");
    if (home) {
      const failed = Object.values(home.lhr.audits)
        .filter(
          (a) =>
            a.score !== null &&
            a.score < 0.9 &&
            a.details?.type !== "debugdata",
        )
        .sort((a, b) => (a.score ?? 0) - (b.score ?? 0))
        .slice(0, 20)
        .map((a) => ({
          id: a.id,
          score: a.score,
          title: a.title,
          displayValue: a.displayValue,
        }));
      console.log("HOME_TOP_ISSUES", JSON.stringify(failed, null, 2));
    }

    if (gate) {
      const allFails = summary.results.flatMap((r) =>
        r.failures.map((f) => ({ page: r.name, ...f })),
      );
      if (allFails.length) {
        console.error("LIGHTHOUSE_GATE_FAILED", JSON.stringify(allFails, null, 2));
        process.exitCode = 1;
      } else {
        console.log("LIGHTHOUSE_GATE_PASSED");
      }
    }
  } finally {
    try {
      await chrome.kill();
    } catch (e) {
      console.warn("chrome.kill ignored:", e?.message ?? e);
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
