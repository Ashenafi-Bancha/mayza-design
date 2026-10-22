// Products and collections (carried over from the first admin, now role-aware).
import { get, post, put, del, upload, imgUrl } from "../api.js";
import { t, money } from "../i18n.js";
import { state } from "../state.js";
import { $, esc, I, emptyBox, toast, busy, armDelete, nameOf, openDrawer, drawerHead, closeDrawer, drawerEl } from "../ui.js";
import { on, rerender } from "../router.js";

const ui = { line: "all", q: "" };
const colName = (slug) => { const c = state.collections.find((x) => x.slug === slug); return c ? nameOf(c) : slug; };
const colOptions = (val) => state.collections.map((c) => `<option value="${esc(c.slug)}" ${c.slug === val ? "selected" : ""}>${esc(nameOf(c))}</option>`).join("");
async function reload() {
  [state.products, state.collections] = await Promise.all([get("/admin/products"), get("/admin/collections")]);
}

// ---------- shared photo picker ----------
function photoDrop(prefix, url, wide = false) {
  return `<label class="photo-drop ${wide ? "wide" : ""} ${url ? "has" : ""}" id="${prefix}-drop" style="${url ? `background-image:url('${esc(imgUrl(url))}')` : ""}">
      <input id="${prefix}-file" type="file" accept="image/*"><span>${url ? t("changePhoto") : `${I.image}${t("choosePhoto")}`}</span></label>
    <small class="muted">${t("photoHint")}</small>`;
}
function bindPhotoDrop(prefix, onDone, saveAction) {
  const d = drawerEl();
  const drop = d.querySelector(`#${prefix}-drop`);
  const input = d.querySelector(`#${prefix}-file`);
  const msg = d.querySelector(`#${prefix}-msg`);
  const saveBtn = () => d.querySelector(`[data-action="${saveAction}"]`);
  const take = async (file) => {
    if (!file) return;
    msg.className = "form-msg ok"; msg.textContent = t("uploading");
    if (saveBtn()) saveBtn().disabled = true;
    try {
      const { url } = await upload(file);
      onDone(url);
      drop.classList.add("has");
      drop.style.backgroundImage = `url('${imgUrl(url)}')`;
      drop.querySelector("span").textContent = t("changePhoto");
      msg.textContent = "";
    } catch (err) { msg.className = "form-msg"; msg.textContent = err.message; }
    finally { if (saveBtn()) saveBtn().disabled = false; }
  };
  input.addEventListener("change", () => take(input.files[0]));
  ["dragenter", "dragover"].forEach((ev) => drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.add("drag"); }));
  ["dragleave", "drop"].forEach((ev) => drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.remove("drag"); }));
  drop.addEventListener("drop", (e) => take(e.dataTransfer.files[0]));
}
const val = (id) => { const el = drawerEl().querySelector("#" + id); return el ? el.value.trim() : ""; };

// ---------- products ----------
function productCards() {
  const q = ui.q.toLowerCase();
  const list = state.products.filter((p) => (ui.line === "all" || p.line === ui.line) && (!q || [p.name_en, p.name_am, p.description_en].some((v) => String(v || "").toLowerCase().includes(q))));
  if (!list.length) return `<div class="card">${emptyBox(t("noProducts"), I.tag)}</div>`;
  return `<div class="products">${list.map((p) => `<article class="card product ${p.visible ? "" : "is-hidden"}">
      <button class="ph" type="button" data-action="edit-product" data-id="${esc(p.id)}" aria-label="${t("edit")}: ${esc(p.name_en)}">
        ${p.image_url ? `<img src="${esc(imgUrl(p.image_url))}" alt="" loading="lazy">` : ""}
        <span class="tags">${p.featured ? `<span class="tag gold">${t("featured")}</span>` : ""}${p.visible ? "" : `<span class="tag off">${t("hidden")}</span>`}</span></button>
      <div class="meta"><b>${esc(nameOf(p))}</b><small>${esc(colName(p.line))}</small>
        ${p.price != null ? `<span class="price">${money(p.price)}</span>` : `<span class="price muted">${t("priceRequest")}</span>`}
        <div class="foot"><label><span class="switch"><input type="checkbox" data-toggle-product="${esc(p.id)}" ${p.visible ? "checked" : ""} aria-label="${t("visible")}"><span></span></span>${p.visible ? t("onSite") : t("hidden")}</label>
          <button class="btn ghost small" type="button" data-action="edit-product" data-id="${esc(p.id)}">${t("edit")}</button></div></div></article>`).join("")}</div>`;
}

let pendingImage = null;
function openProduct(p, copy = false) {
  const isNew = !p || copy;
  p = p || { line: ui.line !== "all" ? ui.line : (state.collections[0] || {}).slug, visible: true, featured: false, sort: state.products.reduce((m, x) => Math.max(m, x.sort || 0), 0) + 1 };
  pendingImage = p.image_url || null;
  openDrawer(`${drawerHead(t("nav_products"), isNew ? t("newProduct") : t("editProduct"))}
    <form class="drawer-body" novalidate>
      <div class="section-box"><h3>${t("photo")}</h3>${photoDrop("pf", pendingImage)}</div>
      <div class="section-box">
        <div class="grid-2"><label class="field"><span>${t("nameEn")}</span><input id="pf-name_en" value="${esc(p.name_en)}"></label>
          <label class="field"><span>${t("nameAm")}</span><input id="pf-name_am" value="${esc(p.name_am)}"></label></div>
        <div class="grid-2"><label class="field"><span>${t("collection")}</span><select id="pf-line">${colOptions(p.line)}</select></label>
          <label class="field"><span>${t("priceOpt")}</span><input id="pf-price" inputmode="numeric" value="${p.price ?? ""}"><small>${t("priceOptHint")}</small></label></div>
        <label class="field"><span>${t("descEn")}</span><textarea id="pf-description_en">${esc(p.description_en)}</textarea></label>
        <label class="field"><span>${t("descAm")}</span><textarea id="pf-description_am">${esc(p.description_am)}</textarea></label>
      </div>
      <div class="section-box">
        <label class="check"><input id="pf-visible" type="checkbox" ${p.visible ? "checked" : ""}><span>${t("visible")}</span></label>
        <label class="check"><input id="pf-featured" type="checkbox" ${p.featured ? "checked" : ""}><span>${t("featuredLabel")}<small>${t("featuredHint")}</small></span></label>
        <label class="field" style="max-width:160px"><span>${t("position")}</span><input id="pf-sort" inputmode="numeric" value="${p.sort ?? 0}"><small>${t("positionHint")}</small></label>
      </div>
      <p class="form-msg" id="pf-msg" role="status"></p>
    </form>
    <div class="drawer-foot">
      ${isNew ? "" : `<button class="btn danger small" type="button" data-action="delete-product" data-id="${esc(p.id)}">${t("delete")}</button>
      <button class="btn ghost small" type="button" data-action="duplicate-product" data-id="${esc(p.id)}">${I.copy}${t("duplicate")}</button>`}
      <span class="spacer"></span>
      <button class="btn ghost" type="button" data-action="close-drawer">${t("cancel")}</button>
      <button class="btn red" type="button" data-action="save-product" data-id="${isNew ? "" : esc(p.id)}">${t("save")}</button></div>`);
  bindPhotoDrop("pf", (url) => { pendingImage = url; }, "save-product");
}

export const products = {
  async render() {
    await reload();
    const chip = (key, label, n) => `<button class="chip" type="button" data-action="line" data-line="${esc(key)}" aria-pressed="${ui.line === key}">${label} <b>${n}</b></button>`;
    const body = `<div class="toolbar card flat">
        <div class="chips">${chip("all", t("all"), state.products.length)}${state.collections.map((c) => chip(c.slug, esc(nameOf(c)), state.products.filter((p) => p.line === c.slug).length)).join("")}</div>
        <label class="search-wrap">${I.search}<input class="search" id="product-search" type="search" placeholder="${t("searchProducts")}" value="${esc(ui.q)}" aria-label="${t("searchProducts")}"></label></div>
      <p class="intro">${t("productsIntro")}</p><div id="product-grid">${productCards()}</div>`;
    return { eyebrow: t("onSiteCount", { n: state.products.filter((p) => p.visible).length }), title: t("nav_products"),
      actions: `<button class="btn red" type="button" data-action="new-product">${I.plus}${t("addProduct")}</button>`, body };
  },
  mount() {
    const s = $("#product-search");
    s.addEventListener("input", () => { ui.q = s.value.trim(); $("#product-grid").innerHTML = productCards(); });
  },
};

// ---------- collections ----------
let pendingCover = null;
function openCollection(c) {
  const isNew = !c;
  c = c || { visible: true, on_home: false, sort: state.collections.reduce((m, x) => Math.max(m, x.sort || 0), 0) + 1 };
  pendingCover = c.image_url || null;
  const n = isNew ? 0 : state.products.filter((p) => p.line === c.slug).length;
  const others = state.collections.filter((x) => x.id !== c.id);
  const pair = (key, labelKey, area = false) => `<div class="grid-2">${["en", "am"].map((l) => `<label class="field"><span>${t(labelKey)} · ${t(l === "en" ? "english" : "amharic")}</span>${area
    ? `<textarea id="cf-${key}_${l}">${esc(c[`${key}_${l}`])}</textarea>` : `<input id="cf-${key}_${l}" value="${esc(c[`${key}_${l}`])}">`}</label>`).join("")}</div>`;
  openDrawer(`${drawerHead(t("nav_collections"), isNew ? t("newCollection") : esc(c.name_en), isNew ? "" : `${t("productsCount", { n })} · /collections.html#${esc(c.slug)}`)}
    <form class="drawer-body" novalidate>
      <div class="section-box"><h3>${t("cover")}</h3>${photoDrop("cf", pendingCover, true)}</div>
      <div class="section-box"><h3>${t("names")}</h3>${pair("name", "name")}${pair("tagline", "tagline")}</div>
      <div class="section-box"><h3>${t("texts")}</h3>${pair("summary", "summary", true)}${pair("description", "collDescription", true)}${pair("tags", "tags")}<small class="muted">${t("tagsHint")}</small></div>
      <div class="section-box">
        <label class="check"><input id="cf-visible" type="checkbox" ${c.visible ? "checked" : ""}><span>${t("visible")}</span></label>
        <label class="check"><input id="cf-home" type="checkbox" ${c.on_home ? "checked" : ""}><span>${t("onHomeLabel")}<small>${t("onHomeHint")}</small></span></label>
        <label class="field" style="max-width:160px"><span>${t("position")}</span><input id="cf-sort" inputmode="numeric" value="${c.sort ?? 0}"><small>${t("positionHint")}</small></label>
      </div>
      ${!isNew && n ? `<div class="section-box danger-box"><h3>${t("delete")}</h3>
        <label class="field"><span>${t("moveTo")}</span><select id="cf-move"><option value="">${t("choose")}</option>${others.map((x) => `<option value="${esc(x.slug)}">${esc(x.name_en)}</option>`).join("")}</select>
        <small>${t("moveHint", { n })}</small></label></div>` : ""}
      <p class="form-msg" id="cf-msg" role="status"></p>
    </form>
    <div class="drawer-foot">${isNew ? "" : `<button class="btn danger small" type="button" data-action="delete-collection" data-id="${esc(c.id)}">${t("delete")}</button>`}
      <span class="spacer"></span><button class="btn ghost" type="button" data-action="close-drawer">${t("cancel")}</button>
      <button class="btn red" type="button" data-action="save-collection" data-id="${esc(c.id || "")}">${t("save")}</button></div>`);
  bindPhotoDrop("cf", (url) => { pendingCover = url; }, "save-collection");
}

export const collections = {
  async render() {
    await reload();
    const count = (slug) => state.products.filter((p) => p.line === slug).length;
    const cards = state.collections.map((c) => `<article class="card collection ${c.visible ? "" : "is-hidden"}">
        <button class="cover" type="button" data-action="edit-collection" data-id="${esc(c.id)}" aria-label="${t("edit")}: ${esc(c.name_en)}">
          ${c.image_url ? `<img src="${esc(imgUrl(c.image_url))}" alt="" loading="lazy">` : `<span class="cover-empty">${I.image}</span>`}
          <span class="tags">${c.on_home ? `<span class="tag gold">${t("onHome")}</span>` : ""}${c.visible ? "" : `<span class="tag off">${t("hidden")}</span>`}</span></button>
        <div class="meta">${c.tagline_en ? `<small class="kicker">${esc(nameOf(c, "tagline"))}</small>` : ""}<b>${esc(nameOf(c))}</b>
          <small>${t("productsCount", { n: count(c.slug) })} · ${t("position")} ${c.sort ?? 0}</small>
          <div class="foot"><label><span class="switch"><input type="checkbox" data-toggle-collection="${esc(c.id)}" ${c.visible ? "checked" : ""} aria-label="${t("visible")}"><span></span></span>${c.visible ? t("onSite") : t("hidden")}</label>
            <span class="row-actions"><button class="btn ghost small" type="button" data-action="collection-products" data-line="${esc(c.slug)}">${t("nav_products")}</button>
            <button class="btn ghost small" type="button" data-action="edit-collection" data-id="${esc(c.id)}">${t("edit")}</button></span></div></div></article>`).join("");
    const body = `<p class="intro">${t("collectionsIntro")}</p>${state.collections.length ? `<div class="collections">${cards}</div>` : `<div class="card">${emptyBox(t("noCollections"), I.layers)}</div>`}`;
    return { eyebrow: t("productsCount", { n: state.products.length }), title: t("nav_collections"),
      actions: `<button class="btn red" type="button" data-action="new-collection">${I.plus}${t("addCollection")}</button>`, body };
  },
};

on({
  line: (el) => { ui.line = el.dataset.line; rerender(); },
  "new-product": () => openProduct(null),
  "edit-product": (el) => openProduct(state.products.find((p) => p.id === el.dataset.id)),
  "duplicate-product": (el) => {
    const src = state.products.find((p) => p.id === el.dataset.id);
    if (!src) return;
    closeDrawer();
    openProduct({ ...src, id: undefined, name_en: src.name_en + t("copySuffix"), name_am: src.name_am ? src.name_am + t("copySuffix") : src.name_am, featured: false }, true);
  },
  "save-product": async (el) => {
    const msg = $("#pf-msg");
    if (!val("pf-name_en")) { msg.textContent = t("needProductName"); return; }
    if (!pendingImage) { msg.textContent = t("needPhoto"); return; }
    const row = { name_en: val("pf-name_en"), name_am: val("pf-name_am"), description_en: val("pf-description_en"), description_am: val("pf-description_am"),
      line: val("pf-line"), price: val("pf-price"), image_url: pendingImage, visible: $("#pf-visible").checked, featured: $("#pf-featured").checked, sort: val("pf-sort") || 0 };
    const id = el.dataset.id;
    const r = await busy(el, () => (id ? put(`/admin/products/${id}`, row) : post("/admin/products", row)), msg);
    if (r) { closeDrawer(); toast(t("saved")); rerender(); }
  },
  "delete-product": (el) => armDelete(el, async () => { await del(`/admin/products/${el.dataset.id}`); closeDrawer(); toast(t("deleted")); rerender(); }),
  "collection-products": (el) => { ui.line = el.dataset.line; location.hash = "products"; },
  "new-collection": () => openCollection(null),
  "edit-collection": (el) => openCollection(state.collections.find((c) => c.id === el.dataset.id)),
  "save-collection": async (el) => {
    const msg = $("#cf-msg");
    if (!val("cf-name_en")) { msg.textContent = t("needCollectionName"); return; }
    const row = {};
    ["name", "tagline", "summary", "description", "tags"].forEach((k) => ["en", "am"].forEach((l) => { row[`${k}_${l}`] = val(`cf-${k}_${l}`); }));
    Object.assign(row, { image_url: pendingCover, visible: $("#cf-visible").checked, on_home: $("#cf-home").checked, sort: val("cf-sort") || 0 });
    const id = el.dataset.id;
    const r = await busy(el, () => (id ? put(`/admin/collections/${id}`, row) : post("/admin/collections", row)), msg);
    if (r) { closeDrawer(); toast(t("saved")); rerender(); }
  },
  "delete-collection": (el) => {
    const move = $("#cf-move");
    if (move && !move.value) { $("#cf-msg").textContent = t("needMove"); move.focus(); return; }
    armDelete(el, async () => { await del(`/admin/collections/${el.dataset.id}`, { moveTo: move ? move.value : undefined }); closeDrawer(); toast(t("deleted")); rerender(); });
  },
});

document.addEventListener("change", async (e) => {
  const tp = e.target.closest("[data-toggle-product]");
  const tc = e.target.closest("[data-toggle-collection]");
  if (!tp && !tc) return;
  try {
    if (tp) {
      const p = state.products.find((x) => x.id === tp.dataset.toggleProduct);
      await put(`/admin/products/${p.id}`, { ...p, visible: tp.checked });
    } else {
      const c = state.collections.find((x) => x.id === tc.dataset.toggleCollection);
      await put(`/admin/collections/${c.id}`, { ...c, visible: tc.checked });
    }
    toast(t("saved")); rerender();
  } catch (err) { (tp || tc).checked = !(tp || tc).checked; toast(err.message); }
});
