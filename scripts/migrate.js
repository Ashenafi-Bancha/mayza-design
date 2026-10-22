// Creates or updates the database: the base schema, then every numbered migration
// in api/_lib/migrations that has not run yet (each in its own transaction).
//   npm run migrate        (reads DATABASE_URL from .env or the environment)
require("dotenv").config();
const fs = require("fs");
const path = require("path");
const db = require("../api/_lib/db");

const LIB = path.join(__dirname, "..", "api", "_lib");

// Creates the database named in DATABASE_URL if it does not exist yet (local setups).
async function ensureDatabase() {
  try {
    await db.q("select 1");
  } catch (err) {
    if (err.code !== "3D000") throw err; // 3D000: database does not exist
    const { Client } = require("pg");
    const url = new URL(process.env.DATABASE_URL);
    const name = decodeURIComponent(url.pathname.slice(1));
    if (!/^[\w-]+$/.test(name)) throw new Error(`Create the database "${name}" first.`);
    url.pathname = "/postgres";
    const admin = new Client({ connectionString: url.toString() });
    await admin.connect();
    await admin.query(`create database "${name}"`);
    await admin.end();
    console.log(`Created database "${name}".`);
  }
}

async function migrate({ quiet = false } = {}) {
  await ensureDatabase();
  await db.q(fs.readFileSync(path.join(LIB, "schema.sql"), "utf8"));
  await db.q("create table if not exists schema_migrations (name text primary key, applied_at timestamptz not null default now())");
  const done = new Set((await db.q("select name from schema_migrations")).rows.map((r) => r.name));
  const files = fs.readdirSync(path.join(LIB, "migrations")).filter((f) => f.endsWith(".sql")).sort();
  for (const file of files) {
    if (done.has(file)) continue;
    const client = await db.getPool().connect();
    try {
      await client.query("begin");
      await client.query(fs.readFileSync(path.join(LIB, "migrations", file), "utf8"));
      await client.query("insert into schema_migrations (name) values ($1)", [file]);
      await client.query("commit");
      if (!quiet) console.log(`Applied ${file}`);
    } catch (err) {
      await client.query("rollback");
      throw new Error(`${file}: ${err.message}`);
    } finally {
      client.release();
    }
  }
}

module.exports = { migrate };

if (require.main === module) {
  (async () => {
    if (!db.configured()) {
      console.error("Set DATABASE_URL first, for example in a .env file (see .env.example).");
      process.exit(1);
    }
    try {
      await migrate();
      const { rows } = await db.q("select (select count(*) from products)::int as products, (select count(*) from admins)::int as admins");
      console.log(`Database ready. ${rows[0].products} products, ${rows[0].admins} staff account(s).`);
      if (!rows[0].admins) console.log("Next: create the owner's login with  npm run create-admin");
    } catch (err) {
      console.error("Migration failed:", err.message);
      process.exitCode = 1;
    } finally {
      await db.close();
    }
  })();
}
