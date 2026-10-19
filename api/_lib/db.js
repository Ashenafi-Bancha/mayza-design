// PostgreSQL connection pool, shared across requests (and kept warm between
// invocations when running as a Vercel function).
const { Pool } = require("pg");

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

module.exports = { q, getPool, configured };
