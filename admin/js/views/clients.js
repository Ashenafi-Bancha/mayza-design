// Clients: search, profiles with order history and saved measurements.
import { get, post, put, del } from "../api.js";
import { t, money, num, fmtDay, ago, today } from "../i18n.js";
import { MEASURES } from "../state.js";
import { $, esc, I, pill, emptyBox, toast, busy, armDelete, contactButtons, initials, openDrawer, drawerHead, closeDrawer, drawerEl } from "../ui.js";
import { on, go, rerender } from "../router.js";

let Q = "";
let vipOnly = false;
const mLabel = (k) => (t("m_" + k) !== "m_" + k ? t("m_" + k) : k);

function listHtml(list) {
  if (!list.length) return emptyBox(Q ? t("noClientFound") : t("noClients"), I.users);
  return `<div class="client-list">${list.map((c) => `<a class="client-row" href="#clients/${esc(c.id)}">
      <span class="avatar">${esc(initials(c.full_name))}</span>
      <span class="cr-main"><b>${esc(c.full_name)}${c.vip ? ` <span class="vip-dot">${I.star}</span>` : ""}</b><small>${esc(c.phone || "—")}${c.city ? " · " + esc(c.city) : ""}</small></span>
      <span class="cr-side"><b>${t("ordersCount", { n: c.order_count })}</b><small>${c.last_order ? ago(c.last_order) : ""}</small></span>
    </a>`).join("")}</div>`;
}

function clientForm(c = {}) {
  return `${drawerHead(t("nav_clients"), c.id ? t("editClient") : t("newClient"))}
    <form class="drawer-body" id="client-form" novalidate>
      <div class="section-box">
        <label class="field"><span>${t("fullName")} *</span><input name="full_name" required value="${esc(c.full_name || "")}"></label>
        <div class="grid-2">
          <label class="field"><span>${t("phone")}</span><input name="phone" type="tel" value="${esc(c.phone || "")}"><small class="dup-warn" id="cf-dup" hidden></small></label>
          <label class="field"><span>WhatsApp</span><input name="whatsapp" type="tel" value="${esc(c.whatsapp || "")}" placeholder="${t("sameAsPhone")}"></label>
        </div>
        <div class="grid-2">
          <label class="field"><span>Telegram</span><input name="telegram" value="${esc(c.telegram || "")}" placeholder="@username"></label>
          <label class="field"><span>${t("email")}</span><input name="email" type="email" value="${esc(c.email || "")}"></label>
        </div>
        <label class="field"><span>${t("city")}</span><input name="city" value="${esc(c.city || "")}"></label>
      </div>
      <div class="section-box">
        <label class="field"><span>${t("tags")}</span><input name="tags" value="${esc((c.tags || []).join(", "))}" placeholder="${t("tagsClientHint")}"></label>
        <label class="check"><input type="checkbox" name="vip" ${c.vip ? "checked" : ""}><span>VIP<small>${t("vipHint")}</small></span></label>
        <label class="field"><span>${t("privateNotes")}</span><textarea name="notes" rows="3">${esc(c.notes || "")}</textarea><small>${t("privateNotesHint")}</small></label>
      </div>
      <p class="form-msg" id="cf-msg" role="status"></p>
    </form>
    <div class="drawer-foot"><span class="spacer"></span>
      <button class="btn ghost" type="button" data-action="close-drawer">${t("cancel")}</button>
      <button class="btn red" type="button" data-action="save-client" data-id="${esc(c.id || "")}">${t("save")}</button></div>`;
}

export function openClientForm(c = {}, after) {
  openDrawer(clientForm(c));
  const phone = $("#client-form [name=phone]");
  let timer;
  phone.addEventListener("input", () => {
    clearTimeout(timer);
    timer = setTimeout(async () => {
      const found = await get("/admin/clients/check-phone", { phone: phone.value, exclude: c.id }).catch(() => []);
      const w = $("#cf-dup");
      w.hidden = !found.length;
      if (found.length) w.innerHTML = `${I.alert} ${t("dupPhone", { name: esc(found[0].full_name) })} <a class="link-btn" href="#clients/${esc(found[0].id)}" data-action="close-drawer-go" data-href="#clients/${esc(found[0].id)}">${t("open")}</a>`;
    }, 300);
  });
  drawerEl()._after = after;
}

function measureForm() {
  return `${drawerHead(t("measurements"), t("newMeasurements"))}
    <form class="drawer-body" id="measure-form" novalidate>
      <div class="grid-2"><label class="field"><span>${t("measureLabel")}</span><input name="label" placeholder="${t("measureLabelHint")}"></label>
        <label class="field"><span>${t("date")}</span><input type="date" name="taken_on" value="${today()}"></label></div>
      <div class="measure-grid">${MEASURES.map((k) => `<label class="field"><span>${esc(mLabel(k))}</span><input name="m_${k}" inputmode="decimal"></label>`).join("")}</div>
      <label class="field"><span>${t("note")}</span><input name="notes"></label>
      <p class="form-msg" id="mf-msg" role="status"></p>
    </form>
    <div class="drawer-foot"><span class="spacer"></span><button class="btn ghost" type="button" data-action="close-drawer">${t("cancel")}</button>
      <button class="btn red" type="button" data-action="save-measure">${t("save")}</button></div>`;
}

let C = null;
function profileHtml(c) {
  const open = c.orders.filter((o) => !["delivered", "cancelled"].includes(o.status) && !o.archived_at);
  return `<div class="two-col"><div class="stack">
      <section class="card"><div class="card-head"><h2>${t("orders")} <span class="count">${c.orders.length}</span></h2>
        <a class="btn red small" href="#order/new?client=${esc(c.id)}">${I.plus}${t("newOrder")}</a></div>
        <div class="lines">${c.orders.length ? c.orders.map((o) => `<a class="line-row" href="#order/${esc(o.id)}"><span class="lr-main"><b>${esc(o.number)}</b>
          <small>${esc(o.product_name || t("ty_" + o.type))} · ${fmtDay(String(o.created_at).slice(0, 10))}</small></span>
          <span class="lr-side">${o.price != null ? `<span class="muted">${money(o.price)}</span>` : ""}${pill(o.status)}</span></a>`).join("") : `<p class="muted pad">${t("noOrdersYet")}</p>`}</div></section>
      <section class="card"><div class="card-head"><h2>${t("measurements")}</h2><button class="btn ghost small" type="button" data-action="add-measure">${I.plus}${t("add")}</button></div>
        <div class="card-body">${c.measurements.length ? c.measurements.map((m) => `<div class="measure-set"><div class="ms-head"><b>${esc(m.label || t("measurements"))}</b><small>${fmtDay(m.taken_on)}</small>
            <button class="btn danger small" type="button" data-action="delete-measure" data-id="${esc(m.id)}">${t("delete")}</button></div>
            <dl class="measures">${Object.entries(m.data).map(([k, v]) => `<div><dt>${esc(mLabel(k))}</dt><dd>${esc(v)}</dd></div>`).join("")}</dl>${m.notes ? `<p class="muted">${esc(m.notes)}</p>` : ""}</div>`).join("")
          : `<p class="muted">${t("noMeasures")}</p>`}</div></section>
    </div><div class="stack">
      <section class="card"><div class="card-body client-card">
        <span class="avatar big">${esc(initials(c.full_name))}</span>
        <div><b>${esc(c.full_name)}</b><small>${esc(c.phone || "")}${c.city ? " · " + esc(c.city) : ""}</small>
          ${c.tags.length ? `<div class="tags-row">${c.tags.map((x) => `<span class="tag">${esc(x)}</span>`).join("")}</div>` : ""}</div>
        <div class="contact-row">${contactButtons(c)}</div>
      </div></section>
      <section class="card"><div class="card-body kv">
        <div><span>${t("totalOrders")}</span><b>${num(c.order_count)}</b></div>
        <div><span>${t("openOrders")}</span><b>${num(open.length)}</b></div>
        <div><span>${t("totalPaid")}</span><b>${money(c.total_paid)}</b></div>
        <div><span>${t("clientSince")}</span><b>${fmtDay(String(c.created_at).slice(0, 10))}</b></div>
      </div></section>
      ${c.notes ? `<section class="card"><div class="card-head"><h2>${t("privateNotes")}</h2></div><div class="card-body"><p class="pre">${esc(c.notes)}</p></div></section>` : ""}
      <section class="card"><div class="card-body quick-list">
        <button type="button" data-action="edit-client">${I.pen}${t("editClient")}</button>
        <button type="button" data-action="archive-client">${I.archive}${c.archived_at ? t("restoreClient") : t("archiveClient")}</button>
      </div></section>
    </div></div>`;
}

export default {
  async render(arg) {
    if (arg) {
      C = await get(`/admin/clients/${arg}`);
      return { back: "#clients", eyebrow: `${t("client")}${C.vip ? " · VIP" : ""}`, title: esc(C.full_name),
        actions: `<a class="btn red" href="#order/new?client=${esc(C.id)}">${I.plus}${t("newOrder")}</a>`, body: profileHtml(C) };
    }
    const list = await get("/admin/clients", { q: Q, vip: vipOnly ? "1" : "" });
    const body = `<section class="card"><div class="toolbar">
        <label class="search-wrap">${I.search}<input class="search" id="client-search" type="search" placeholder="${t("searchClient")}" value="${esc(Q)}" aria-label="${t("searchClient")}"></label>
        <button class="chip" type="button" data-action="vip-only" aria-pressed="${vipOnly}">${I.star} VIP</button></div>
      <div id="client-list">${listHtml(list)}</div></section>`;
    return { eyebrow: t("clientsCount", { n: list.length }), title: t("nav_clients"), actions: `<button class="btn red" type="button" data-action="new-client">${I.userPlus}${t("newClient")}</button>`, body };
  },
  mount(arg) {
    if (arg) return;
    const s = $("#client-search");
    let timer;
    s.addEventListener("input", () => {
      clearTimeout(timer);
      timer = setTimeout(async () => { Q = s.value.trim(); $("#client-list").innerHTML = listHtml(await get("/admin/clients", { q: Q, vip: vipOnly ? "1" : "" })); }, 220);
    });
  },
};

on({
  "new-client": () => openClientForm({}, (c) => go(`clients/${c.id}`)),
  "edit-client": () => openClientForm(C, () => rerender()),
  "vip-only": () => { vipOnly = !vipOnly; rerender(); },
  "save-client": async (el) => {
    const form = $("#client-form");
    const fd = Object.fromEntries(new FormData(form));
    const body = { ...fd, vip: fd.vip === "on", tags: (fd.tags || "").split(",").map((x) => x.trim()).filter(Boolean) };
    const id = el.dataset.id;
    const after = drawerEl()._after;
    const c = await busy(el, () => (id ? put(`/admin/clients/${id}`, body) : post("/admin/clients", body)), $("#cf-msg"));
    if (!c) return;
    closeDrawer();
    toast(t("saved"));
    if (after) after(c);
  },
  "archive-client": async () => { await post(`/admin/clients/${C.id}/archive`, { archived: !C.archived_at }); toast(C.archived_at ? t("restored") : t("archivedToast")); go("clients"); },
  "add-measure": () => openDrawer(measureForm()),
  "save-measure": async (el) => {
    const form = $("#measure-form");
    const data = {};
    for (const [k, v] of new FormData(form).entries()) if (k.startsWith("m_") && String(v).trim()) data[k.slice(2)] = String(v).trim();
    const r = await busy(el, () => post(`/admin/clients/${C.id}/measurements`, { label: form.label.value, taken_on: form.taken_on.value, notes: form.notes.value, data }), $("#mf-msg"));
    if (r) { closeDrawer(); toast(t("saved")); rerender(); }
  },
  "delete-measure": (el) => armDelete(el, async () => { await del(`/admin/clients/${C.id}/measurements/${el.dataset.id}`); rerender(); }),
});
