/**
 * Ping /health on an interval to reduce Render free-tier sleep.
 *
 * Usage:
 *   HEALTH_URL=https://your-api.onrender.com/health node scripts/keep-alive.js
 *
 * Or set KEEP_ALIVE_URL. Interval defaults to 10 minutes (Render sleeps ~15m idle).
 * Prefer an external cron (UptimeRobot / cron-job.org) in production so this
 * does not depend on a local process.
 */
const url = process.env.HEALTH_URL || process.env.KEEP_ALIVE_URL;
const intervalMs = Number(process.env.KEEP_ALIVE_INTERVAL_MS || 10 * 60 * 1000);

if (!url) {
  console.error('Set HEALTH_URL (e.g. https://carehub-backend-rh3r.onrender.com/health)');
  process.exit(1);
}

const ping = async () => {
  const started = Date.now();
  try {
    const res = await fetch(url, { method: 'GET', cache: 'no-store' });
    const ms = Date.now() - started;
    console.log(`[keep-alive] ${new Date().toISOString()} ${res.status} ${ms}ms`);
  } catch (err) {
    console.error(`[keep-alive] ${new Date().toISOString()} failed:`, err.message);
  }
};

console.log(`[keep-alive] pinging ${url} every ${intervalMs / 1000}s`);
void ping();
setInterval(ping, intervalMs);
