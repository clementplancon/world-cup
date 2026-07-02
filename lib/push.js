// Web Push (Phase 2): stores browser push subscriptions on disk and sends
// notifications to the followers of a given team.
//
// Storage is a single JSON file (data/subscriptions.json) — no database, by
// design (see the plan). Each entry is a standard PushSubscription augmented
// with the team the user chose to follow:
//   { endpoint, keys: { p256dh, auth }, followedTeam }
//
// The subscription list lives on disk (not just in memory) so it survives a
// PM2 restart. It is read/written synchronously: the file is tiny and writes
// are rare (only on subscribe/unsubscribe or when pruning a dead endpoint), so
// the simplicity is worth more than async I/O here.
const fs = require("fs");
const path = require("path");
const webpush = require("web-push");

const DATA_DIR = path.join(__dirname, "..", "data");
const SUBSCRIPTIONS_PATH = path.join(DATA_DIR, "subscriptions.json");

let vapidConfigured = false;

// Wire up the VAPID identity once at startup. Without this web-push refuses to
// send anything. Returns false (and logs) when keys are missing so the caller
// can keep the rest of the server running with push simply disabled.
function configureWebPush({ publicKey, privateKey, contactEmail } = {}) {
  if (!publicKey || !privateKey) {
    console.warn("Web Push disabled: VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY not set.");
    vapidConfigured = false;
    return false;
  }
  webpush.setVapidDetails(contactEmail || "mailto:admin@example.com", publicKey, privateKey);
  vapidConfigured = true;
  return true;
}

function isConfigured() {
  return vapidConfigured;
}

// --- Persistence -----------------------------------------------------------

function loadSubscriptions() {
  try {
    if (fs.existsSync(SUBSCRIPTIONS_PATH)) {
      const parsed = JSON.parse(fs.readFileSync(SUBSCRIPTIONS_PATH, "utf8"));
      return Array.isArray(parsed) ? parsed : [];
    }
  } catch (err) {
    console.error("Could not read subscriptions.json:", err.message);
  }
  return [];
}

function saveSubscriptions(subscriptions) {
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(SUBSCRIPTIONS_PATH, JSON.stringify(subscriptions, null, 2));
  } catch (err) {
    console.error("Could not write subscriptions.json:", err.message);
  }
}

// --- Subscription management ------------------------------------------------

// Adds (or updates) a subscription. The endpoint is the unique identity of a
// browser push channel, so re-subscribing — e.g. after the user switches the
// team they follow — replaces the existing entry instead of duplicating it.
function addSubscription(sub) {
  if (!sub || !sub.endpoint || !sub.keys) return false;
  const subscriptions = loadSubscriptions();
  const filtered = subscriptions.filter((s) => s.endpoint !== sub.endpoint);
  filtered.push({
    endpoint: sub.endpoint,
    keys: sub.keys,
    followedTeam: sub.followedTeam || null,
  });
  saveSubscriptions(filtered);
  return true;
}

function removeSubscription(endpoint) {
  if (!endpoint) return false;
  const subscriptions = loadSubscriptions();
  const filtered = subscriptions.filter((s) => s.endpoint !== endpoint);
  if (filtered.length === subscriptions.length) return false;
  saveSubscriptions(filtered);
  return true;
}

// --- Sending ---------------------------------------------------------------

// Sends `payload` to every subscriber following `teamCode`. A dead endpoint
// (410 Gone / 404 Not Found) is pruned automatically so the list doesn't rot.
async function notifyTeamFollowers(teamCode, payload) {
  if (!vapidConfigured || !teamCode) return;

  const subscriptions = loadSubscriptions();
  const targets = subscriptions.filter((s) => s.followedTeam === teamCode);
  if (targets.length === 0) return;

  const body = JSON.stringify(payload);
  const deadEndpoints = [];

  await Promise.all(
    targets.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: sub.keys },
          body
        );
      } catch (err) {
        if (err && (err.statusCode === 410 || err.statusCode === 404)) {
          deadEndpoints.push(sub.endpoint);
        } else {
          console.error("Push send failed:", err && err.message ? err.message : err);
        }
      }
    })
  );

  if (deadEndpoints.length > 0) {
    const remaining = loadSubscriptions().filter((s) => !deadEndpoints.includes(s.endpoint));
    saveSubscriptions(remaining);
    console.log(`Pruned ${deadEndpoints.length} dead push subscription(s).`);
  }
}

module.exports = {
  configureWebPush,
  isConfigured,
  loadSubscriptions,
  saveSubscriptions,
  addSubscription,
  removeSubscription,
  notifyTeamFollowers,
};
