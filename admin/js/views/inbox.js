// Unified inbox: every inquiry and order, as a list or a kanban board.
import { get } from "../api.js";
import { t, money, ago } from "../i18n.js";
import { state, can, isTailor, STATUSES, SOURCES, TYPES, PRIORITIES } from "../state.js";
import { $, $$, esc, I, pill, prio, dueBadge, payBadge, emptyBox, opts, toast } from "../ui.js";
import { on, route, rerender } from "../router.js";
import { changeStatus } from "./status.js";

const F = state.inbox;
const FILTER_KEYS = ["status", "source", "type", "priority", "assigned", "from", "to", "due", "archived"];

function statusSelect(o) {
  const list = isTailor() ? ["in_production", "ready"] : STATUSES;
  return `<label class="status-select ${esc(o.status)}" title="${t("changeStatus")}"><span class="sr-only">${t("changeStatus")}</span>
    <select data-status-for="${esc(o.id)}" aria-label="${t("changeStatus")}">${opts(list, o.status, (s) => t("st_" + s))}</select></label>`;
}

function row(o) {
  const what = o.product_name || t("ty_" + o.type);
  return `<div class="row" data-id="${esc(o.id)}">
    <a class="who" href="#order/${esc(o.id)}"><b>${esc(o.client_name || o.name)}${o.client_vip ? ` <span class="vip-dot" title="VIP">${I.star}</span>` : ""}</b>
      <small>${esc(o.number)} · ${t("src_" + o.source)} · ${ago(o.created_at)}</small></a>
    <a class="what" href="#order/${esc(o.id)}"><span>${esc(what)}</span><small>${prio(o.priority)}${o.assigned_name ? esc(o.assigned_name) : can("orders") ? `<em>${t("unassigned")}</em>` : ""}</small></a>
    <span class="due-cell">${dueBadge(o)}</span>
    <span class="status-cell">${statusSelect(o)}</span>
    ${can("orders.money") ? `<span class="amt">${o.price != null ? money(o.price) : `<small>${t("priceTbd")}</small>`}${payBadge(o)}</span>` : ""}
  </div>`;
}

function card(o) {
  return `<article class="kcard ${o.priority !== "normal" ? "p-" + esc(o.priority) : ""}" draggable="true" data-id="${esc(o.id)}">
    ${o.cover ? `<img src="${esc(o.cover)}" alt="" loading="lazy">` : ""}
    <a href="#order/${esc(o.id)}"><b>${esc(o.client_name || o.name)}</b><small>${esc(o.number)}</small></a>
    <p>${esc(o.product_name || t("ty_" + o.type))}</p>
    <div class="kmeta">${prio(o.priority)}${dueBadge(o, { short: true })}${can("orders.money") ? payBadge(o) : ""}</div>
    ${o.assigned_name ? `<small class="kwho">${I.user}${esc(o.assigned_name)}</small>` : ""}
    <div class="kmove">${statusSelect(o)}</div>
  </article>`;
}

function board(list) {
  const cols = isTailor() ? ["in_production", "ready"] : STATUSES;
  return `<div class="kanban" style="--cols:${cols.length}">${cols.map((s) => {
    const items = list.filter((o) => o.status === s);
    return `<section class="kcol" data-status="${s}"><header>${pill(s)}<b>${items.length}</b></header>
      <div class="kdrop">${items.map(card).join("") || `<p class="kempty">${t("dropHere")}</p>`}</div></section>`;
  }).join("")}</div>`;
}

function filtersBar() {
  const staff = state.staffOptions;
  const active = FILTER_KEYS.filter((k) => F[k]).length;
  return `<div class="toolbar">
      <label class="search-wrap">${I.search}<input class="search" id="inbox-q" type="search" placeholder="${t("searchInbox")}" value="${esc(F.q)}" aria-label="${t("searchInbox")}"></label>
      <div class="seg" role="group" aria-label="${t("view")}">
        <button type="button" data-action="inbox-view" data-view="list" aria-pressed="${F.view === "list"}">${I.list}<span>${t("listView")}</span></button>
        <button type="button" data-action="inbox-view" data-view="board" aria-pressed="${F.view === "board"}">${I.board}<span>${t("boardView")}</span></button>
      </div>
      ${isTailor() ? "" : `<button class="btn ghost small" type="button" data-action="toggle-filters" aria-expanded="${active ? "true" : "false"}">${t("filters")}${active ? ` <b class="badge">${active}</b>` : ""}</button>`}
    </div>
    ${isTailor() ? "" : `<form class="filters" id="inbox-filters" ${active ? "" : "hidden"}>
      <label class="field"><span>${t("status")}</span><select name="status">${opts(STATUSES, F.status, (s) => t("st_" + s), t("all"))}</select></label>
      <label class="field"><span>${t("source")}</span><select name="source">${opts(SOURCES, F.source, (s) => t("src_" + s), t("all"))}</select></label>
      <label class="field"><span>${t("type")}</span><select name="type">${opts(TYPES, F.type, (s) => t("ty_" + s), t("all"))}</select></label>
      <label class="field"><span>${t("priority")}</span><select name="priority">${opts(PRIORITIES, F.priority, (s) => t("pr_" + s), t("all"))}</select></label>
      <label class="field"><span>${t("assignedTo")}</span><select name="assigned"><option value="">${t("anyone")}</option>
        <option value="me" ${F.assigned === "me" ? "selected" : ""}>${t("me")}</option><option value="none" ${F.assigned === "none" ? "selected" : ""}>${t("unassigned")}</option>
        ${staff.map((s) => `<option value="${esc(s.id)}" ${F.assigned === s.id ? "selected" : ""}>${esc(s.name || s.email)}</option>`).join("")}</select></label>
      <label class="field"><span>${t("deadline")}</span><select name="due">${opts(["soon", "overdue"], F.due, (s) => t("due_" + s), t("any"))}</select></label>
      <label class="field"><span>${t("fromDate")}</span><input type="date" name="from" value="${esc(F.from)}"></label>
      <label class="field"><span>${t("toDate")}</span><input type="date" name="to" value="${esc(F.to)}"></label>
      <label class="check"><input type="checkbox" name="archived" value="1" ${F.archived ? "checked" : ""}><span>${t("showArchived")}</span></label>
      <button class="link-btn" type="button" data-action="clear-filters">${t("clearFilters")}</button>
    </form>`}`;
}

function chips(all) {
  const counts = Object.fromEntries(STATUSES.map((s) => [s, all.filter((o) => o.status === s).length]));
  const list = isTailor() ? ["in_production", "ready"] : STATUSES;
  return `<div class="chips status-chips">
    <button class="chip" type="button" data-action="status-chip" data-status="" aria-pressed="${!F.status}">${t("all")} <b>${all.length}</b></button>
    ${list.map((s) => `<button class="chip" type="button" data-action="status-chip" data-status="${s}" aria-pressed="${F.status === s}">${t("st_" + s)} <b>${counts[s]}</b></button>`).join("")}
  </div>`;
}

let all = [];
async function load() {
  const q = { ...Object.fromEntries(FILTER_KEYS.filter((k) => k !== "status").map((k) => [k, F[k]])), q: F.q };
  all = await get("/admin/orders", q);
  state.orders = all;
}

function draw() {
  const list = F.status ? all.filter((o) => F.status.split(",").includes(o.status)) : all;
  const box = $("#inbox-body");
  if (!box) return;
  $("#inbox-chips").innerHTML = chips(all);
  if (F.view === "board") { box.innerHTML = board(all); bindBoard(); return; }
  box.innerHTML = list.length ? `<div class="rows ${can("orders.money") ? "" : "no-amt"}">${list.map(row).join("")}</div>`
    : emptyBox(F.q || FILTER_KEYS.some((k) => F[k]) ? t("noMatch") : isTailor() ? t("myWorkEmpty") : t("noOrders"));
}

function bindBoard() {
  let dragId = null;
  $$(".kcard").forEach((c) => {
    c.addEventListener("dragstart", (e) => { dragId = c.dataset.id; c.classList.add("dragging"); e.dataTransfer.effectAllowed = "move"; });
    c.addEventListener("dragend", () => c.classList.remove("dragging"));
  });
  $$(".kcol").forEach((col) => {
    col.addEventListener("dragover", (e) => { e.preventDefault(); col.classList.add("over"); });
    col.addEventListener("dragleave", () => col.classList.remove("over"));
    col.addEventListener("drop", async (e) => {
      e.preventDefault(); col.classList.remove("over");
      const o = all.find((x) => x.id === dragId);
      if (!o || o.status === col.dataset.status) return;
      await setStatus(o, col.dataset.status);
    });
  });
}

async function setStatus(o, status) {
  const prev = o.status;
  o.status = status;
  draw();
  try {
    const fresh = await changeStatus(o.id, status);
    Object.assign(o, fresh);
  } catch (err) {
    o.status = prev;
    toast(err.message);
  }
  draw();
}

export default {
  async render() {
    const { query } = route();
    if (Object.keys(query).length) {
      FILTER_KEYS.forEach((k) => { F[k] = query[k] || ""; });
      history.replaceState(null, "", "#inbox");
    }
    await load();
    const actions = `${can("orders.export") ? `<button class="btn ghost" type="button" data-action="export-orders">${I.download}${t("exportCsv")}</button>` : ""}
      ${can("orders") ? `<a class="btn red" href="#order/new">${I.plus}${t("newOrder")}</a>` : ""}`;
    const body = `<section class="card inbox">${filtersBar()}<div id="inbox-chips"></div><div id="inbox-body"></div></section>`;
    return { eyebrow: t("ordersCount", { n: all.length }), title: isTailor() ? t("myWork") : t("nav_inbox"), actions, body };
  },
  mount() {
    draw();
    const q = $("#inbox-q");
    let timer;
    q.addEventListener("input", () => { clearTimeout(timer); timer = setTimeout(async () => { F.q = q.value.trim(); await load(); draw(); }, 250); });
    const form = $("#inbox-filters");
    if (form) form.addEventListener("change", async () => {
      FILTER_KEYS.forEach((k) => { const el = form.elements[k]; if (el) F[k] = el.type === "checkbox" ? (el.checked ? "1" : "") : el.value; });
      await load(); draw();
      const btn = $('[data-action="toggle-filters"]');
      const n = FILTER_KEYS.filter((k) => F[k]).length;
      if (btn) btn.innerHTML = `${t("filters")}${n ? ` <b class="badge">${n}</b>` : ""}`;
    });
  },
};

document.addEventListener("change", (e) => {
  const sel = e.target.closest("[data-status-for]");
  if (!sel) return;
  const o = (state.orders || []).find((x) => x.id === sel.dataset.statusFor);
  if (o && route().name === "inbox") setStatus(o, sel.value);
});

on({
  "inbox-view": (el) => { F.view = el.dataset.view; $$('[data-action="inbox-view"]').forEach((b) => b.setAttribute("aria-pressed", b === el)); draw(); },
  "toggle-filters": (el) => { const f = $("#inbox-filters"); f.hidden = !f.hidden; el.setAttribute("aria-expanded", String(!f.hidden)); },
  "clear-filters": () => { FILTER_KEYS.forEach((k) => { F[k] = ""; }); rerender(); },
  "status-chip": (el) => { F.status = el.dataset.status; const s = $("#inbox-filters select[name=status]"); if (s) s.value = F.status; draw(); },
  "export-orders": () => {
    const q = new URLSearchParams(Object.entries({ ...Object.fromEntries(FILTER_KEYS.map((k) => [k, F[k]])), q: F.q }).filter(([, v]) => v));
    const a = document.createElement("a");
    a.href = `/api/admin/orders/export.csv?${q}`;
    document.body.appendChild(a); a.click(); a.remove();
  },
});

