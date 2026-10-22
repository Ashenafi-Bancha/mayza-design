// Mayza Admin: start-up, sign-in (with two-step codes), the menu and routing.
import { api, get, post, setSignedOutHandler } from "./api.js";
import { t, lang, setLang } from "./i18n.js";
import { state, can, routesFor } from "./state.js";
import { $, esc, I, toast, chime, closeDrawer, drawerOpen, openDrawer, drawerHead } from "./ui.js";
import { actions, on, route, go, setRender, rerender } from "./router.js";
import dashboard from "./views/dashboard.js";
import inbox from "./views/inbox.js";
import order from "./views/order.js";
import calendar from "./views/calendar.js";
import clients from "./views/clients.js";
import { products, collections } from "./views/catalog.js";
import website from "./views/website.js";
import { staff, activity } from "./views/staff.js";
import settings from "./views/settings.js";

const VIEWS = { dashboard, inbox, order, calendar, clients, products, collections, website, staff, activity, settings };
const ICONS = { dashboard: I.home, inbox: I.inbox, calendar: I.calendar, clients: I.users, products: I.tag, collections: I.layers, website: I.pen, staff: I.shield, activity: I.activity, settings: I.gear };
const root = $("#root");
const logo = "../images/logo-red-160.webp";

const langToggle = () => `<div class="lang-mini" role="group" aria-label="Language">
  <button type="button" data-action="lang" data-lang="en" aria-pressed="${lang() === "en"}">EN</button>
  <button type="button" data-action="lang" data-lang="am" aria-pressed="${lang() === "am"}" style="font-family:system-ui,sans-serif">አማ</button></div>`;

// ---------- sign-in screens ----------
function authFrame(inner) {
  document.documentElement.lang = lang();
  document.title = t("appName");
  root.innerHTML = `<div class="login">
    <div class="login-art"><div><h2>${t("artTitle")}</h2><p>${t("artText")}</p></div></div>
    <div class="login-panel">
      <div class="brand"><img src="${logo}" alt="" width="52" height="52"><div><b>Mayza Design</b><small>${t("admin")}</small></div></div>
      ${langToggle()}
      ${inner}
    </div></div>`;
}

let authScreen = () => renderLogin();

function renderLogin(msg = "") {
  authScreen = () => renderLogin();
  authFrame(`<h1>${t("signInTitle")}</h1>
    <form class="login-form" id="login-form" novalidate>
      <label class="field"><span>${t("email")}</span><input name="email" type="email" autocomplete="username" required autofocus></label>
      <label class="field"><span>${t("password")}</span><input name="password" type="password" autocomplete="current-password" required></label>
      <button class="btn red" type="submit">${t("signIn")}</button>
      <small class="muted">${t("forgotHint")}</small>
      <p class="form-msg" role="status">${esc(msg)}</p>
    </form>`);
  const form = $("#login-form");
  form.email.focus();
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const btn = form.querySelector("button");
    const m = form.querySelector(".form-msg");
    btn.disabled = true; btn.textContent = t("signingIn"); m.textContent = "";
    try {
      const r = await post("/auth/login", { email: form.email.value.trim(), password: form.password.value });
      if (r.mfa) renderCode(); else await afterSignIn(r.user);
    } catch (err) {
      m.textContent = err.message;
      btn.disabled = false; btn.textContent = t("signIn");
    }
  });
}

function codeInput() {
  return `<label class="field"><span>${t("code6")}</span><input name="code" class="code-input" inputmode="numeric" autocomplete="one-time-code" maxlength="6" pattern="[0-9]{6}" required autofocus></label>`;
}

function renderCode(msg = "") {
  authScreen = () => renderCode();
  authFrame(`<h1>${t("twoStepTitle")}</h1><p class="muted" style="max-width:40ch">${t("twoStepText")}</p>
    <form class="login-form" id="code-form" novalidate>${codeInput()}
      <button class="btn red" type="submit">${t("verify")}</button>
      <button class="link-btn" type="button" data-action="back-to-login">${t("useOtherAccount")}</button>
      <p class="form-msg" role="status">${esc(msg)}</p></form>`);
  const form = $("#code-form");
  form.code.focus();
  const submit = async () => {
    const btn = form.querySelector("button[type=submit]");
    const m = form.querySelector(".form-msg");
    btn.disabled = true; m.textContent = "";
    try { const r = await post("/auth/totp", { code: form.code.value.trim() }); await afterSignIn(r.user); }
    catch (err) {
      if (err.code === "mfa_expired") return renderLogin(err.message);
      m.textContent = err.message; btn.disabled = false; form.code.select();
    }
  };
  form.addEventListener("submit", (e) => { e.preventDefault(); submit(); });
  form.code.addEventListener("input", () => { form.code.value = form.code.value.replace(/\D/g, ""); if (form.code.value.length === 6) submit(); });
}

async function renderSetup2fa() {
  authScreen = () => renderSetup2fa();
  authFrame(`<h1>${t("setup2faTitle")}</h1><p class="muted" style="max-width:46ch">${t("setup2faText")}</p><div id="qr-box" class="qr-box"><div class="spinner"></div></div>`);
  let data;
  try { data = await post("/auth/2fa/setup"); } catch (err) { $("#qr-box").innerHTML = `<p class="form-msg">${esc(err.message)}</p>`; return; }
  $("#qr-box").outerHTML = `<ol class="steps-list">
      <li>${t("setupStep1")}</li>
      <li>${t("setupStep2")}<div class="qr">${data.qr}</div>
        <details><summary>${t("cantScan")}</summary><code class="secret">${esc(data.secret.replace(/(.{4})/g, "$1 ").trim())}</code></details></li>
      <li>${t("setupStep3")}</li></ol>
    <form class="login-form" id="enable-form" novalidate>${codeInput()}
      <button class="btn red" type="submit">${t("turnOn2fa")}</button>
      <button class="link-btn" type="button" data-action="signout">${t("signOut")}</button>
      <p class="form-msg" role="status"></p></form>`;
  const form = $("#enable-form");
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const m = form.querySelector(".form-msg");
    try { const r = await post("/auth/2fa/enable", { code: form.code.value.trim() }); toast(t("twoStepOn")); await afterSignIn(r.user); }
    catch (err) { m.textContent = err.message; }
  });
}

function renderNoDatabase() {
  authScreen = renderNoDatabase;
  authFrame(`<h1>${t("noDbTitle")}</h1><div class="demo-card"><p>${t("noDbText")}</p>
    <pre class="cmd">npm run migrate\nnpm run create-admin\nnpm run seed</pre><p><small>${t("noDbHint")}</small></p></div>`);
}

async function afterSignIn(user) {
  state.me = user;
  if (user.needs_2fa_setup) return renderSetup2fa();
  await enter();
}

// ---------- signed in ----------
async function loadBasics() {
  const jobs = [get("/settings").then((r) => { state.settings = r.data || {}; })];
  if (can("orders") || can("production")) jobs.push(get("/admin/staff/options").then((r) => { state.staffOptions = r; }));
  if (can("catalog.read") || can("catalog")) {
    jobs.push(get("/admin/products").then((r) => { state.products = r; }));
    jobs.push(get("/admin/collections").then((r) => { state.collections = r; }));
  }
  await Promise.all(jobs);
}

let pollTimer;
async function poll() {
  if (!(can("orders") || can("production")) || document.hidden) return;
  try {
    const r = await get("/admin/orders/stamp");
    const changed = state.stamp && r.stamp !== state.stamp;
    if (changed && r.fresh > state.newCount && can("orders")) { toast(t("newInquiry"), "new"); chime(); }
    state.stamp = r.stamp;
    state.newCount = r.fresh;
    updateBadges();
    if (changed && !drawerOpen() && ["dashboard", "inbox"].includes(route().name) && !document.activeElement.matches("input, textarea, select")) rerender();
  } catch (e) {}
}

async function enter() {
  root.innerHTML = `<div class="boot"><img src="${logo}" alt="" width="56" height="56"></div>`;
  try { await loadBasics(); } catch (err) {
    root.innerHTML = `<div class="empty" style="min-height:100vh;align-content:center"><p>${esc(err.message)}</p><button class="btn" data-action="retry">${t("retry")}</button></div>`;
    return;
  }
  if (!location.hash) location.hash = "dashboard";
  await poll();
  clearInterval(pollTimer);
  pollTimer = setInterval(poll, 20000);
  render();
}

function updateBadges() {
  document.querySelectorAll("[data-badge=inbox]").forEach((b) => { b.textContent = state.newCount || ""; b.hidden = !state.newCount; });
  document.title = (state.newCount && can("orders") ? `(${state.newCount}) ` : "") + t("appName");
}

function shell(r) {
  const list = routesFor();
  const tabs = list.slice(0, 4);
  const link = (x) => `<a href="#${x}" ${x === r ? 'aria-current="page"' : ""}>${ICONS[x]}<span>${t("nav_" + x)}</span>${x === "inbox" ? `<b class="badge" data-badge="inbox" ${state.newCount && can("orders") ? "" : "hidden"}>${state.newCount || ""}</b>` : ""}</a>`;
  const me = state.me;
  return `<div class="shell">
    <aside class="side">
      <a class="brand" href="#dashboard"><img src="../images/logo-white-160.webp" alt="" width="40" height="40"><span><b>Mayza Design</b><small>${t("admin")}</small></span></a>
      ${can("orders") ? `<a class="btn red side-cta" href="#order/new">${I.plus}${t("newOrder")}</a>` : ""}
      <nav class="nav" aria-label="Admin">${list.map(link).join("")}</nav>
      <div class="side-foot">
        <div class="who-am-i"><span class="avatar">${esc((me.name || me.email).trim().charAt(0).toUpperCase())}</span>
          <span><small>${t("role_" + me.role)}</small><b>${esc(me.name || me.email)}</b></span></div>
        ${langToggle()}
        <a href="../index.html" target="_blank" rel="noopener">${I.ext}<span>${t("viewSite")}</span></a>
        <button class="plain" type="button" data-action="signout">${I.out}<span>${t("signOut")}</span></button>
      </div>
    </aside>
    <div class="main">
      <div class="mobile-head"><img src="../images/logo-white-160.webp" alt="" width="32" height="32"><b>Mayza Design</b>${langToggle()}
        <button class="icon-btn" type="button" data-action="signout" aria-label="${t("signOut")}">${I.out}</button></div>
      <div id="view"></div>
    </div>
    <nav class="tabbar" aria-label="Admin">${tabs.map(link).join("")}
      <a href="#" data-action="more-menu" ${list.slice(4).includes(r) ? 'aria-current="page"' : ""}>${I.menu}<span>${t("more")}</span></a></nav>
    ${can("orders") && !["order"].includes(r) ? `<a class="fab" href="#order/new" aria-label="${t("newOrder")}">${I.plus}</a>` : ""}
  </div>`;
}

let renderSeq = 0;
async function render() {
  if (!state.me) return;
  const { name, arg } = route();
  const allowed = routesFor();
  const view = VIEWS[name];
  if (!view || (name !== "order" && !allowed.includes(name)) || (name === "order" && !(can("orders") || can("production")))) { go("dashboard"); return; }
  if (!root.querySelector(".shell") || root.dataset.route !== name) {
    root.innerHTML = shell(name);
    root.dataset.route = name;
  }
  document.documentElement.lang = lang();
  updateBadges();
  const box = $("#view");
  const seq = ++renderSeq;
  if (!box.firstElementChild) box.innerHTML = `<div class="loading"><div class="spinner"></div></div>`;
  try {
    const out = await view.render(arg);
    if (seq !== renderSeq) return;
    box.innerHTML = `<header class="top">${out.back ? `<a class="back" href="${out.back}">${I.arrowLeft}${t("back")}</a>` : ""}
        <div><p class="eyebrow">${out.eyebrow || ""}</p><h1>${out.title}</h1></div><div class="top-actions">${out.actions || ""}</div></header>
      <div class="view">${out.body}</div>`;
    if (view.mount) view.mount(arg);
  } catch (err) {
    if (seq !== renderSeq) return;
    if (err.status === 401) return;
    box.innerHTML = `<div class="empty" style="padding-top:80px"><p>${esc(err.message)}</p><button class="btn" data-action="rerender">${t("retry")}</button></div>`;
  }
}
setRender(render);

function moreMenu() {
  const list = routesFor().slice(4);
  openDrawer(`${drawerHead(t("admin"), t("more"))}<div class="drawer-body"><nav class="more-nav">
    ${list.map((x) => `<a href="#${x}" data-action="close-drawer-go" data-href="#${x}">${ICONS[x]}<span>${t("nav_" + x)}</span>${I.chevron}</a>`).join("")}
    <a href="../index.html" target="_blank" rel="noopener">${I.ext}<span>${t("viewSite")}</span>${I.chevron}</a></nav></div>`);
}

async function signOut() {
  try { await post("/auth/logout"); } catch (e) {}
  clearInterval(pollTimer);
  state.me = null; state.stamp = null;
  root.dataset.route = "";
  closeDrawer();
  history.replaceState(null, "", location.pathname);
  renderLogin();
}

// ---------- global events ----------
on({
  lang: (el) => { setLang(el.dataset.lang); if (state.me && root.querySelector(".shell")) { root.dataset.route = ""; render(); } else authScreen(); },
  signout: signOut,
  retry: () => enter(),
  rerender: () => render(),
  "back-to-login": () => renderLogin(),
  "close-drawer": () => closeDrawer(),
  "close-drawer-go": (el) => { closeDrawer(); location.hash = el.dataset.href; },
  "more-menu": moreMenu,
});

document.addEventListener("click", (e) => {
  const el = e.target.closest("[data-action]");
  if (!el) return;
  const fn = actions[el.dataset.action];
  if (!fn) return;
  if (el.tagName === "A" || el.tagName === "BUTTON") e.preventDefault();
  Promise.resolve(fn(el, e)).catch((err) => toast(err.message));
});
document.addEventListener("keydown", (e) => { if (e.key === "Escape" && drawerOpen()) closeDrawer(); });
addEventListener("hashchange", () => { if (state.me) { if (drawerOpen()) closeDrawer(); render(); } });
document.addEventListener("visibilitychange", () => { if (!document.hidden && state.me) poll(); });

setSignedOutHandler(() => { if (state.me) { state.me = null; clearInterval(pollTimer); root.dataset.route = ""; closeDrawer(); renderLogin(t("sessionEnded")); } });

// ---------- start ----------
(async () => {
  setLang(lang());
  try {
    const health = await get("/health");
    if (!health.configured) return renderNoDatabase();
    const r = await api("/auth/me");
    await afterSignIn(r.user);
  } catch (err) {
    if (err.status === 401) renderLogin(); else renderLogin(err.message);
  }
})();
