// One order: the "+ New Order" form (also used for editing) and the order page
// with its timeline, payments, photos, measurements and print sheet.
import { get, post, put, del, upload } from "../api.js";
import { t, money, num, fmtDay, fmtTime, ago, today, daysUntil } from "../i18n.js";
import { state, can, isTailor, STATUSES, SOURCES, TYPES, PRIORITIES, METHODS, MEASURES } from "../state.js";
import { $, $$, esc, I, pill, prio, dueBadge, payBadge, opts, toast, armDelete, busy, contactButtons, nameOf, initials } from "../ui.js";
import { on, go, route, rerender } from "../router.js";
import { changeStatus } from "./status.js";

const mLabel = (k) => (t("m_" + k) !== "m_" + k ? t("m_" + k) : k);
const productName = (p) => nameOf(p);

// ======================= form =======================
let F = null; // form state

function blankForm() {
  return {
    mode: "new", id: null, client: null, newClient: false,
    images: [], payments: [], savedMeasures: [], measurements: {}, extraKeys: [],
  };
}

function clientPicker() {
  if (F.client) {
    const c = F.client;
    return `<div class="picked-client">
      <span class="avatar">${esc(initials(c.full_name))}</span>
      <span><b>${esc(c.full_name)}${c.vip ? ` <span class="vip-dot">${I.star}</span>` : ""}</b><small>${esc(c.phone || "")}${c.order_count ? ` · ${t("ordersCount", { n: c.order_count })}` : ""}</small></span>
      <button class="btn ghost small" type="button" data-action="of-change-client">${t("change")}</button></div>`;
  }
  if (F.newClient) {
    return `<div class="grid-2">
        <label class="field"><span>${t("fullName")} *</span><input name="c_full_name" required autocomplete="off" value="${esc(F.draftClient?.full_name || "")}"></label>
        <label class="field"><span>${t("phone")} *</span><input name="c_phone" type="tel" required autocomplete="off" value="${esc(F.draftClient?.phone || "")}"><small class="dup-warn" id="dup-warn" hidden></small></label>
      </div>
      <div class="grid-3">
        <label class="field"><span>Telegram</span><input name="c_telegram" placeholder="@username" autocomplete="off"></label>
        <label class="field"><span>WhatsApp</span><input name="c_whatsapp" type="tel" placeholder="${t("sameAsPhone")}" autocomplete="off"></label>
        <label class="field"><span>${t("city")}</span><input name="c_city" autocomplete="off"></label>
      </div>
      <button class="link-btn" type="button" data-action="of-search-client">${I.search} ${t("findExisting")}</button>`;
  }
  return `<div class="typeahead">
      <label class="search-wrap wide">${I.search}<input class="search" id="client-q" type="search" placeholder="${t("searchClient")}" autocomplete="off" aria-label="${t("searchClient")}"></label>
      <div class="ta-results" id="client-results" role="listbox" hidden></div>
    </div>
    <button class="btn ghost small" type="button" data-action="of-new-client">${I.userPlus}${t("newClient")}</button>`;
}

function seg(name, list, val, label) {
  return `<div class="seg wrap" role="radiogroup">${list.map((v) => `<label><input type="radio" name="${name}" value="${esc(v)}" ${v === val ? "checked" : ""}><span>${label(v)}</span></label>`).join("")}</div>`;
}

function measureGrid() {
  const keys = [...MEASURES, ...F.extraKeys.filter((k) => !MEASURES.includes(k))];
  const saved = F.savedMeasures;
  return `${saved.length ? `<div class="saved-measures"><span class="label">${t("useSaved")}</span>${saved.map((m) => `<button class="chip" type="button" data-action="of-use-measure" data-id="${esc(m.id)}">${esc(m.label || t("measurements"))} · ${fmtDay(m.taken_on)}</button>`).join("")}</div>` : ""}
    <div class="measure-grid">${keys.map((k) => `<label class="field"><span>${esc(mLabel(k))}</span><input name="m_${esc(k)}" inputmode="decimal" value="${esc(F.measurements[k] || "")}" autocomplete="off"></label>`).join("")}
      <button class="add-measure" type="button" data-action="of-add-measure">${I.plus}${t("addMeasure")}</button></div>
    ${F.mode === "new" ? `<label class="check"><input type="checkbox" name="save_measurements" ${F.client || F.newClient ? "" : "disabled"}><span>${t("saveToClient")}<small>${t("saveToClientHint")}</small></span></label>
      <label class="field" style="max-width:320px"><span>${t("measureLabel")}</span><input name="measurement_label" placeholder="${t("measureLabelHint")}"></label>` : ""}`;
}

function imagesBlock() {
  return `<div class="thumbs" id="of-thumbs">${F.images.map((im, i) => `<figure class="${im.uploading ? "uploading" : ""}"><img src="${esc(im.url)}" alt=""><button type="button" class="icon-btn" data-action="of-remove-image" data-i="${i}" aria-label="${t("remove")}">${I.x}</button></figure>`).join("")}
    <label class="thumb-add">${I.image}<span>${t("addPhotos")}</span><input type="file" accept="image/*" multiple id="of-files"></label></div>
    <small class="muted">${t("refPhotosHint")}</small>`;
}

function paymentsBlock() {
  return `<div class="pay-list" id="of-payments">${F.payments.map((p, i) => `<div class="pay-row">
      <label class="field"><span>${t("amount")}</span><input inputmode="decimal" data-pay="${i}" data-k="amount" value="${esc(p.amount)}"></label>
      <label class="field"><span>${t("method")}</span><select data-pay="${i}" data-k="method">${opts(METHODS, p.method, (m) => t("pm_" + m))}</select></label>
      <label class="field"><span>${t("date")}</span><input type="date" data-pay="${i}" data-k="paid_on" value="${esc(p.paid_on)}"></label>
      <label class="field"><span>${t("note")}</span><input data-pay="${i}" data-k="note" value="${esc(p.note || "")}"></label>
      <button class="icon-btn" type="button" data-action="of-remove-payment" data-i="${i}" aria-label="${t("remove")}">${I.x}</button></div>`).join("")}</div>
    <button class="btn ghost small" type="button" data-action="of-add-payment">${I.plus}${t("addPayment")}</button>
    <div class="balance" id="of-balance"></div>`;
}

function formHtml(o) {
  const isNew = F.mode === "new";
  const products = state.products.filter((p) => p.visible || p.id === o.product_id);
  return `<form class="order-form" id="order-form" novalidate>
    <section class="card form-sec"><div class="sec-head"><span class="sec-n">1</span><h2>${t("client")}</h2></div>
      <div class="card-body" id="of-client">${clientPicker()}</div></section>

    <section class="card form-sec"><div class="sec-head"><span class="sec-n">2</span><h2>${t("theOrder")}</h2></div><div class="card-body">
      <div class="field"><span class="label">${t("source")}</span>${seg("source", SOURCES, o.source || "phone", (s) => t("src_" + s))}</div>
      <div class="field"><span class="label">${t("type")}</span>${seg("type", TYPES, o.type || "custom", (s) => t("ty_" + s))}</div>
      <label class="field"><span>${t("catalogItem")}</span><select name="product_id"><option value="">${t("noneCustom")}</option>
        ${products.map((p) => `<option value="${esc(p.id)}" ${p.id === o.product_id ? "selected" : ""}>${esc(productName(p))}</option>`).join("")}</select></label>
      <label class="field"><span>${t("description")}</span><textarea name="notes" rows="3" placeholder="${t("descriptionHint")}">${esc(o.notes || "")}</textarea></label>
      <label class="field"><span>${t("preferences")}</span><input name="preferences" placeholder="${t("preferencesHint")}" value="${esc(o.preferences || "")}"></label>
      <div class="grid-2">
        <label class="field"><span>${t("occasion")}</span><input name="occasion" placeholder="${t("occasionHint")}" value="${esc(o.occasion || "")}"></label>
        <label class="field"><span>${t("eventDate")}</span><input type="date" name="event_date" value="${esc(o.event_date || "")}"></label>
      </div>
      ${isNew ? `<div class="field"><span class="label">${t("refPhotos")}</span>${imagesBlock()}</div>` : ""}
    </div></section>

    <section class="card form-sec"><div class="sec-head"><span class="sec-n">3</span><h2>${t("measurements")}</h2><small>${t("cm")}</small></div>
      <div class="card-body" id="of-measures">${measureGrid()}</div></section>

    <section class="card form-sec"><div class="sec-head"><span class="sec-n">4</span><h2>${t("scheduleTeam")}</h2></div><div class="card-body">
      <div class="grid-2">
        <label class="field"><span>${t("dueDate")}</span><input type="date" name="needed_by" value="${esc(o.needed_by || "")}"><small id="due-hint"></small></label>
        <label class="field"><span>${t("assignedTo")}</span><select name="assigned_to"><option value="">${t("unassigned")}</option>
          ${state.staffOptions.map((s) => `<option value="${esc(s.id)}" ${s.id === o.assigned_to ? "selected" : ""}>${esc(s.name || s.email)} · ${t("role_" + s.role)}</option>`).join("")}</select></label>
      </div>
      <div class="field"><span class="label">${t("priority")}</span>${seg("priority", PRIORITIES, o.priority || "normal", (s) => t("pr_" + s))}</div>
      <label class="field"><span>${t("internalNotes")}</span><textarea name="admin_notes" rows="2" placeholder="${t("internalNotesHint")}">${esc(o.admin_notes || "")}</textarea></label>
    </div></section>

    ${can("orders.money") ? `<section class="card form-sec"><div class="sec-head"><span class="sec-n">5</span><h2>${t("money")}</h2></div><div class="card-body">
      <div class="grid-2">
        <label class="field"><span>${t("quotedPrice")}</span><input name="price" inputmode="decimal" value="${esc(o.price ?? "")}" placeholder="0"></label>
        <label class="field"><span>${t("paymentNote")}</span><input name="payment_note" value="${esc(o.payment_note || "")}"></label>
      </div>
      ${isNew ? paymentsBlock() : `<p class="muted">${t("paymentsOnOrderPage")}</p>`}
    </div></section>` : ""}

    ${isNew ? `<section class="card form-sec"><div class="sec-head"><span class="sec-n">${can("orders.money") ? 6 : 5}</span><h2>${t("startAs")}</h2></div><div class="card-body">
      ${seg("status", ["new", "confirmed"], "new", (s) => t("st_" + s))}</div></section>` : ""}

    <p class="form-msg" id="of-msg" role="status"></p>
    <div class="save-bar form-actions">
      <a class="btn ghost" href="${isNew ? "#inbox" : `#order/${esc(F.id)}`}">${t("cancel")}</a>
      ${isNew ? `<button class="btn ghost" type="button" data-action="of-save" data-again="1">${t("saveAndAnother")}</button>` : ""}
      <button class="btn red" type="button" data-action="of-save">${isNew ? t("saveOrder") : t("saveChanges")}</button>
    </div>
  </form>`;
}

function readForm() {
  const form = $("#order-form");
  const fd = new FormData(form);
  const val = (k) => (fd.get(k) ?? "").toString().trim();
  const measurements = {};
  for (const [k, v] of fd.entries()) if (k.startsWith("m_") && String(v).trim()) measurements[k.slice(2)] = String(v).trim();
  const body = {
    source: val("source"), type: val("type"), priority: val("priority"),
    product_id: val("product_id") || null, notes: val("notes"), preferences: val("preferences"),
    occasion: val("occasion"), event_date: val("event_date"), needed_by: val("needed_by"),
    measurements, assigned_to: val("assigned_to") || null, admin_notes: val("admin_notes"),
  };
  if (can("orders.money")) { body.price = val("price"); body.payment_note = val("payment_note"); }
  if (F.client) body.client_id = F.client.id;
  else if (F.newClient) body.client = { full_name: val("c_full_name"), phone: val("c_phone"), telegram: val("c_telegram"), whatsapp: val("c_whatsapp"), city: val("c_city") };
  if (F.mode === "new") {
    body.status = val("status") || "new";
    body.image_ids = F.images.map((i) => i.id);
    body.payments = F.payments.filter((p) => Number(p.amount) > 0).map((p) => ({ ...p, amount: Number(p.amount) }));
    body.save_measurements = fd.get("save_measurements") === "on";
    body.measurement_label = val("measurement_label");
  }
  return body;
}

function drawBalance() {
  const el = $("#of-balance");
  if (!el) return;
  const price = Number(($("#order-form [name=price]") || {}).value) || 0;
  const paid = F.payments.reduce((s, p) => s + (Number(p.amount) || 0), 0);
  if (!price && !paid) { el.hidden = true; return; }
  el.hidden = false;
  const status = paid <= 0 ? "unpaid" : price && paid >= price ? "paid" : "deposit";
  el.className = "balance " + status;
  el.innerHTML = `<span>${t("paid")} ${money(paid)}${price ? ` · ${t("balance")} <b>${money(Math.max(price - paid, 0))}</b>` : ""}</span><span class="paytag ${status}">${t("pay_" + status)}</span>`;
}

function drawDueHint() {
  const input = $("#order-form [name=needed_by]");
  const hint = $("#due-hint");
  if (!input || !hint) return;
  const d = daysUntil(input.value);
  input.classList.toggle("soon", d !== null && d <= 7);
  hint.className = d !== null && d < 0 ? "late" : d !== null && d <= 7 ? "soon" : "";
  hint.textContent = d === null ? "" : d < 0 ? t("dateInPast") : d === 0 ? t("dueToday") : d <= 7 ? t("dueSoonHint", { n: d }) : "";
}

async function pickClient(c) {
  F.client = c; F.newClient = false;
  $("#of-client").innerHTML = clientPicker();
  try {
    const full = await get(`/admin/clients/${c.id}`);
    F.client = { ...c, ...full };
    F.savedMeasures = full.measurements || [];
    $("#of-client").innerHTML = clientPicker();
    redrawMeasures();
  } catch (e) {}
}

function redrawMeasures() {
  const form = $("#order-form");
  for (const [k, v] of new FormData(form).entries()) if (k.startsWith("m_")) F.measurements[k.slice(2)] = String(v);
  $("#of-measures").innerHTML = measureGrid();
}

function bindClientSearch() {
  const q = $("#client-q");
  if (!q) return;
  const box = $("#client-results");
  let timer, list = [];
  const draw = () => {
    box.hidden = !q.value.trim();
    box.innerHTML = list.length ? list.map((c, i) => `<button type="button" role="option" class="ta-item" data-i="${i}">
        <span class="avatar">${esc(initials(c.full_name))}</span><span><b>${esc(c.full_name)}${c.vip ? ` <span class="vip-dot">${I.star}</span>` : ""}</b><small>${esc(c.phone || "")}${c.order_count ? ` · ${t("ordersCount", { n: c.order_count })}` : ""}</small></span></button>`).join("")
      : `<div class="ta-empty">${t("noClientFound")} <button class="link-btn" type="button" data-action="of-new-client">${t("createClient", { name: esc(q.value.trim()) })}</button></div>`;
    box.querySelectorAll(".ta-item").forEach((b) => b.addEventListener("click", () => pickClient(list[b.dataset.i])));
  };
  q.addEventListener("input", () => {
    clearTimeout(timer);
    timer = setTimeout(async () => { if (!q.value.trim()) { box.hidden = true; return; } list = await get("/admin/clients", { q: q.value.trim(), limit: 8 }); draw(); }, 200);
  });
  q.addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); const first = box.querySelector(".ta-item"); if (first) first.click(); } });
  q.focus();
}

function bindDupCheck() {
  const phone = $("#order-form [name=c_phone]");
  if (!phone) return;
  let timer;
  phone.addEventListener("input", () => {
    clearTimeout(timer);
    timer = setTimeout(async () => {
      const warn = $("#dup-warn");
      const found = await get("/admin/clients/check-phone", { phone: phone.value }).catch(() => []);
      warn.hidden = !found.length;
      if (found.length) {
        warn.innerHTML = `${I.alert} ${t("dupPhone", { name: esc(found[0].full_name) })} <button class="link-btn" type="button" data-action="of-use-dup">${t("useThisClient")}</button>`;
        warn._client = found[0];
      }
    }, 300);
  });
}

function bindForm() {
  const form = $("#order-form");
  bindClientSearch();
  bindDupCheck();
  form.addEventListener("input", (e) => {
    const p = e.target.dataset.pay;
    if (p !== undefined) F.payments[p][e.target.dataset.k] = e.target.value;
    if (e.target.name === "price" || p !== undefined) drawBalance();
    if (e.target.name === "needed_by") drawDueHint();
  });
  form.addEventListener("change", async (e) => {
    if (e.target.id === "of-files") {
      const files = [...e.target.files];
      e.target.value = "";
      for (const file of files) {
        const tmp = { url: URL.createObjectURL(file), uploading: true };
        F.images.push(tmp);
        redrawImages();
        try { const r = await upload(file); Object.assign(tmp, { id: r.id, url: r.url, uploading: false }); }
        catch (err) { F.images = F.images.filter((x) => x !== tmp); toast(err.message); }
        redrawImages();
      }
    }
    if (e.target.name === "product_id" && e.target.value) {
      const p = state.products.find((x) => x.id === e.target.value);
      const type = form.querySelector("[name=type]:checked");
      if (p && type && type.value === "custom" && !form.notes.value) form.notes.placeholder = productName(p);
    }
  });
  drawBalance();
  drawDueHint();
}

function redrawImages() {
  const box = $("#of-thumbs");
  if (!box) return;
  const wrap = document.createElement("div");
  wrap.innerHTML = imagesBlock();
  box.replaceWith(wrap.firstElementChild);
}

async function saveForm(btn) {
  const body = readForm();
  const msg = $("#of-msg");
  if (!F.client && !F.newClient) { msg.textContent = t("needClient"); $("#client-q")?.focus(); return; }
  if (F.images.some((i) => i.uploading)) { msg.textContent = t("waitUploads"); return; }
  const again = btn.dataset.again === "1";
  const saved = await busy(btn, () => (F.mode === "new" ? post("/admin/orders", body) : put(`/admin/orders/${F.id}`, { ...body, client_id: F.client.id })), msg);
  if (!saved) return;
  toast(F.mode === "new" ? t("orderCreated", { number: saved.number }) : t("saved"));
  if (again) { F = null; rerender(); window.scrollTo({ top: 0, behavior: "smooth" }); }
  else go(`order/${saved.id}`);
}

// ======================= order page =======================
let O = null;

function timeline(events) {
  const ic = { created: I.plus, status: I.check, note: I.note, payment: I.money, image: I.image, edit: I.pen, assigned: I.user };
  return `<ol class="timeline">${events.slice().reverse().map((e) => `<li class="ev-${esc(e.kind)}"><span class="ev-ic">${ic[e.kind] || I.note}</span><div>
      <p>${e.kind === "status" ? `${e.from_status ? pill(e.from_status) + " → " : ""}${pill(e.to_status)}` : ""}${e.body ? `<span class="ev-body">${esc(e.body)}</span>` : ""}</p>
      <small>${esc(e.user_label || "")} · <time title="${esc(fmtTime(e.created_at))}">${ago(e.created_at)}</time></small></div></li>`).join("")}</ol>`;
}

function detailsList(o) {
  const rows = [
    [t("type"), t("ty_" + o.type)],
    [t("source"), t("src_" + o.source)],
    [t("catalogItem"), o.product_name],
    [t("occasion"), o.occasion],
    [t("eventDate"), o.event_date ? fmtDay(o.event_date) : ""],
    [t("dueDate"), o.needed_by ? `${fmtDay(o.needed_by)} ${dueBadge(o, { short: true })}` : ""],
    [t("garment"), o.garment ? t("g_" + o.garment) + (o.who ? " · " + t("w_" + o.who) : "") : ""],
    [t("preferences"), o.preferences],
  ].filter(([, v]) => v);
  return `<dl class="dl">${rows.map(([k, v]) => `<div><dt>${k}</dt><dd>${k === t("dueDate") ? v : esc(v)}</dd></div>`).join("")}</dl>`;
}

function measuresTable(m) {
  const keys = Object.keys(m || {});
  if (!keys.length) return `<p class="muted">${t("noMeasures")}</p>`;
  return `<dl class="measures">${keys.map((k) => `<div><dt>${esc(mLabel(k))}</dt><dd>${esc(m[k])}</dd></div>`).join("")}</dl>`;
}

function photos(o) {
  const groups = ["reference", "progress"].map((kind) => [kind, o.images.filter((i) => i.kind === kind)]);
  return groups.map(([kind, list]) => `<div class="photo-group"><h4>${t("ph_" + kind)} <span class="count">${list.length}</span></h4>
    <div class="thumbs">${list.map((im) => `<figure><a href="${esc(im.url)}" target="_blank" rel="noopener"><img src="${esc(im.url)}" alt="${esc(im.caption || "")}" loading="lazy"></a>
        ${can("orders") ? `<button type="button" class="icon-btn" data-action="od-remove-image" data-id="${esc(im.id)}" aria-label="${t("remove")}">${I.x}</button>` : ""}
        ${im.caption ? `<figcaption>${esc(im.caption)}</figcaption>` : ""}</figure>`).join("")}
      ${(kind === "progress" || can("orders")) ? `<label class="thumb-add">${I.image}<span>${t("addPhoto")}</span><input type="file" accept="image/*" data-od-upload="${kind}" ${kind === "progress" ? 'capture="environment"' : ""}></label>` : ""}
    </div></div>`).join("");
}

function paymentsCard(o) {
  if (!can("orders.money")) return "";
  return `<section class="card"><div class="card-head"><h2>${t("payments")}</h2>${payBadge(o)}</div><div class="card-body">
    <div class="money-line"><div><span>${t("quotedPrice")}</span><b>${money(o.price)}</b></div><div><span>${t("paid")}</span><b>${money(o.paid)}</b></div><div class="gold"><span>${t("balance")}</span><b>${o.price == null ? "—" : money(o.balance)}</b></div></div>
    ${o.payments.length ? `<ul class="pay-history">${o.payments.map((p) => `<li><span><b>${money(p.amount)}</b><small>${t("pm_" + p.method)} · ${fmtDay(p.paid_on)}${p.note ? " · " + esc(p.note) : ""}</small></span>
      <button class="btn danger small" type="button" data-action="od-delete-payment" data-id="${esc(p.id)}">${t("remove")}</button></li>`).join("")}</ul>` : ""}
    <form class="pay-add" id="pay-add" novalidate>
      <label class="field"><span>${t("amount")}</span><input name="amount" inputmode="decimal" required placeholder="${o.balance ? num(o.balance) : "0"}"></label>
      <label class="field"><span>${t("method")}</span><select name="method">${opts(METHODS, "telebirr", (m) => t("pm_" + m))}</select></label>
      <label class="field"><span>${t("date")}</span><input type="date" name="paid_on" value="${today()}"></label>
      <label class="field"><span>${t("note")}</span><input name="note"></label>
      <button class="btn" type="submit">${I.plus}${t("recordPayment")}</button>
    </form>
    ${o.payment_note ? `<p class="muted">${esc(o.payment_note)}</p>` : ""}
  </div></section>`;
}

function detailHtml(o) {
  const statusList = isTailor() ? ["in_production", "ready"] : STATUSES;
  const firstName = (o.client_name || "").split(" ")[0];
  const msg = t("waGreeting", { name: firstName, ref: o.number });
  return `<div class="order-page">
    <section class="card status-card">
      <div class="status-track">${STATUSES.filter((s) => s !== "cancelled").map((s, i, arr) => {
        const at = arr.indexOf(o.status);
        return `<span class="${o.status === "cancelled" ? "" : i < at ? "done" : i === at ? "now" : ""}">${t("st_" + s)}</span>`;
      }).join("")}</div>
      <div class="status-actions">
        <label class="field"><span>${t("changeStatus")}</span><select id="od-status">${opts(statusList, o.status, (s) => t("st_" + s))}</select></label>
        <label class="field grow"><span>${t("noteOptional")}</span><input id="od-status-note" placeholder="${t("statusNoteHint")}"></label>
        <button class="btn red" type="button" data-action="od-status">${t("update")}</button>
      </div>
    </section>
    <div class="two-col">
      <div class="stack">
        <section class="card"><div class="card-head"><h2>${t("details")}</h2>${prio(o.priority)}</div><div class="card-body">
          ${o.notes ? `<p class="lead-note">${esc(o.notes)}</p>` : ""}${detailsList(o)}
          ${o.admin_notes && !isTailor() ? `<div class="internal"><b>${t("internalNotes")}</b><p>${esc(o.admin_notes)}</p></div>` : ""}
        </div></section>
        <section class="card"><div class="card-head"><h2>${t("measurements")}</h2><small class="muted">${t("cm")}</small></div><div class="card-body">${measuresTable(o.measurements)}</div></section>
        <section class="card"><div class="card-head"><h2>${t("photos")}</h2></div><div class="card-body">${photos(o)}</div></section>
        <section class="card"><div class="card-head"><h2>${t("timeline")}</h2></div><div class="card-body">
          <form class="note-add" id="note-add"><input name="body" placeholder="${t("addNoteHint")}" aria-label="${t("addNote")}" autocomplete="off"><button class="btn" type="submit">${t("addNote")}</button></form>
          ${timeline(o.events)}</div></section>
      </div>
      <div class="stack">
        <section class="card"><div class="card-head"><h2>${t("client")}</h2>${can("clients") && o.client_id ? `<a class="btn ghost small" href="#clients/${esc(o.client_id)}">${t("profile")}</a>` : ""}</div><div class="card-body">
          <div class="picked-client plain"><span class="avatar">${esc(initials(o.client_name))}</span><span><b>${esc(o.client_name || o.name)}${o.client_vip ? ` <span class="vip-dot">${I.star}</span>` : ""}</b>${o.phone ? `<small>${esc(o.phone)}</small>` : ""}</span></div>
          ${isTailor() ? "" : `<div class="contact-row">${contactButtons(o, msg)}</div>`}
        </div></section>
        <section class="card"><div class="card-head"><h2>${t("assignedTo")}</h2></div><div class="card-body">
          ${can("orders") ? `<select id="od-assign" aria-label="${t("assignedTo")}"><option value="">${t("unassigned")}</option>${state.staffOptions.map((s) => `<option value="${esc(s.id)}" ${s.id === o.assigned_to ? "selected" : ""}>${esc(s.name || s.email)} · ${t("role_" + s.role)}</option>`).join("")}</select>`
            : `<p>${esc(o.assigned_name || t("unassigned"))}</p>`}
        </div></section>
        ${paymentsCard(o)}
        <section class="card"><div class="card-head"><h2>${t("moreActions")}</h2></div><div class="card-body quick-list">
          <button type="button" data-action="od-print">${I.print}${t("printSheet")}</button>
          ${can("orders") ? `<a href="#order/${esc(o.id)}/edit">${I.pen}${t("editOrder")}</a>
          <button type="button" data-action="od-duplicate">${I.copy}${t("duplicateOrder")}</button>
          <button type="button" data-action="od-archive">${I.archive}${o.archived_at ? t("restoreOrder") : t("archiveOrder")}</button>` : ""}
          ${can("orders.delete") ? `<button type="button" class="danger" data-action="od-delete">${I.x}${t("deleteOrder")}</button>` : ""}
        </div></section>
        <p class="muted small-print">${t("createdOn", { date: fmtTime(o.created_at) })}</p>
      </div>
    </div></div>`;
}

function printSheet(o) {
  const s = state.settings;
  const m = o.measurements || {};
  const rows = [
    [t("client"), `${o.client_name || o.name}${o.phone ? " · " + o.phone : ""}`],
    [t("type"), `${t("ty_" + o.type)}${o.product_name ? " · " + o.product_name : ""}`],
    [t("description"), o.notes || "—"],
    [t("preferences"), o.preferences || "—"],
    [t("occasion"), [o.occasion, o.event_date ? fmtDay(o.event_date) : ""].filter(Boolean).join(" · ") || "—"],
    [t("dueDate"), o.needed_by ? fmtDay(o.needed_by) : t("noDate")],
    [t("priority"), t("pr_" + o.priority)],
    [t("assignedTo"), o.assigned_name || "—"],
  ];
  if (can("orders.money")) rows.push([t("quotedPrice"), money(o.price)], [t("paid"), money(o.paid)], [t("balance"), o.price == null ? "—" : money(o.balance)]);
  const slip = document.createElement("div");
  slip.id = "print-slip";
  slip.innerHTML = `<header><img src="../images/logo-red-160.webp" alt=""><div><b>Mayza Design</b><span>${esc(s.phone || "")} · ${esc(s.address_en || "")}</span></div>
      <div class="ref">${t("order")}<b>${esc(o.number)}</b><span>${esc(t("st_" + o.status))} · ${esc(fmtDay(String(o.created_at).slice(0, 10)))}</span></div></header>
    <table>${rows.map(([k, v]) => `<tr><th>${esc(k)}</th><td>${esc(v)}</td></tr>`).join("")}</table>
    <h3>${t("measurements")} (${t("cm")})</h3>
    <div class="pm">${Object.keys(m).length ? Object.entries(m).map(([k, v]) => `<div><span>${esc(mLabel(k))}</span><b>${esc(v)}</b></div>`).join("") : "—"}</div>
    ${o.images.filter((i) => i.kind === "reference").slice(0, 3).map((i) => `<img class="ref-img" src="${esc(i.url)}" alt="">`).join("")}
    <p class="sign">${t("signature")}: ____________________</p>`;
  document.body.appendChild(slip);
  const done = () => { slip.remove(); removeEventListener("afterprint", done); };
  addEventListener("afterprint", done);
  setTimeout(() => window.print(), 150);
}

async function reloadOrder() {
  O = await get(`/admin/orders/${O.id}`);
  rerender();
}

function bindDetail() {
  const noteForm = $("#note-add");
  noteForm?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const body = noteForm.body.value.trim();
    if (!body) return;
    try { await post(`/admin/orders/${O.id}/notes`, { body }); toast(t("noteAdded")); await reloadOrder(); } catch (err) { toast(err.message); }
  });
  const pay = $("#pay-add");
  pay?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const fd = Object.fromEntries(new FormData(pay));
    const btn = pay.querySelector("button");
    const r = await busy(btn, () => post(`/admin/orders/${O.id}/payments`, fd));
    if (r) { toast(t("paymentRecorded")); await reloadOrder(); }
  });
  $("#od-assign")?.addEventListener("change", async (e) => {
    try {
      const body = { ...editable(O), assigned_to: e.target.value || null };
      await put(`/admin/orders/${O.id}`, body);
      toast(t("saved")); await reloadOrder();
    } catch (err) { toast(err.message); }
  });
  $$("[data-od-upload]").forEach((input) => input.addEventListener("change", async () => {
    const file = input.files[0];
    if (!file) return;
    const label = input.parentElement.querySelector("span");
    label.textContent = t("uploading");
    try {
      const r = await upload(file);
      let caption = null;
      if (input.dataset.odUpload === "progress") caption = window.prompt(t("captionPrompt")) || null;
      await post(`/admin/orders/${O.id}/images`, { image_id: r.id, kind: input.dataset.odUpload, caption });
      toast(t("photoAdded")); await reloadOrder();
    } catch (err) { toast(err.message); label.textContent = t("addPhoto"); }
  }));
}

// the fields PUT /orders/:id expects, from a loaded order
const editable = (o) => ({
  client_id: o.client_id, source: o.source, type: o.type, priority: o.priority, garment: o.garment, who: o.who,
  product_id: o.product_id, product_name: o.product_name, notes: o.notes, preferences: o.preferences, occasion: o.occasion,
  event_date: o.event_date, needed_by: o.needed_by, measurements: o.measurements || {}, assigned_to: o.assigned_to,
  admin_notes: o.admin_notes, price: o.price, payment_note: o.payment_note,
});

// ======================= view =======================
export default {
  async render(arg) {
    const [id, sub] = arg.split("/");
    if (id === "new") {
      if (!can("orders")) throw new Error(t("noAccess"));
      if (!F || F.mode !== "new") F = blankForm();
      const { query } = route();
      if (query.client && !F.client) {
        try { const c = await get(`/admin/clients/${query.client}`); F.client = c; F.savedMeasures = c.measurements || []; } catch (e) {}
      }
      return { back: "#inbox", eyebrow: t("manualOrder"), title: t("newOrder"), body: formHtml({}) };
    }
    O = await get(`/admin/orders/${id}`);
    if (sub === "edit") {
      if (!can("orders")) throw new Error(t("noAccess"));
      F = { ...blankForm(), mode: "edit", id: O.id, client: { id: O.client_id, full_name: O.client_name, phone: O.client_phone, vip: O.client_vip }, measurements: { ...(O.measurements || {}) } };
      F.extraKeys = Object.keys(F.measurements);
      try { const c = await get(`/admin/clients/${O.client_id}`); F.savedMeasures = c.measurements || []; } catch (e) {}
      return { back: `#order/${O.id}`, eyebrow: `${t("order")} ${esc(O.number)}`, title: t("editOrder"), body: formHtml(O) };
    }
    const title = `${esc(O.client_name || O.name)}`;
    const eyebrow = `${esc(O.number)} · ${pill(O.status)}${O.archived_at ? ` <span class="tag off">${t("archived")}</span>` : ""}`;
    const actions = `<button class="btn ghost" type="button" data-action="od-print">${I.print}<span class="hide-sm">${t("print")}</span></button>
      ${can("orders") ? `<a class="btn ghost" href="#order/${esc(O.id)}/edit">${I.pen}<span class="hide-sm">${t("edit")}</span></a>` : ""}`;
    return { back: "#inbox", eyebrow, title, actions, body: detailHtml(O) };
  },
  mount(arg) {
    const [id, sub] = arg.split("/");
    if (id === "new" || sub === "edit") bindForm(); else bindDetail();
  },
};

on({
  "of-new-client": () => {
    const q = $("#client-q");
    const typed = q ? q.value.trim() : "";
    F.newClient = true; F.client = null; F.savedMeasures = [];
    F.draftClient = /^[\d\s+()-]{5,}$/.test(typed) ? { phone: typed } : { full_name: typed };
    $("#of-client").innerHTML = clientPicker();
    bindDupCheck();
    $("#order-form [name=c_full_name]").focus();
    redrawMeasures();
  },
  "of-search-client": () => { F.newClient = false; $("#of-client").innerHTML = clientPicker(); bindClientSearch(); },
  "of-change-client": () => { F.client = null; F.savedMeasures = []; $("#of-client").innerHTML = clientPicker(); bindClientSearch(); redrawMeasures(); },
  "of-use-dup": () => { const w = $("#dup-warn"); if (w && w._client) pickClient(w._client); },
  "of-use-measure": (el) => {
    const m = F.savedMeasures.find((x) => x.id === el.dataset.id);
    if (!m) return;
    F.measurements = { ...m.data };
    F.extraKeys = Object.keys(m.data);
    $("#of-measures").innerHTML = measureGrid();
    toast(t("measuresFilled"));
  },
  "of-add-measure": () => {
    const name = (window.prompt(t("measureNamePrompt")) || "").trim().toLowerCase().slice(0, 40);
    if (!name) return;
    redrawMeasures();
    if (!F.extraKeys.includes(name)) F.extraKeys.push(name);
    $("#of-measures").innerHTML = measureGrid();
    $(`#order-form [name="m_${CSS.escape(name)}"]`)?.focus();
  },
  "of-remove-image": (el) => { F.images.splice(Number(el.dataset.i), 1); redrawImages(); },
  "of-add-payment": () => {
    F.payments.push({ amount: "", method: "telebirr", paid_on: today(), note: "" });
    const wrap = document.createElement("div");
    wrap.innerHTML = paymentsBlock();
    $("#of-payments").replaceWith(wrap.querySelector("#of-payments"));
    $$("#of-payments [data-k=amount]").pop()?.focus();
    drawBalance();
  },
  "of-remove-payment": (el) => {
    F.payments.splice(Number(el.dataset.i), 1);
    const wrap = document.createElement("div");
    wrap.innerHTML = paymentsBlock();
    $("#of-payments").replaceWith(wrap.querySelector("#of-payments"));
    drawBalance();
  },
  "of-save": (el) => saveForm(el),

  "od-status": async (el) => {
    const status = $("#od-status").value;
    if (status === O.status) return;
    el.disabled = true;
    try { await changeStatus(O.id, status, { note: $("#od-status-note").value.trim() }); } catch (err) { toast(err.message); el.disabled = false; return; }
    if (isTailor() && !["in_production", "ready"].includes(status)) go("inbox"); else await reloadOrder();
  },
  "od-print": () => printSheet(O),
  "od-duplicate": async () => { const n = await post(`/admin/orders/${O.id}/duplicate`); toast(t("duplicated", { number: n.number })); go(`order/${n.id}/edit`); },
  "od-archive": async () => { await post(`/admin/orders/${O.id}/archive`, { archived: !O.archived_at }); toast(O.archived_at ? t("restored") : t("archivedToast")); await reloadOrder(); },
  "od-delete": (el) => armDelete(el, async () => { await del(`/admin/orders/${O.id}`); toast(t("deleted")); go("inbox"); }),
  "od-delete-payment": (el) => armDelete(el, async () => { await del(`/admin/orders/${O.id}/payments/${el.dataset.id}`); toast(t("deleted")); await reloadOrder(); }, t("remove")),
  "od-remove-image": (el) => armDelete(el, async () => { await del(`/admin/orders/${O.id}/images/${el.dataset.id}`); await reloadOrder(); }, ""),
});
