// API tests: sign-in and two-step codes, role permissions, manual orders,
// status changes, payments and the website order form.
//   TEST_DATABASE_URL=postgres://... npm test
const { test, before, after, describe } = require("node:test");
const assert = require("node:assert");
const { db, resetDb, start, stop, makeStaff, Client } = require("./helpers");
const totp = require("../api/_lib/totp");

let owner, manager, editor, tailor, tailor2;
const as = {};

before(async () => {
  await resetDb();
  await start();
  owner = await makeStaff("owner");
  manager = await makeStaff("manager");
  editor = await makeStaff("editor");
  tailor = await makeStaff("tailor");
  tailor2 = await makeStaff("tailor", "tailor2@test.local");
  for (const [k, who] of Object.entries({ manager, editor, tailor, tailor2 })) {
    as[k] = new Client();
    await as[k].login(who.email);
  }
});
after(stop);

describe("sign-in", () => {
  test("wrong password is refused", async () => {
    const r = await new Client().post("/api/auth/login", { email: "manager@test.local", password: "nope" });
    assert.equal(r.status, 401);
  });

  test("admin routes need a session", async () => {
    const r = await new Client().get("/api/admin/orders");
    assert.equal(r.status, 401);
  });

  test("changes without the CSRF token are refused", async () => {
    const r = await as.manager.req("POST", "/api/admin/clients", { full_name: "X" }, { "x-csrf-token": "wrong-token-wrong-token-wrong-to" });
    assert.equal(r.status, 403);
    assert.equal(r.data.code, "csrf");
  });

  test("two-step sign-in can be made compulsory for the owner", async () => {
    process.env.REQUIRE_OWNER_2FA = "true";
    try {
      const c = new Client();
      const first = await c.login(owner.email);
      assert.equal(first.user.needs_2fa_setup, true);
      assert.equal((await c.get("/api/admin/orders")).status, 403);
    } finally {
      delete process.env.REQUIRE_OWNER_2FA;
    }
  });

  test("two-step sign-in is optional; once turned on, sign-in needs a code", async () => {
    const c = new Client();
    const first = await c.login(owner.email);
    assert.equal(first.user.needs_2fa_setup, false);
    assert.equal((await c.get("/api/admin/orders")).status, 200);

    const setup = await c.post("/api/auth/2fa/setup");
    assert.equal(setup.status, 200);
    assert.match(setup.data.qr, /<svg/);
    assert.equal((await c.post("/api/auth/2fa/enable", { code: "000000" })).status, 400);
    const on = await c.post("/api/auth/2fa/enable", { code: totp.codeAt(setup.data.secret, Math.floor(Date.now() / 30000)) });
    assert.equal(on.status, 200);
    assert.equal(on.data.user.totp_enabled, true);

    const fresh = new Client();
    const step1 = await fresh.post("/api/auth/login", { email: owner.email, password: "password123" });
    assert.deepEqual(step1.data, { mfa: true });
    assert.equal((await fresh.get("/api/admin/orders")).status, 401);
    assert.equal((await fresh.post("/api/auth/totp", { code: "123456" })).status, 401);
    const step2 = await fresh.post("/api/auth/totp", { code: totp.codeAt(setup.data.secret, Math.floor(Date.now() / 30000)) });
    assert.equal(step2.status, 200);
    assert.equal((await fresh.get("/api/admin/orders")).status, 200);
    as.owner = fresh;
  });
});

describe("roles", () => {
  test("content editors cannot see orders, clients or the activity log", async () => {
    for (const p of ["/api/admin/orders", "/api/admin/clients", "/api/admin/activity", "/api/admin/staff"]) {
      assert.equal((await as.editor.get(p)).status, 403, p);
    }
    assert.equal((await as.editor.get("/api/admin/products")).status, 200);
  });

  test("managers cannot manage staff, settings or see the activity log", async () => {
    assert.equal((await as.manager.get("/api/admin/staff")).status, 403);
    assert.equal((await as.manager.get("/api/admin/activity")).status, 403);
    assert.equal((await as.manager.put("/api/admin/settings", {})).status, 403);
    assert.equal((await as.manager.post("/api/admin/collections", { name_en: "X" })).status, 403);
  });

  test("tailors cannot create orders or see clients", async () => {
    assert.equal((await as.tailor.get("/api/admin/clients")).status, 403);
    assert.equal((await as.tailor.post("/api/admin/orders", {})).status, 403);
  });

  test("a disabled account is signed out", async () => {
    const temp = await makeStaff("manager", "temp@test.local");
    const c = new Client();
    await c.login(temp.email);
    const r = await as.owner.put(`/api/admin/staff/${temp.id}`, { email: temp.email, name: "Temp", role: "manager", active: false });
    assert.equal(r.status, 200);
    assert.equal((await c.get("/api/admin/orders")).status, 401);
  });

  test("the last owner cannot be demoted", async () => {
    const r = await as.owner.put(`/api/admin/staff/${owner.id}`, { email: owner.email, name: "Owner", role: "manager", active: true });
    assert.equal(r.status, 400);
  });
});

let orderId;
let orderNumber;
let clientId;

describe("manual orders", () => {
  test("a phone order with a new client, payments and saved measurements", async () => {
    const r = await as.manager.post("/api/admin/orders", {
      client: { full_name: "Hanna Tesfaye", phone: "0911 234 567", telegram: "hanna_t" },
      source: "phone", type: "custom", priority: "vip", status: "confirmed",
      notes: "White dress with a red woven band", preferences: "Cotton, ivory", occasion: "Wedding",
      event_date: "2026-12-20", needed_by: "2026-12-10",
      measurements: { chest: "92", waist: "74", hip: "" },
      save_measurements: true, measurement_label: "Wedding dress",
      assigned_to: tailor.id, price: 18000,
      payments: [{ amount: 5000, method: "telebirr" }, { amount: 3000, method: "cash", note: "second visit" }],
    });
    assert.equal(r.status, 201, JSON.stringify(r.data));
    assert.match(r.data.number, /^ORD-\d{4}-0001$/);
    assert.equal(r.data.status, "confirmed");
    assert.equal(r.data.paid, 8000);
    assert.equal(r.data.balance, 10000);
    assert.equal(r.data.payment_status, "deposit");
    assert.deepEqual(r.data.measurements, { chest: "92", waist: "74" });
    orderId = r.data.id;
    orderNumber = r.data.number;
    clientId = r.data.client_id;

    const detail = await as.manager.get(`/api/admin/orders/${orderId}`);
    assert.equal(detail.data.events[0].body, "Created by Manager via phone call");
    assert.equal(detail.data.payments.length, 2);

    const profile = await as.manager.get(`/api/admin/clients/${clientId}`);
    assert.equal(profile.data.orders.length, 1);
    assert.equal(profile.data.measurements[0].label, "Wedding dress");

    const { rows } = await db.q("select summary from activity_log where action = 'order.create'");
    assert.match(rows[0].summary, /via phone call/);
  });

  test("order numbers count up", async () => {
    const r = await as.manager.post("/api/admin/orders", { client_id: clientId, source: "walk-in" });
    assert.equal(r.status, 201);
    assert.equal(r.data.number, orderNumber.replace(/0001$/, "0002"));
    assert.equal(r.data.status, "new");
  });

  test("a client or a new client is required", async () => {
    const r = await as.manager.post("/api/admin/orders", { source: "phone" });
    assert.equal(r.status, 400);
  });

  test("the duplicate phone check finds the client in any format", async () => {
    const r = await as.manager.get("/api/admin/clients/check-phone?phone=%2B251911234567");
    assert.equal(r.data.length, 1);
    assert.equal(r.data[0].full_name, "Hanna Tesfaye");
  });

  test("the inbox finds orders by phone and by name", async () => {
    assert.equal((await as.manager.get("/api/admin/orders?q=0911234")).data.length, 2);
    assert.equal((await as.manager.get("/api/admin/orders?q=hanna&status=confirmed")).data.length, 1);
    assert.equal((await as.manager.get("/api/admin/orders?source=telegram")).data.length, 0);
  });

  test("duplicate an order", async () => {
    const r = await as.manager.post(`/api/admin/orders/${orderId}/duplicate`);
    assert.equal(r.status, 201);
    assert.equal(r.data.status, "new");
    assert.equal(r.data.paid, 0);
    assert.equal(r.data.notes, "White dress with a red woven band");
  });

  test("editing logs what changed", async () => {
    const cur = (await as.manager.get(`/api/admin/orders/${orderId}`)).data;
    const r = await as.manager.put(`/api/admin/orders/${orderId}`, { ...cur, needed_by: "2026-12-12", price: 19000 });
    assert.equal(r.status, 200);
    const detail = await as.manager.get(`/api/admin/orders/${orderId}`);
    const edit = detail.data.events.find((e) => e.kind === "edit");
    assert.match(edit.body, /due date/);
    assert.match(edit.body, /price/);
  });
});

describe("status changes", () => {
  test("a manager moves an order through the pipeline and gets notify links", async () => {
    const r = await as.manager.post(`/api/admin/orders/${orderId}/status`, { status: "in_production", note: "Fabric cut", notify: true });
    assert.equal(r.status, 200);
    assert.equal(r.data.order.status, "in_production");
    assert.match(r.data.notify.whatsapp, /^https:\/\/wa\.me\/251911234567\?text=/);
    assert.equal(r.data.notify.telegram, "https://t.me/hanna_t");
    const detail = await as.manager.get(`/api/admin/orders/${orderId}`);
    const ev = detail.data.events.find((e) => e.kind === "status");
    assert.equal(ev.from_status, "confirmed");
    assert.equal(ev.to_status, "in_production");
  });

  test("tailors only see their own orders in production, without money or phone", async () => {
    const mine = await as.tailor.get("/api/admin/orders");
    assert.equal(mine.data.length, 1);
    assert.equal(mine.data[0].price, undefined);
    assert.equal(mine.data[0].phone, undefined);
    assert.equal((await as.tailor2.get("/api/admin/orders")).data.length, 0);
    assert.equal((await as.tailor2.get(`/api/admin/orders/${orderId}`)).status, 404);
    const detail = await as.tailor.get(`/api/admin/orders/${orderId}`);
    assert.equal(detail.data.payments, undefined);
    assert.ok(detail.data.events.every((e) => e.kind !== "payment"));
  });

  test("tailors can mark ready but cannot deliver or record payments", async () => {
    assert.equal((await as.tailor.post(`/api/admin/orders/${orderId}/status`, { status: "delivered" })).status, 403);
    assert.equal((await as.tailor.post(`/api/admin/orders/${orderId}/payments`, { amount: 100 })).status, 403);
    const r = await as.tailor.post(`/api/admin/orders/${orderId}/status`, { status: "ready" });
    assert.equal(r.status, 200);
    assert.equal((await as.tailor.post(`/api/admin/orders/${orderId}/notes`, { body: "Hem finished" })).status, 201);
  });

  test("payments update the balance and status", async () => {
    const r = await as.manager.post(`/api/admin/orders/${orderId}/payments`, { amount: 11000, method: "bank" });
    assert.equal(r.status, 201);
    assert.equal(r.data.payment_status, "paid");
    assert.equal(r.data.balance, 0);
  });

  test("unknown statuses are refused", async () => {
    assert.equal((await as.manager.post(`/api/admin/orders/${orderId}/status`, { status: "lost" })).status, 400);
  });
});

describe("website", () => {
  test("a website order gets a number, a client and a timeline", async () => {
    const c = new Client();
    const r = await c.post("/api/orders", { name: "Abel Girma", phone: "0966 789 012", garment: "cultural", measurements: { chest: "100" } });
    assert.equal(r.status, 201);
    assert.match(r.data.ref, /^ORD-\d{4}-\d{4}$/);
    const { rows } = await db.q("select o.source, c.full_name from orders o join clients c on c.id = o.client_id where o.number = $1", [r.data.ref]);
    assert.equal(rows[0].source, "website");
    assert.equal(rows[0].full_name, "Abel Girma");
  });

  test("a website order from a known phone joins the existing client", async () => {
    const r = await new Client().post("/api/orders", { name: "Hanna T.", phone: "+251 911 234 567" });
    const { rows } = await db.q("select client_id from orders where number = $1", [r.data.ref]);
    assert.equal(rows[0].client_id, clientId);
  });

  test("the tracker records a visit and its source", async () => {
    const r = await new Client().post("/api/track", { path: "/", ref: "https://l.instagram.com/x", visit: true });
    assert.equal(r.status, 204);
    const { rows } = await db.q("select source from page_views");
    assert.equal(rows[0].source, "instagram");
  });

  test("the dashboard shows each role its own blocks", async () => {
    const m = (await as.manager.get("/api/admin/dashboard")).data;
    assert.ok(m.new_inquiries && m.stats && m.money);
    const e = (await as.editor.get("/api/admin/dashboard")).data;
    assert.equal(e.new_inquiries, undefined);
    assert.ok(e.stats && e.catalog);
    const t = (await as.tailor.get("/api/admin/dashboard")).data;
    assert.equal(t.stats, undefined);
    assert.ok(Array.isArray(t.my_work));
  });

  test("the owner can read the activity log", async () => {
    const r = await as.owner.get("/api/admin/activity");
    assert.equal(r.status, 200);
    assert.ok(r.data.some((a) => a.action === "order.status"));
  });
});
