// Test helpers: a fresh database, a running API and a tiny cookie-keeping client.
// Tests need TEST_DATABASE_URL pointing at a database they are allowed to wipe.
const assert = require("node:assert");

const url = process.env.TEST_DATABASE_URL;
if (!url) {
  console.error("Set TEST_DATABASE_URL to a throwaway database, e.g. postgres://user@localhost:5432/mayza_test");
  process.exit(1);
}
process.env.DATABASE_URL = url;
process.env.JWT_SECRET = process.env.JWT_SECRET || "test-secret-test-secret-test-secret-1234";
process.env.NODE_ENV = "test";

const db = require("../api/_lib/db");
const auth = require("../api/_lib/auth");
const { migrate } = require("../scripts/migrate");
const app = require("../api/_lib/app");

async function resetDb() {
  await db.q("drop schema public cascade; create schema public;");
  await migrate({ quiet: true });
}

let server;
let base;
async function start() {
  await new Promise((resolve) => { server = app.listen(0, "127.0.0.1", resolve); });
  base = `http://127.0.0.1:${server.address().port}`;
}
async function stop() {
  if (server) await new Promise((resolve) => server.close(resolve));
  await db.close();
}

async function makeStaff(role, email = `${role}@test.local`, password = "password123") {
  const { rows } = await db.q("insert into admins (email, name, role, password_hash) values ($1, $2, $3, $4) returning *",
    [email, role[0].toUpperCase() + role.slice(1), role, await auth.hash(password)]);
  return rows[0];
}

// Keeps cookies and sends the CSRF header, like the admin page does.
class Client {
  constructor() { this.cookies = {}; }
  async req(method, path, body, headers = {}) {
    const h = { ...headers };
    if (body !== undefined && !Buffer.isBuffer(body)) h["content-type"] = "application/json";
    if (this.cookies.mz_csrf && !("x-csrf-token" in h)) h["x-csrf-token"] = this.cookies.mz_csrf;
    h.cookie = Object.entries(this.cookies).map(([k, v]) => `${k}=${v}`).join("; ");
    const res = await fetch(base + path, { method, headers: h, body: body === undefined ? undefined : Buffer.isBuffer(body) ? body : JSON.stringify(body) });
    for (const c of res.headers.getSetCookie()) {
      const [pair] = c.split(";");
      const i = pair.indexOf("=");
      const k = pair.slice(0, i);
      const v = pair.slice(i + 1);
      if (!v || /expires=Thu, 01 Jan 1970/i.test(c)) delete this.cookies[k]; else this.cookies[k] = v;
    }
    const type = res.headers.get("content-type") || "";
    const data = type.includes("json") ? await res.json() : await res.text();
    return { status: res.status, data, headers: res.headers };
  }
  get(p) { return this.req("GET", p); }
  post(p, b = {}) { return this.req("POST", p, b); }
  put(p, b = {}) { return this.req("PUT", p, b); }
  del(p) { return this.req("DELETE", p); }
  async login(email, password = "password123") {
    const r = await this.post("/api/auth/login", { email, password });
    assert.equal(r.status, 200, JSON.stringify(r.data));
    return r.data;
  }
}

module.exports = { db, auth, resetDb, start, stop, makeStaff, Client };
