// Business details live here so every page stays in sync.
const MAYZA = {
  phone: "0912070949",
  phoneIntl: "251912070949",
  phone2: "0924968631",
  telegram: "https://t.me/+251912070949",
  whatsapp: "https://wa.me/251912070949",
  facebook: "https://web.facebook.com/sidamaCulture",
  tiktok: "https://www.tiktok.com/@mayza_design",
  instagram: "https://www.instagram.com/mayza__design",
};

const EMBLEM = `<img src="images/logo.jpg" alt="" width="38" height="38">`;

// Social marks in each platform's own colours.
const TIKTOK_NOTE = "M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z";
const ICONS = {
  facebook: `<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="12" fill="#1877F2"/><path fill="#fff" d="M13.6 21.6v-7.4h2.5l.4-3h-2.9V9.3c0-.9.3-1.5 1.6-1.5h1.5V5.1c-.3 0-1.2-.1-2.2-.1-2.2 0-3.7 1.3-3.7 3.8v2.4H8.3v3h2.5v7.4z"/></svg>`,
  tiktok: `<svg viewBox="0 0 24 24" aria-hidden="true"><rect width="24" height="24" rx="6" fill="#010101"/><g transform="translate(5.4 5.2) scale(.55)"><path fill="#25F4EE" transform="translate(-1 -1)" d="${TIKTOK_NOTE}"/><path fill="#FE2C55" transform="translate(1 1)" d="${TIKTOK_NOTE}"/><path fill="#fff" d="${TIKTOK_NOTE}"/></g></svg>`,
  instagram: `<svg viewBox="0 0 24 24" aria-hidden="true"><defs><radialGradient id="ig" cx="30%" cy="107%" r="150%"><stop offset="0" stop-color="#fdf497"/><stop offset=".05" stop-color="#fdf497"/><stop offset=".45" stop-color="#fd5949"/><stop offset=".6" stop-color="#d6249f"/><stop offset=".9" stop-color="#285AEB"/></radialGradient></defs><rect width="24" height="24" rx="6" fill="url(#ig)"/><rect x="5.5" y="5.5" width="13" height="13" rx="3.8" fill="none" stroke="#fff" stroke-width="1.7"/><circle cx="12" cy="12" r="3.1" fill="none" stroke="#fff" stroke-width="1.7"/><circle cx="15.7" cy="8.3" r="1" fill="#fff"/></svg>`,
};

const line = (d) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
const LINE = {
  phone: line('<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>'),
  chat: line('<path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>'),
  send: line('<path d="M22 2 11 13"/><path d="m22 2-7 20-4-9-9-4 20-7z"/>'),
  grid: line('<rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>'),
  edit: line('<path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>'),
  pin: line('<path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>'),
};

const PAGES = [
  ["index.html", "Home", "መነሻ"],
  ["collections.html", "Collections", "ስብስቦች"],
  ["custom.html", "Custom orders", "ልዩ ትዕዛዝ"],
  ["about.html", "About", "ስለ እኛ"],
  ["contact.html", "Contact", "አድራሻ"],
];

function renderChrome() {
  const here = location.pathname.split("/").pop() || "index.html";
  const links = PAGES.map(
    ([href, en, am]) =>
      `<a href="${href}"${href === here ? ' aria-current="page"' : ""} data-am="${am}">${en}</a>`
  ).join("");

  document.getElementById("site-header").innerHTML = `
    <div class="wrap">
      <a class="brand" href="index.html" aria-label="Mayza Design">${EMBLEM}<span>Mayza Design</span></a>
      <nav class="nav" id="nav" aria-label="Main">
        ${links}
        <a class="btn red" href="custom.html#order" data-am="አሁን ይዘዙ">Order now</a>
      </nav>
      <div class="lang" role="group" aria-label="Language">
        <button type="button" data-lang="en">EN</button>
        <button type="button" data-lang="am">አማ</button>
      </div>
      <button class="menu-btn" type="button" id="menu-btn" aria-label="Menu" aria-expanded="false" aria-controls="nav">☰</button>
    </div>`;

  document.getElementById("site-footer").innerHTML = `
    <div class="band"></div>
    <div class="wrap">
      <div>
        <a class="brand" href="index.html">${EMBLEM}<span>Mayza Design</span></a>
        <p data-am="ባህላዊ እና ዘመናዊ አልባሳት ዲዛይን፤ አዲስ አበባ፣ ኢትዮጵያ።">Cultural and modern clothing design, made in Addis Ababa, Ethiopia.</p>
      </div>
      <div>
        <h3 data-am="ይጎብኙን">Visit</h3>
        <ul>
          <li data-am="ሰሚት ፍየል ቤት ትንሽ ገባ ብሎ">Summit Fiyel Bet, just off the main road</li>
          <li data-am="አዲስ አበባ፣ ኢትዮጵያ">Addis Ababa, Ethiopia</li>
          <li><a href="tel:+${MAYZA.phoneIntl}">${MAYZA.phone}</a></li>
        </ul>
      </div>
      <div>
        <h3 data-am="ይከተሉን">Follow</h3>
        <ul class="social">
          <li><a href="${MAYZA.facebook}" target="_blank" rel="noopener">${ICONS.facebook}<span>Facebook</span></a></li>
          <li><a href="${MAYZA.tiktok}" target="_blank" rel="noopener">${ICONS.tiktok}<span>TikTok</span></a></li>
          <li><a href="${MAYZA.instagram}" target="_blank" rel="noopener">${ICONS.instagram}<span>Instagram</span></a></li>
        </ul>
      </div>
      <div class="legal">© ${new Date().getFullYear()} Mayza Design</div>
    </div>
    <nav class="action-bar" aria-label="Order">
      <a href="tel:+${MAYZA.phoneIntl}">${LINE.phone}<span data-am="ይደውሉ">Call</span></a>
      <a href="${MAYZA.whatsapp}" target="_blank" rel="noopener">${LINE.chat}<span>WhatsApp</span></a>
      <a href="custom.html#order">${LINE.edit}<span data-am="ይዘዙ">Order</span></a>
    </nav>`;

  const quick = document.getElementById("quick");
  if (quick) {
    const q = (href, ico, color, en, am, ext) =>
      `<a href="${href}"${ext ? ' target="_blank" rel="noopener"' : ""}><span class="ico" style="--ico:${color}">${ico}</span><span data-am="${am}">${en}</span></a>`;
    quick.innerHTML =
      q(`tel:+${MAYZA.phoneIntl}`, LINE.phone, "var(--red)", "Call", "ይደውሉ") +
      q(MAYZA.whatsapp, LINE.chat, "#25D366", "WhatsApp", "ዋትስአፕ", true) +
      q(MAYZA.telegram, LINE.send, "#229ED9", "Telegram", "ቴሌግራም", true) +
      q("collections.html", LINE.grid, "var(--ink)", "Collections", "ስብስቦች") +
      q("custom.html#order", LINE.edit, "var(--ink)", "Order sheet", "የትዕዛዝ ቅጽ") +
      q("contact.html", LINE.pin, "var(--ink)", "Location", "አድራሻ");
  }

  const btn = document.getElementById("menu-btn");
  const nav = document.getElementById("nav");
  btn.addEventListener("click", () => {
    const open = nav.classList.toggle("open");
    btn.setAttribute("aria-expanded", open);
  });
}

// Each translatable element holds English in the markup and Amharic in data-am.
function setLang(lang) {
  document.documentElement.lang = lang;
  document.querySelectorAll("[data-am]").forEach((el) => {
    if (el.dataset.en === undefined) el.dataset.en = el.innerHTML;
    el.innerHTML = lang === "am" ? el.dataset.am : el.dataset.en;
  });
  document.querySelectorAll("[data-am-ph]").forEach((el) => {
    if (el.dataset.enPh === undefined) el.dataset.enPh = el.placeholder;
    el.placeholder = lang === "am" ? el.dataset.amPh : el.dataset.enPh;
  });
  document.querySelectorAll(".lang button").forEach((b) =>
    b.setAttribute("aria-pressed", b.dataset.lang === lang)
  );
  try { localStorage.setItem("mayza-lang", lang); } catch (e) {}
  document.dispatchEvent(new CustomEvent("langchange"));
}

function initOrderForm() {
  const form = document.getElementById("order-form");
  if (!form) return;
  const out = document.getElementById("order-message");
  const status = document.getElementById("order-status");
  const val = (id) => form.elements[id].value.trim();
  const picked = (id) => {
    const s = form.elements[id];
    return s.value ? s.options[s.selectedIndex].text : "";
  };

  const L = {
    en: { hi: "Hello Mayza Design, I would like to place a custom order.", name: "Name", phone: "Phone", garment: "Garment", who: "For", date: "Needed by", size: "Measurements (cm)", chest: "chest", waist: "waist", hip: "hip", height: "height", notes: "Details", copied: "Message copied.", copyFail: "Select the message above and copy it.", need: "Please add your name and phone number first.", tg: "Message copied. Paste it into the Telegram chat." },
    am: { hi: "ሰላም ማይዛ ዲዛይን፣ ልዩ ትዕዛዝ ማዘዝ እፈልጋለሁ።", name: "ስም", phone: "ስልክ", garment: "የልብስ ዓይነት", who: "ለማን", date: "የሚፈለግበት ቀን", size: "ልኬት (ሴ.ሜ)", chest: "ደረት", waist: "ወገብ", hip: "ዳሌ", height: "ቁመት", notes: "ዝርዝር", copied: "መልዕክቱ ተቀድቷል።", copyFail: "ከላይ ያለውን መልዕክት መርጠው ይቅዱ።", need: "እባክዎ መጀመሪያ ስምዎን እና ስልክዎን ያስገቡ።", tg: "መልዕክቱ ተቀድቷል። በቴሌግራም ውይይቱ ላይ ይለጥፉት።" },
  };
  const t = () => L[document.documentElement.lang] || L.en;

  function compose() {
    const s = t();
    const sizes = ["chest", "waist", "hip", "height"]
      .filter((k) => val(k))
      .map((k) => `${s[k]} ${val(k)}`)
      .join(", ");
    const lines = [
      val("name") && `${s.name}: ${val("name")}`,
      val("phone") && `${s.phone}: ${val("phone")}`,
      picked("garment") && `${s.garment}: ${picked("garment")}`,
      picked("who") && `${s.who}: ${picked("who")}`,
      val("date") && `${s.date}: ${val("date")}`,
      sizes && `${s.size}: ${sizes}`,
      val("notes") && `${s.notes}: ${val("notes")}`,
    ].filter(Boolean);
    out.textContent = [s.hi, "", ...lines].join("\n");
    return out.textContent;
  }

  const ready = () => {
    if (val("name") && val("phone")) return true;
    status.textContent = t().need;
    form.elements[val("name") ? "phone" : "name"].focus();
    return false;
  };
  const copy = async (okText) => {
    try {
      await navigator.clipboard.writeText(compose());
      status.textContent = okText;
    } catch (e) {
      status.textContent = t().copyFail;
    }
  };

  // "Order this line" links arrive as custom.html?line=cultural&who=child
  const asked = new URLSearchParams(location.search);
  ["garment:line", "who:who"].forEach((pair) => {
    const [field, key] = pair.split(":");
    const v = asked.get(key);
    if (v && [...form.elements[field].options].some((o) => o.value === v)) form.elements[field].value = v;
  });

  form.addEventListener("input", () => { status.textContent = ""; compose(); });
  form.addEventListener("submit", (e) => e.preventDefault());
  document.addEventListener("langchange", compose);

  document.getElementById("send-whatsapp").addEventListener("click", () => {
    if (!ready()) return;
    window.open(`${MAYZA.whatsapp}?text=${encodeURIComponent(compose())}`, "_blank", "noopener");
  });
  document.getElementById("send-telegram").addEventListener("click", async () => {
    if (!ready()) return;
    await copy(t().tg); // Telegram cannot prefill a chat opened by phone number
    window.open(MAYZA.telegram, "_blank", "noopener");
  });
  document.getElementById("copy-message").addEventListener("click", () => copy(t().copied));
  compose();
}

function initViewer() {
  const shots = document.querySelectorAll(".gallery img, .shots img");
  if (!shots.length || !window.HTMLDialogElement) return;
  const dlg = document.createElement("dialog");
  dlg.className = "viewer";
  dlg.innerHTML = `<button type="button" aria-label="Close">✕</button><img alt="">`;
  document.body.appendChild(dlg);
  const big = dlg.querySelector("img");
  dlg.addEventListener("click", (e) => { if (e.target !== big) dlg.close(); });
  shots.forEach((img) => {
    img.classList.add("zoomable");
    img.addEventListener("click", () => {
      big.src = img.currentSrc || img.src;
      big.alt = img.alt;
      dlg.showModal();
    });
  });
}

renderChrome();
initViewer();
document.querySelectorAll(".lang button").forEach((b) =>
  b.addEventListener("click", () => setLang(b.dataset.lang))
);
initOrderForm();
let saved = "en";
try { saved = localStorage.getItem("mayza-lang") || "en"; } catch (e) {}
setLang(saved);
