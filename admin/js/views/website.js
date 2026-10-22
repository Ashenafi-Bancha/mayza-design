// Website text and photos. The editable fields are read from the live pages
// (elements marked data-cms), so the editor always matches the site.
import { get, put, upload, imgUrl } from "../api.js";
import { t, lang } from "../i18n.js";
import { $, esc, I, toast } from "../ui.js";
import { on, rerender } from "../router.js";

const PAGES = [["index", "pageHome"], ["collections", "pageCollections"], ["custom", "pageCustom"], ["about", "pageAbout"], ["contact", "pageContact"]];
const W = { page: "index", content: null, draft: null, fields: {} };
const draft = () => W.draft || W.content;
const dirty = () => W.draft !== null && JSON.stringify(W.draft) !== JSON.stringify(W.content);

async function fieldsOf(page) {
  if (W.fields[page]) return W.fields[page];
  const res = await fetch(`../${page}.html`, { cache: "no-cache" });
  if (!res.ok) throw new Error(`${res.status}`);
  const doc = new DOMParser().parseFromString(await res.text(), "text/html");
  return (W.fields[page] = [...doc.querySelectorAll("[data-cms], [data-cms-img]")].map((el) => {
    const img = el.hasAttribute("data-cms-img");
    return {
      key: el.getAttribute(img ? "data-cms-img" : "data-cms"), img,
      label: el.getAttribute("data-cms-label") || "", labelAm: el.getAttribute("data-cms-label-am") || "",
      en: img ? "" : el.textContent.replace(/\s+/g, " ").trim(),
      am: img ? "" : (el.getAttribute("data-am") || "").replace(/\s+/g, " ").trim(),
      src: img ? el.getAttribute("src") : "",
    };
  }));
}

async function draw() {
  const box = $("#cms-body");
  if (!box) return;
  let fields;
  try { fields = await fieldsOf(W.page); } catch (err) { box.innerHTML = `<div class="empty"><p>${esc(err.message)}</p></div>`; return; }
  const groups = [];
  fields.forEach((f) => { const sec = f.key.split(".")[1]; let g = groups.find((x) => x.sec === sec); if (!g) groups.push((g = { sec, fields: [] })); g.fields.push(f); });
  const d = draft();
  const fieldHtml = (f) => {
    const cur = d[f.key] || {};
    const edited = Boolean(cur.en || cur.am || cur.img);
    const head = `<div class="cms-label"><b>${esc(lang() === "am" && f.labelAm ? f.labelAm : f.label)}</b>${edited ? `<span class="tag gold">${t("edited")}</span><button class="link-btn" type="button" data-action="cms-restore" data-key="${esc(f.key)}">${t("restore")}</button>` : ""}</div>`;
    if (f.img) return `<div class="cms-field">${head}<label class="photo-drop wide has" style="background-image:url('${esc(imgUrl(cur.img || f.src))}')"><input type="file" accept="image/*" data-cms-file="${esc(f.key)}"><span>${t("changePhoto")}</span></label></div>`;
    const long = f.en.length > 70;
    const input = (l) => {
      const orig = l === "en" ? f.en : f.am;
      return `<label class="field"><span>${t(l === "en" ? "english" : "amharic")}</span>${long
        ? `<textarea data-cms-key="${esc(f.key)}" data-cms-lang="${l}" placeholder="${esc(orig)}">${esc(cur[l] || "")}</textarea>`
        : `<input data-cms-key="${esc(f.key)}" data-cms-lang="${l}" placeholder="${esc(orig)}" value="${esc(cur[l] || "")}">`}</label>`;
    };
    return `<div class="cms-field">${head}<div class="grid-2">${input("en")}${input("am")}</div></div>`;
  };
  box.innerHTML = groups.map((g) => `<section class="card"><div class="card-head"><h2>${t("s_" + g.sec)}</h2></div><div class="card-body cms-fields">${g.fields.map(fieldHtml).join("")}</div></section>`).join("");
}

function set(key, patch) {
  if (W.draft === null) W.draft = JSON.parse(JSON.stringify(W.content));
  const next = { ...(W.draft[key] || {}), ...patch };
  Object.keys(next).forEach((k) => { if (!next[k]) delete next[k]; });
  if (Object.keys(next).length) W.draft[key] = next; else delete W.draft[key];
  const bar = $("#cms-save");
  if (bar) bar.hidden = !dirty();
}

export default {
  async render() {
    if (W.content === null) W.content = (await get("/content")).data || {};
    const tabs = PAGES.map(([p, k]) => `<button class="chip" type="button" data-action="cms-page" data-page="${p}" aria-pressed="${W.page === p}">${t(k)}</button>`).join("");
    const body = `<p class="intro">${t("websiteIntro")}</p>
      <div class="cms-bar card"><div class="chips">${tabs}</div><a class="btn ghost small" href="../${W.page}.html" target="_blank" rel="noopener">${I.ext}${t("openPage")}</a></div>
      <div id="cms-body" class="cms"><div class="loading"><div class="spinner"></div></div></div>
      <div class="save-bar cms-save" id="cms-save" ${dirty() ? "" : "hidden"}><span>${t("unsaved")}</span>
        <button class="btn ghost" type="button" data-action="cms-discard">${t("discard")}</button>
        <button class="btn red" type="button" data-action="cms-save">${t("saveChanges")}</button></div>`;
    return { eyebrow: t("cmsEyebrow"), title: t("nav_website"), body };
  },
  mount() { draw(); },
};

on({
  "cms-page": (el) => { W.page = el.dataset.page; rerender(); },
  "cms-restore": (el) => { set(el.dataset.key, { en: "", am: "", img: "" }); draw(); },
  "cms-discard": () => { W.draft = null; rerender(); },
  "cms-save": async (el) => {
    el.disabled = true; el.textContent = t("saving");
    try { await put("/admin/content", W.draft); W.content = W.draft; W.draft = null; rerender(); toast(t("contentSaved")); }
    catch (err) { toast(err.message); el.disabled = false; el.textContent = t("saveChanges"); }
  },
});

document.addEventListener("input", (e) => { const f = e.target.closest("[data-cms-key]"); if (f) set(f.dataset.cmsKey, { [f.dataset.cmsLang]: f.value }); });
document.addEventListener("change", async (e) => {
  const f = e.target.closest("[data-cms-file]");
  if (!f || !f.files[0]) return;
  const label = f.parentElement.querySelector("span");
  label.textContent = t("uploading");
  try { const { url } = await upload(f.files[0]); set(f.dataset.cmsFile, { img: url }); draw(); }
  catch (err) { toast(err.message); label.textContent = t("changePhoto"); }
});
addEventListener("beforeunload", (e) => { if (dirty()) { e.preventDefault(); e.returnValue = ""; } });
