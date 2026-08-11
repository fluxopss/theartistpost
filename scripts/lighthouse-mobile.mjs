import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import lighthouse from "lighthouse";
import * as chromeLauncher from "chrome-launcher";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const outDir = path.join(root, "lighthouse-reports");
const tmpDir = path.join(root, ".lh-tmp");

fs.mkdirSync(outDir, { recursive: true });
fs.mkdirSync(tmpDir, { recursive: true });

const urls = [
  ["home", "http://127.0.0.1:3013/"],
  ["explore", "http://127.0.0.1:3013/explore"],
  ["kindness", "http://127.0.0.1:3013/kindness-always"],
];

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
  return { name, scores, lhr: result.lhr };
}

async function main() {
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
      results: results.map(({ name, scores }) => ({ name, scores })),
    };
    fs.writeFileSync(
      path.join(outDir, "summary.json"),
      JSON.stringify(summary, null, 2),
    );

    // Print top failing audits for home
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
