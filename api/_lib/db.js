// PostgreSQL connection pool, shared across requests (and kept warm between
// invocations when running as a Vercel function).
const { Pool, types } = require("pg");

// Keep calendar dates (due dates, event dates) as "2026-12-31" text: turning them
// into JavaScript times would shift them by the server's time zone.
types.setTypeParser(1082, (v) => v);

let pool;

function configured() {
  const url = process.env.DATABASE_URL || "";
  return Boolean(url) && !url.includes("YOUR_PASSWORD"); // the .env placeholder means "not set up yet"
}

function getPool() {
  if (!configured()) {
    const err = new Error("The database is not connected yet.");
    err.status = 503;
    throw err;
  }
  if (!pool) {
    const url = process.env.DATABASE_URL;
    const local = /@(localhost|127\.0\.0\.1)(:|\/)/.test(url) || process.env.PGSSL === "off";
    pool = new Pool({
      connectionString: url,
      ssl: local ? false : { rejectUnauthorized: process.env.PGSSL !== "no-verify" },
      max: Number(process.env.PG_POOL_MAX || 3),
      idleTimeoutMillis: 10000,
    });
    // An idle connection dropped by the database (restart, network blip) must not crash the server.
    pool.on("error", (err) => console.error("PostgreSQL connection lost:", err.message));
  }
  return pool;
}

const q = (text, params) => getPool().query(text, params);

// Runs fn(client) inside a transaction; rolls back if it throws.
async function tx(fn) {
  const client = await getPool().connect();
  try {
    await client.query("begin");
    const out = await fn(client);
    await client.query("commit");
    return out;
  } catch (err) {
    await client.query("rollback").catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}

// Ends the pool (scripts and tests) so the process can exit.
async function close() {
  if (pool) { await pool.end(); pool = null; }
}

module.exports = { q, query: q, tx, getPool, close, configured };
