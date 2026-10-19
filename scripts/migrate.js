// Creates or updates the database tables and adds the starting collection.
//   npm run migrate        (reads DATABASE_URL from .env or the environment)
require("dotenv").config();
const fs = require("fs");
const path = require("path");
const db = require("../api/_lib/db");

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

(async () => {
  if (!db.configured()) {
    console.error("Set DATABASE_URL first, for example in a .env file (see .env.example).");
    process.exit(1);
  }
  const sql = fs.readFileSync(path.join(__dirname, "..", "api", "_lib", "schema.sql"), "utf8");
  try {
    await ensureDatabase();
    await db.q(sql);
    const { rows } = await db.q("select (select count(*) from products)::int as products, (select count(*) from admins)::int as admins");
    console.log(`Database ready. ${rows[0].products} products, ${rows[0].admins} admin account(s).`);
    if (!rows[0].admins) console.log("Next: create the owner's login with  npm run create-admin");
  } catch (err) {
    console.error("Migration failed:", err.message);
    process.exitCode = 1;
  } finally {
    await db.getPool().end();
  }
})();
