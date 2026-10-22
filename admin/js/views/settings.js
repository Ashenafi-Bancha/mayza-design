// Settings: website contact details and announcement (owner), and every
// staff member's own account: password and two-step sign-in.
import { get, post, put } from "../api.js";
import { t, lang } from "../i18n.js";
import { state, can } from "../state.js";
import { $, esc, I, toast, busy } from "../ui.js";
import { on, route, rerender } from "../router.js";

const KEYS = ["phone", "phone2", "whatsapp", "telegram", "address_en", "address_am", "hours_en", "hours_am", "facebook", "tiktok", "instagram", "stat_facebook", "stat_tiktok", "stat_likes", "announce_on", "announce_en", "announce_am"];

function siteSettings(s) {
  const f = (key, label, type = "text") => `<label class="field"><span>${label}</span><input name="${key}" type="${type}" value="${esc(s[key])}"></label>`;
  return `<form class="settings" id="settings-form" novalidate>
    <section class="card" id="announce"><div class="card-head"><h2>${t("announce")}</h2></div><div class="card-body">
      <p class="hint">${t("announceHint")}</p>
      <label class="check"><input name="announce_on" type="checkbox" ${s.announce_on ? "checked" : ""}><span>${t("announceOn")}</span></label>
      <div class="grid-2">${f("announce_en", t("announceEn"))}${f("announce_am", t("announceAm"))}</div>
      <div><span class="label">${t("preview")}</span><div class="announce-preview" id="announce-preview"></div></div></div></section>
    <section class="card"><div class="card-head"><h2>${t("contact")}</h2></div><div class="card-body"><p class="hint">${t("contactHint")}</p>
      <div class="grid-2">${f("phone", t("phoneMain"), "tel")}${f("phone2", t("phone2"), "tel")}</div>
      <div class="grid-2">${f("whatsapp", t("whatsappNum"), "tel")}${f("telegram", t("telegramVal"))}</div></div></section>
    <section class="card"><div class="card-head"><h2>${t("location")}</h2></div><div class="card-body">
      <div class="grid-2">${f("address_en", t("addressEn"))}${f("address_am", t("addressAm"))}</div>
      <div class="grid-2">${f("hours_en", t("hoursEn"))}${f("hours_am", t("hoursAm"))}</div></div></section>
    <section class="card"><div class="card-head"><h2>${t("socialLinks")}</h2></div><div class="card-body">
      ${f("facebook", "Facebook", "url")}${f("tiktok", "TikTok", "url")}${f("instagram", "Instagram", "url")}</div></section>
    <section class="card"><div class="card-head"><h2>${t("stats")}</h2></div><div class="card-body"><p class="hint">${t("statsHint")}</p>
      <div class="grid-3">${f("stat_facebook", t("statFb"))}${f("stat_tiktok", t("statTt"))}${f("stat_likes", t("statLikes"))}</div></div></section>
    <div class="save-bar"><button class="btn red" type="submit">${t("saveSettings")}</button></div>
  </form>`;
}

function account() {
  const me = state.me;
  return `<section class="card"><div class="card-head"><h2>${t("twoStep")}</h2>${me.totp_enabled ? `<span class="paytag paid">${I.shield}${t("on")}</span>` : `<span class="paytag unpaid">${t("off")}</span>`}</div><div class="card-body">
      <p class="hint">${t("twoStepExplain")}</p>
      ${me.totp_enabled
        ? (me.must_keep_2fa ? `<p class="muted">${t("ownerKeeps2fa")}</p>` : `<form class="inline-form" id="off-2fa"><label class="field"><span>${t("password")}</span><input name="password" type="password" autocomplete="current-password"></label><button class="btn ghost" type="submit">${t("turnOff2fa")}</button></form>`)
        : `<div id="setup-2fa"><button class="btn red" type="button" data-action="start-2fa">${I.shield}${t("turnOn2fa")}</button></div>`}
    </div></section>
    <section class="card"><div class="card-head"><h2>${t("changePassword")}</h2></div><div class="card-body">
      <form class="grid-2" id="pw-form"><label class="field"><span>${t("currentPassword")}</span><input name="current" type="password" autocomplete="current-password"></label>
        <label class="field"><span>${t("newPassword")}</span><input name="next" type="password" autocomplete="new-password" minlength="8"><small>${t("pwShort")}</small></label>
        <div><button class="btn ghost" type="submit">${t("changePassword")}</button></div></form></div></section>`;
}

export default {
  async render(arg) {
    const site = can("settings");
    if (site) state.settings = (await get("/settings")).data || {};
    const body = `<div class="settings-page">${site ? siteSettings(state.settings) : ""}<div class="settings"><h2 class="sub-title">${t("yourAccount")}</h2>${account()}</div></div>`;
    void arg;
    return { eyebrow: esc(state.me.email), title: t("nav_settings"), body };
  },
  mount() {
    const form = $("#settings-form");
    if (form) {
      const prev = $("#announce-preview");
      const draw = () => {
        const txt = (lang() === "am" ? form.announce_am.value : "") || form.announce_en.value;
        prev.innerHTML = txt ? `<b>✦</b> ${esc(txt)}` : "—";
        prev.style.opacity = form.announce_on.checked ? 1 : 0.45;
      };
      form.addEventListener("input", draw);
      draw();
      if (route().arg === "announce") setTimeout(() => $("#announce").scrollIntoView({ behavior: "smooth" }), 60);
      form.addEventListener("submit", async (e) => {
        e.preventDefault();
        const next = {};
        KEYS.forEach((k) => { const el = form.elements[k]; if (el) next[k] = el.type === "checkbox" ? el.checked : el.value.trim(); });
        const r = await busy(form.querySelector("button[type=submit]"), () => put("/admin/settings", next));
        if (r) { state.settings = next; toast(t("settingsSaved")); }
      });
    }
    $("#pw-form").addEventListener("submit", async (e) => {
      e.preventDefault();
      const f = e.target;
      if (f.next.value.length < 8) { toast(t("pwShort")); return; }
      const r = await busy(f.querySelector("button"), () => post("/auth/password", { current: f.current.value, next: f.next.value }));
      if (r) { f.reset(); toast(t("pwChanged")); }
    });
    $("#off-2fa")?.addEventListener("submit", async (e) => {
      e.preventDefault();
      const r = await busy(e.target.querySelector("button"), () => post("/auth/2fa/disable", { password: e.target.password.value }));
      if (r) { state.me = r.user; toast(t("twoStepOff")); rerender(); }
    });
  },
};

on({
  "start-2fa": async (el) => {
    const data = await busy(el, () => post("/auth/2fa/setup"));
    if (!data) return;
    $("#setup-2fa").innerHTML = `<ol class="steps-list"><li>${t("setupStep1")}</li><li>${t("setupStep2")}<div class="qr">${data.qr}</div>
      <details><summary>${t("cantScan")}</summary><code class="secret">${esc(data.secret.replace(/(.{4})/g, "$1 ").trim())}</code></details></li><li>${t("setupStep3")}</li></ol>
      <form class="inline-form" id="on-2fa"><label class="field"><span>${t("code6")}</span><input name="code" class="code-input" inputmode="numeric" maxlength="6" autocomplete="one-time-code"></label>
      <button class="btn red" type="submit">${t("turnOn2fa")}</button></form>`;
    $("#on-2fa").addEventListener("submit", async (e) => {
      e.preventDefault();
      const r = await busy(e.target.querySelector("button"), () => post("/auth/2fa/enable", { code: e.target.code.value.trim() }));
      if (r) { state.me = r.user; toast(t("twoStepOn")); rerender(); }
    });
  },
});
