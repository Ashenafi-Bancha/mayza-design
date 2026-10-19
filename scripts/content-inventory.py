"""Content inventory for the Mayza Design site.

Extracts every piece of visible content from the pages (text in English and
Amharic, links, images and alt text, form labels and options, meta tags) plus
the shared header/footer and catalogue data that scripts render.

  python scripts/content-inventory.py            -> writes CONTENT_INVENTORY.md and content-baseline.json
  python scripts/content-inventory.py --verify   -> compares the current site with content-baseline.json

Used to prove a redesign kept 100% of the original content.
"""
import html
import json
import re
import sys
from html.parser import HTMLParser
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
PAGES = ["index", "collections", "custom", "about", "contact"]
SECTION_TAGS = {"section", "header", "footer", "nav", "aside", "article"}
TEXT_TAGS = {"h1", "h2", "h3", "h4", "p", "span", "li", "a", "button", "strong", "b", "label", "option", "small", "pre", "figcaption", "th", "td", "dt", "dd", "em"}
norm = lambda s: re.sub(r"\s+", " ", html.unescape(s or "")).strip()


class PageParser(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.meta, self.title, self.items, self.stack, self.section = {}, "", [], [], "page"
        self.sections, self._in_title, self._skip = [], False, 0

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if tag in ("script", "style"):
            self._skip += 1
            return
        if tag == "title":
            self._in_title = True
        if tag == "meta" and (a.get("name") or a.get("property")):
            self.meta[a.get("name") or a.get("property")] = norm(a.get("content", ""))
        if tag in SECTION_TAGS or (tag == "div" and a.get("class") in ("band", "marquee")) or tag == "main":
            label = a.get("id") or a.get("class") or tag
            self.section = f"{tag}:{label}"
            self.sections.append(self.section)
        if tag == "img":
            self.items.append({"section": self.section, "kind": "image", "src": a.get("src", ""), "alt": norm(a.get("alt", ""))})
        if tag == "a" and a.get("href"):
            self.items.append({"section": self.section, "kind": "link", "href": a["href"]})
        if tag in ("input", "textarea") and (a.get("placeholder") or a.get("aria-label")):
            self.items.append({"section": self.section, "kind": "field", "id": a.get("id", a.get("name", "")),
                               "placeholder": norm(a.get("placeholder", "")), "placeholder_am": norm(a.get("data-am-ph", "")),
                               "label": norm(a.get("aria-label", ""))})
        self.stack.append((tag, a))

    def handle_endtag(self, tag):
        if tag in ("script", "style"):
            self._skip = max(0, self._skip - 1)
            return
        if tag == "title":
            self._in_title = False
        while self.stack:
            t, _ = self.stack.pop()
            if t == tag:
                break

    def handle_data(self, data):
        if self._skip:
            return
        text = norm(data)
        if not text:
            return
        if self._in_title:
            self.title += text
            return
        # the nearest element carrying text (and its Amharic twin, if any)
        for tag, a in reversed(self.stack):
            if tag in TEXT_TAGS or "data-am" in a:
                self.items.append({"section": self.section, "kind": "text", "tag": tag, "en": text, "am": norm(a.get("data-am", ""))})
                return
        self.items.append({"section": self.section, "kind": "text", "tag": self.stack[-1][0] if self.stack else "", "en": text, "am": ""})


def scripted_content():
    """Header, footer, quick links and phone bar are rendered by js/main.js."""
    src = (ROOT / "js" / "main.js").read_text(encoding="utf-8")
    pages = re.findall(r'\["([\w.]+\.html)", "([^"]+)", "([^"]+)"\]', src)
    pairs = re.findall(r'data-am="([^"$]+)">([^<$]+)<', src)
    quick = re.findall(r'q\([^,]+, LINE\.\w+, "[^"]+", "([^"]+)", "([^"]+)"', src)
    links = sorted(set(re.findall(r'"(https://[^"]+)"', src)))
    consts = dict(re.findall(r'^\s+(phone|phone2|phoneIntl): "([^"]+)"', src, re.M))
    return {
        "navigation": [{"href": h, "en": en, "am": am} for h, en, am in pages],
        "text_pairs": [{"en": norm(en), "am": norm(am)} for am, en in pairs],
        "quick_links": [{"en": en, "am": am} for en, am in quick],
        "external_links": links,
        "phones": consts,
    }


def catalogue():
    """Products, collections and default settings seeded in js/store.js (the same data the database starts with)."""
    src = (ROOT / "js" / "store.js").read_text(encoding="utf-8")
    products = [{"image": i, "collection": l, "name_en": en, "name_am": am}
                for i, l, en, am in re.findall(r'P\("seed-\d+", "([^"]+)", "([^"]+)", "([^"]+)", "([^"]+)"', src)]
    m = re.search(r"const SEED_COLLECTIONS = (\[.*?\]);\n", src, re.S)
    collections = json.loads(m.group(1)) if m else []
    for c in collections:
        for k in ("id", "created_at", "visible", "sort"):
            c.pop(k, None)
    s = re.search(r"const DEFAULT_SETTINGS = \{(.*?)\};", src, re.S).group(1)
    settings = dict(re.findall(r'(\w+): "([^"]*)"', s))
    return {"products": products, "collections": collections, "settings": settings}


def snapshot():
    data = {"pages": {}, "shared": scripted_content(), "catalogue": catalogue()}
    for page in PAGES:
        p = PageParser()
        p.feed((ROOT / f"{page}.html").read_text(encoding="utf-8"))
        data["pages"][page] = {"title": p.title, "meta": p.meta, "sections": p.sections, "items": p.items}
    return data


def content_keys(data):
    """Flat set of content facts, ignoring layout: used to check nothing was lost."""
    keys = set()
    for page, d in data["pages"].items():
        keys.add(f"{page}|title|{d['title']}")
        for k, v in d["meta"].items():
            if k in ("description", "og:title", "og:description", "og:image"):
                keys.add(f"{page}|meta|{k}|{v}")
        for it in d["items"]:
            if it["kind"] == "text":
                keys.add(f"{page}|text|{it['en']}")
                if it["am"]:
                    keys.add(f"{page}|am|{it['am']}")
            elif it["kind"] == "image":
                keys.add(f"{page}|image|{it['src']}|{it['alt']}")
            elif it["kind"] == "link" and not it["href"].startswith("#"):
                keys.add(f"{page}|link|{it['href']}")
            elif it["kind"] == "field":
                keys.add(f"{page}|field|{it['id']}|{it['placeholder']}|{it['placeholder_am']}|{it['label']}")
    sh = data["shared"]
    for n in sh["navigation"]:
        keys.add(f"shared|nav|{n['href']}|{n['en']}|{n['am']}")
    for t in sh["text_pairs"]:
        keys.add(f"shared|text|{t['en']}|{t['am']}")
    for q in sh["quick_links"]:
        keys.add(f"shared|quick|{q['en']}|{q['am']}")
    for l in sh["external_links"]:
        keys.add(f"shared|link|{l}")
    for k, v in sh["phones"].items():
        keys.add(f"shared|phone|{k}|{v}")
    cat = data["catalogue"]
    for p in cat["products"]:
        keys.add("catalogue|product|" + "|".join(p.values()))
    for c in cat["collections"]:
        keys.add("catalogue|collection|" + json.dumps(c, ensure_ascii=False, sort_keys=True))
    for k, v in cat["settings"].items():
        keys.add(f"catalogue|setting|{k}|{v}")
    return keys


def write_markdown(data):
    out = ["# Mayza Design: content inventory", "",
           "Everything a visitor can read or see on the public site, captured before the premium redesign.",
           "Generated by `python scripts/content-inventory.py`; `--verify` checks the site still contains all of it.", "",
           "## Stack (audit)", "",
           "| Part | What it is |", "|---|---|",
           "| Pages | 5 static HTML pages: `index`, `collections`, `custom`, `about`, `contact` (no framework, no build step) |",
           "| Styling | One hand-written stylesheet, `css/style.css` (CSS custom properties, no preprocessor) |",
           "| Scripts | Vanilla JS: `js/main.js` (header, footer, language switch, order sheet), `js/motion.js` (scroll reveals, tilt, 3D lookbook), `js/site.js` + `js/store.js` (content from the admin/API), `js/config.js` |",
           "| Fonts | Google Fonts: Bodoni Moda (display), Figtree (body), Noto Sans/Serif Ethiopic (Amharic) |",
           "| Admin | `admin/` (vanilla JS single-page app) |",
           "| API | Node.js + Express + PostgreSQL in `api/` (Vercel serverless function), dependencies in `package.json` |",
           "| Hosting | Vercel (static files + `/api` function) |",
           "| Languages | Every visible string has an English version in the markup and an Amharic version in `data-am` |", ""]
    out += ["## Shared on every page (rendered by `js/main.js`)", "", "### Navigation", "", "| Link | English | Amharic |", "|---|---|---|"]
    out += [f"| `{n['href']}` | {n['en']} | {n['am']} |" for n in data["shared"]["navigation"]]
    out += ["", "### Header, footer, quick links and phone bar text", "", "| English | Amharic |", "|---|---|"]
    out += [f"| {t['en']} | {t['am']} |" for t in data["shared"]["text_pairs"]]
    out += [f"| {q['en']} (quick link) | {q['am']} |" for q in data["shared"]["quick_links"]]
    out += ["", "### Contact details and links", ""]
    out += [f"- Phone `{k}`: {v}" for k, v in data["shared"]["phones"].items()]
    out += [f"- {l}" for l in data["shared"]["external_links"]]
    out += ["", "Footer also shows the logo, the woven stripe band, the address line and the copyright year.", ""]

    for page, d in data["pages"].items():
        out += [f"## Page: `{page}.html`", "", f"- **Title:** {d['title']}"]
        for k in ("description", "og:title", "og:description", "og:image", "theme-color"):
            if k in d["meta"]:
                out.append(f"- **{k}:** {d['meta'][k]}")
        current = None
        for it in d["items"]:
            if it["section"] != current:
                current = it["section"]
                out += ["", f"### {current}", ""]
            if it["kind"] == "text":
                out.append(f"- `{it['tag']}` {it['en']}" + (f" / {it['am']}" if it["am"] else ""))
            elif it["kind"] == "image":
                out.append(f"- image `{it['src']}`, alt: {it['alt'] or '(decorative)'}")
            elif it["kind"] == "link":
                out.append(f"- link `{it['href']}`")
            elif it["kind"] == "field":
                out.append(f"- field `{it['id']}`" + (f", placeholder: {it['placeholder']}" if it["placeholder"] else "")
                           + (f" / {it['placeholder_am']}" if it["placeholder_am"] else "") + (f", label: {it['label']}" if it["label"] else ""))
        out.append("")

    cat = data["catalogue"]
    out += ["## Catalogue (seed data in `js/store.js` and `api/_lib/schema.sql`; managed in the admin)", "",
            "### Collections", "", "| Slug | Name | Small line | Summary | Description | Tags | Cover |", "|---|---|---|---|---|---|---|"]
    for c in cat["collections"]:
        out.append(f"| {c['slug']} | {c['name_en']} / {c['name_am']} | {c['tagline_en']} / {c['tagline_am']} | {c['summary_en']} / {c['summary_am']} | "
                   f"{c['description_en']} / {c['description_am']} | {c['tags_en']} / {c['tags_am']} | `{c['image_url']}` |")
    out += ["", "### Products (all priced \"Price on request\" / \"ዋጋ ይጠይቁ\" until the owner sets a price)", "", "| Name | Amharic | Collection | Photo |", "|---|---|---|---|"]
    out += [f"| {p['name_en']} | {p['name_am']} | {p['collection']} | `images/{p['image']}.jpg` |" for p in cat["products"]]
    out += ["", "### Default settings (owner can change in Admin > Settings)", ""]
    out += [f"- `{k}`: {v}" for k, v in cat["settings"].items() if v]
    out += ["", "## Dynamic content", "",
            "These parts come from the admin at runtime and must keep working after the redesign:", "",
            "- Announcement bar above the header (Admin > Settings).",
            "- Phone, WhatsApp, Telegram, address, hours, social links and follower numbers (Admin > Settings).",
            "- Collection sections on Collections, the three home tiles, and the product grid with filters (Admin > Collections and Products).",
            "- Every element marked `data-cms` / `data-cms-img` can be overridden in Admin > Website.",
            "- The order sheet: chosen piece, \"Send order to Mayza\", WhatsApp, Telegram and copy buttons, and the live message preview.",
            "- English / Amharic switch on every page.", ""]
    (ROOT / "CONTENT_INVENTORY.md").write_text("\n".join(out), encoding="utf-8")


if __name__ == "__main__":
    baseline_path = ROOT / "content-baseline.json"
    data = snapshot()
    if "--verify" in sys.argv:
        before = content_keys(json.loads(baseline_path.read_text(encoding="utf-8")))
        after = content_keys(data)
        missing = sorted(before - after)
        print(f"Baseline facts: {len(before)}  present now: {len(before) - len(missing)}  missing: {len(missing)}")
        for m in missing:
            print("  MISSING", m)
        sys.exit(1 if missing else 0)
    baseline_path.write_text(json.dumps(data, ensure_ascii=False, indent=1), encoding="utf-8")
    write_markdown(data)
    print(f"Wrote CONTENT_INVENTORY.md and content-baseline.json ({len(content_keys(data))} content facts).")
