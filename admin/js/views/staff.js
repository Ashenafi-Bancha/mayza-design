// Staff accounts and roles, and the activity log (owner only).
import { get, post, put } from "../api.js";
import { t, ago, fmtTime } from "../i18n.js";
import { state } from "../state.js";
import { $, esc, I, emptyBox, toast, busy, initials, openDrawer, drawerHead, closeDrawer } from "../ui.js";
import { on, rerender } from "../router.js";

const ROLES = ["owner", "manager", "editor", "tailor"];
let list = [];

function staffForm(s = { role: "manager", active: true }) {
  return `${drawerHead(t("nav_staff"), s.id ? esc(s.name || s.email) : t("addStaff"))}
    <form class="drawer-body" id="staff-form" novalidate>
      <div class="section-box">
        <label class="field"><span>${t("fullName")}</span><input name="name" value="${esc(s.name || "")}"></label>
        <label class="field"><span>${t("email")} *</span><input name="email" type="email" required value="${esc(s.email || "")}"></label>
      </div>
      <div class="section-box"><h3>${t("role")}</h3>
        <div class="role-pick">${ROLES.map((r) => `<label><input type="radio" name="role" value="${r}" ${s.role === r ? "checked" : ""}><span><b>${t("role_" + r)}</b><small>${t("roleHint_" + r)}</small></span></label>`).join("")}</div>
      </div>
      ${s.id ? `<div class="section-box"><label class="check"><input type="checkbox" name="active" ${s.active ? "checked" : ""}><span>${t("accountActive")}<small>${t("accountActiveHint")}</small></span></label></div>` : `<p class="muted">${t("tempPasswordHint")}</p>`}
      <p class="form-msg" id="sf-msg" role="status"></p>
    </form>
    <div class="drawer-foot">
      ${s.id ? `<button class="btn ghost small" type="button" data-action="staff-reset-password" data-id="${esc(s.id)}">${I.key}${t("resetPassword")}</button>
        ${s.totp_enabled ? `<button class="btn ghost small" type="button" data-action="staff-reset-2fa" data-id="${esc(s.id)}">${I.shield}${t("reset2fa")}</button>` : ""}` : ""}
      <span class="spacer"></span>
      <button class="btn ghost" type="button" data-action="close-drawer">${t("cancel")}</button>
      <button class="btn red" type="button" data-action="staff-save" data-id="${esc(s.id || "")}">${t("save")}</button></div>`;
}

function showPassword(s) {
  openDrawer(`${drawerHead(t("nav_staff"), t("passwordReady"))}<div class="drawer-body">
    <div class="section-box"><p>${t("passwordReadyText", { name: esc(s.name || s.email) })}</p>
      <div class="secret-box"><code>${esc(s.email)}</code><code class="big">${esc(s.password)}</code></div>
      <button class="btn ghost small" type="button" data-action="copy-text" data-text="${esc(`${s.email}\n${s.password}`)}">${I.copy}${t("copy")}</button>
      <p class="muted">${t("passwordOnce")}</p></div></div>
    <div class="drawer-foot"><span class="spacer"></span><button class="btn red" type="button" data-action="close-drawer">${t("done")}</button></div>`);
}

export const staff = {
  async render() {
    list = await get("/admin/staff");
    const rows = list.map((s) => `<button class="client-row ${s.active ? "" : "off"}" type="button" data-action="staff-edit" data-id="${esc(s.id)}">
      <span class="avatar">${esc(initials(s.name || s.email))}</span>
      <span class="cr-main"><b>${esc(s.name || s.email)}${s.id === state.me.id ? ` <small class="tag">${t("you")}</small>` : ""}</b><small>${esc(s.email)}</small></span>
      <span class="cr-side"><span class="role-tag ${s.role}">${t("role_" + s.role)}</span>
        <small>${s.active ? (s.totp_enabled ? `${I.shield} ${t("twoStepShort")}` : "") + (s.last_login_at ? " · " + ago(s.last_login_at) : ` · ${t("neverSignedIn")}`) : t("disabled")}</small></span></button>`).join("");
    const body = `<p class="intro">${t("staffIntro")}</p><section class="card"><div class="client-list">${rows}</div></section>`;
    return { eyebrow: t("staffCount", { n: list.filter((s) => s.active).length }), title: t("nav_staff"),
      actions: `<button class="btn red" type="button" data-action="staff-new">${I.userPlus}${t("addStaff")}</button>`, body };
  },
};

// ---------- activity ----------
let act = { q: "", user: "", items: [], more: false };
function actRows(items) {
  if (!items.length) return emptyBox(t("noActivity"), I.activity);
  return `<ol class="activity">${items.map((a) => `<li><span class="avatar sm">${esc(initials(a.user_label || "?"))}</span>
    <div><p><b>${esc(a.user_label || t("system"))}</b> ${esc(a.summary || a.action)}</p>
    <small><time title="${esc(fmtTime(a.created_at))}">${ago(a.created_at)}</time>${a.entity_type === "order" && a.entity_id ? ` · <a href="#order/${esc(a.entity_id)}">${t("openOrder")}</a>` : ""}${a.entity_type === "client" && a.entity_id ? ` · <a href="#clients/${esc(a.entity_id)}">${t("openClient")}</a>` : ""}${a.ip ? ` · ${esc(a.ip)}` : ""}</small></div></li>`).join("")}</ol>`;
}
async function loadActivity(before) {
  const items = await get("/admin/activity", { q: act.q, user: act.user, before });
  act.items = before ? act.items.concat(items) : items;
  act.more = items.length === 100;
}

export const activity = {
  async render() {
    const [people] = await Promise.all([get("/admin/staff"), loadActivity()]);
    const body = `<section class="card"><div class="toolbar">
        <label class="search-wrap">${I.search}<input class="search" id="act-q" type="search" placeholder="${t("searchActivity")}" value="${esc(act.q)}"></label>
        <select id="act-user" aria-label="${t("staffMember")}"><option value="">${t("everyone")}</option>${people.map((p) => `<option value="${esc(p.id)}" ${act.user === p.id ? "selected" : ""}>${esc(p.name || p.email)}</option>`).join("")}</select></div>
      <div class="card-body" id="act-list">${actRows(act.items)}</div>
      <div class="card-body" id="act-more" ${act.more ? "" : "hidden"}><button class="btn ghost" type="button" data-action="act-more">${t("loadMore")}</button></div></section>`;
    return { eyebrow: t("activityEyebrow"), title: t("nav_activity"), body };
  },
  mount() {
    const redraw = async () => { await loadActivity(); $("#act-list").innerHTML = actRows(act.items); $("#act-more").hidden = !act.more; };
    let timer;
    $("#act-q").addEventListener("input", (e) => { clearTimeout(timer); timer = setTimeout(() => { act.q = e.target.value.trim(); redraw(); }, 250); });
    $("#act-user").addEventListener("change", (e) => { act.user = e.target.value; redraw(); });
  },
};

on({
  "staff-new": () => openDrawer(staffForm()),
  "staff-edit": (el) => openDrawer(staffForm(list.find((s) => s.id === el.dataset.id))),
  "staff-save": async (el) => {
    const form = $("#staff-form");
    const fd = Object.fromEntries(new FormData(form));
    const id = el.dataset.id;
    const body = { name: fd.name, email: fd.email, role: fd.role, active: id ? fd.active === "on" : true };
    const r = await busy(el, () => (id ? put(`/admin/staff/${id}`, body) : post("/admin/staff", body)), $("#sf-msg"));
    if (!r) return;
    toast(t("saved"));
    if (r.password) showPassword(r); else closeDrawer();
    rerender();
  },
  "staff-reset-password": async (el) => { const r = await busy(el, () => post(`/admin/staff/${el.dataset.id}/reset-password`)); if (r) showPassword(r); },
  "staff-reset-2fa": async (el) => { const r = await busy(el, () => post(`/admin/staff/${el.dataset.id}/reset-2fa`)); if (r) { toast(t("twoStepReset")); closeDrawer(); rerender(); } },
  "copy-text": async (el) => { try { await navigator.clipboard.writeText(el.dataset.text); toast(t("copied")); } catch (e) { toast(t("copyFailed")); } },
  "act-more": async () => { await loadActivity(act.items[act.items.length - 1].id); $("#act-list").innerHTML = actRows(act.items); $("#act-more").hidden = !act.more; },
});
