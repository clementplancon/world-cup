// OG image generation (Phase 3): periodically screenshots the live circular
// bracket so social shares (og:image / twitter:image) show an up-to-date board.
//
// Puppeteer loads the public front-end (SITE_URL), waits for the bracket to
// render, and captures just the #bracket SVG into public/og-image.png. The
// whole thing is wrapped so a failed run NEVER crashes the server and NEVER
// deletes the previous image — a stale-but-valid preview is better than none.
const fs = require("fs");
const path = require("path");
const puppeteer = require("puppeteer");

const PUBLIC_DIR = path.join(__dirname, "..", "public");
const OG_IMAGE_PATH = path.join(PUBLIC_DIR, "og-image.png");

// Screenshot to a temp file first, then atomically move it into place. That way
// a crawler can never catch a half-written PNG, and a failure mid-capture leaves
// the previous og-image.png untouched.
const OG_IMAGE_TMP_PATH = path.join(PUBLIC_DIR, ".og-image.tmp.png");

async function regenerateOgImage() {
  const siteUrl = process.env.SITE_URL;
  if (!siteUrl) {
    console.warn("OG image skipped: SITE_URL not set.");
    return false;
  }

  let browser;
  try {
    fs.mkdirSync(PUBLIC_DIR, { recursive: true });
    browser = await puppeteer.launch({
      // --no-sandbox is required to run Chromium as a service user on the VPS.
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
      headless: "new",
    });
    const page = await browser.newPage();
    await page.setViewport({ width: 1200, height: 1200, deviceScaleFactor: 1 });
    await page.goto(siteUrl, { waitUntil: "networkidle0", timeout: 30000 });
    // Wait for at least one match node to be drawn; swallow the timeout so we
    // still capture whatever rendered instead of aborting the whole run.
    await page
      .waitForSelector("#bracket .match-node", { timeout: 15000 })
      .catch(() => {});

    const el = await page.$("#bracket");
    if (!el) {
      console.warn("OG image skipped: #bracket element not found on page.");
      return false;
    }
    await el.screenshot({ path: OG_IMAGE_TMP_PATH });
    fs.renameSync(OG_IMAGE_TMP_PATH, OG_IMAGE_PATH);
    console.log("OG image regenerated at", OG_IMAGE_PATH);
    return true;
  } catch (err) {
    console.error("regenerateOgImage failed:", err && err.message ? err.message : err);
    // Clean up any partial temp file, but leave the previous og-image.png intact.
    try {
      if (fs.existsSync(OG_IMAGE_TMP_PATH)) fs.unlinkSync(OG_IMAGE_TMP_PATH);
    } catch (_) {
      /* ignore cleanup errors */
    }
    return false;
  } finally {
    if (browser) {
      try {
        await browser.close();
      } catch (_) {
        /* ignore close errors */
      }
    }
  }
}

module.exports = { regenerateOgImage, OG_IMAGE_PATH };
