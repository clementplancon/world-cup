window.WC2026_CONFIG = Object.assign(
  {
    // Keep the local JSON file until your Cloudflare Worker is ready, then
    // replace this with:
    // https://world-cup-data.<your-account>.workers.dev/bracket.json
    dataUrl: "./data/bracket.json",
  },
  window.WC2026_CONFIG || {}
);
