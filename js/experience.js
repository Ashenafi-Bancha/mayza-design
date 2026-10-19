// Mayza Design: motion and interaction layer.
// GSAP + ScrollTrigger + SplitText for animation, Lenis for smooth scrolling.
// The pages are complete without this file: it only adds motion on top, and it
// stands down entirely for visitors who ask for reduced motion.
(() => {
  const d = document.documentElement;
  const calm = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const finePointer = matchMedia("(hover: hover) and (pointer: fine)").matches;
  const scriptBase = document.currentScript ? document.currentScript.src : location.href;
  const ready = Boolean(window.gsap && window.ScrollTrigger && window.SplitText);
  clearTimeout(window.__fxFailsafe);

  const markSeen = () => { try { sessionStorage.setItem("mz-seen", "1"); sessionStorage.removeItem("mz-curtain"); } catch (e) {} };

  // ---------- without motion: show everything and keep the lookbook usable ----------
  if (calm || !ready) {
    d.classList.remove("fx", "curtain-in");
    d.classList.add("pre-done");
    markSeen();
    initLookbook(null);
    window.MayzaFX = { refresh() {}, lenis: null };
    return;
  }

  const { gsap, ScrollTrigger, SplitText } = window;
  gsap.registerPlugin(ScrollTrigger, SplitText);
  gsap.defaults({ ease: "expo.out", duration: 1.2 });

  // ---------- start at the top: the browser's restored scroll position would fire every reveal at once ----------
  if ("scrollRestoration" in history) history.scrollRestoration = "manual";
  if (!location.hash) window.scrollTo(0, 0);

  // ---------- smooth scrolling ----------
  const lenis = window.Lenis ? new window.Lenis({ lerp: 0.1, wheelMultiplier: 1, smoothWheel: true }) : null;
  if (lenis) {
    lenis.on("scroll", ScrollTrigger.update);
    gsap.ticker.add((t) => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
    // in-page anchors (for example "Start a custom order" on the order page) glide too
    document.addEventListener("click", (e) => {
      const a = e.target.closest('a[href*="#"]');
      if (!a || a.target) return;
      const url = new URL(a.href, location.href);
      if (url.pathname !== location.pathname || !url.hash) return;
      const target = document.querySelector(url.hash);
      if (!target) return;
      e.preventDefault();
      lenis.scrollTo(target, { offset: -90, duration: 1.4 });
      history.replaceState(null, "", url.hash);
    });
    document.addEventListener("menuchange", (e) => (e.detail.open ? lenis.stop() : lenis.start()));
  }
  const scrollY = () => (lenis ? lenis.scroll : window.scrollY);

  // ---------- header: solid after the opening image, hidden while scrolling down ----------
  const header = document.getElementById("site-header");
  const opener = document.querySelector(".hero, .page-head");
  let lastY = 0;
  function onScroll() {
    const y = scrollY();
    const limit = opener ? opener.offsetHeight - 90 : 40;
    header.classList.toggle("is-solid", y > limit);
    if (!d.classList.contains("menu-open")) header.classList.toggle("is-hidden", y > 260 && y > lastY + 2);
    if (y < lastY - 2 || y < 260) header.classList.remove("is-hidden");
    lastY = y;
  }
  (lenis ? lenis.on.bind(lenis, "scroll") : (fn) => addEventListener("scroll", fn, { passive: true }))(onScroll);
  onScroll();

  // ---------- split headlines into masked lines ----------
  const splits = new Map();
  function splitLines(el) {
    if (splits.has(el)) return splits.get(el);
    const s = SplitText.create(el, { type: "lines", linesClass: "split-line", mask: "lines" });
    splits.set(el, s);
    return s;
  }
  // after a headline has played we put the original markup back, so the language
  // switch and the website editor keep working on plain text
  function settle(el) {
    const s = splits.get(el);
    if (s) { s.revert(); splits.delete(el); }
  }

  // ---------- opening: preloader, or the curtain when arriving from another page ----------
  // On phones the opening section is already on screen when this script arrives (it loads
  // after the page), so it is left as it is rather than hidden and replayed.
  const phone = matchMedia("(max-width: 860px)").matches;
  const intro = gsap.timeline({ paused: true });
  const openerSplit = document.querySelector(".hero h1[data-split], .page-head h1[data-split]");
  if (openerSplit) openerSplit.dataset.fxDone = "1";
  if (openerSplit && !phone) {
    const s = splitLines(openerSplit);
    openerSplit.dataset.fxDone = "1";
    intro.from(s.lines, { yPercent: 115, duration: 1.5, stagger: 0.11, onComplete: () => settle(openerSplit) }, 0);
  }
  const openerMedia = document.querySelector(".hero-media .frame, .page-head-media .frame");
  if (openerMedia && !phone) intro.fromTo(openerMedia, { clipPath: "inset(0 0 100% 0)", scale: 1.18 }, { clipPath: "inset(0 0 0% 0)", scale: 1, duration: 1.8, ease: "expo.inOut", clearProps: "clipPath,scale" }, 0);
  const openerBits = opener ? opener.querySelectorAll("[data-reveal]") : [];
  openerBits.forEach((el) => (el.dataset.fxDone = "1"));
  if (openerBits.length && !phone) {
    gsap.set(openerBits, { opacity: 0, y: 30 });
    intro.to(openerBits, { opacity: 1, y: 0, duration: 1.2, stagger: 0.1 }, 0.35);
    openerBits.forEach((el) => (el.dataset.fxDone = "1"));
  }
  if (!phone) intro.from(header, { yPercent: -100, duration: 1.1, clearProps: "transform" }, 0.4);

  const pre = document.querySelector(".pre");
  if (pre && !d.classList.contains("no-pre")) {
    // the logo, wordmark and band animate in with CSS from the first frame; lift the
    // curtain about 1.1 s after the page started, so the whole preloader stays under 2 s
    const wait = Math.max(0, 1.1 - performance.now() / 1000);
    gsap.timeline({ delay: wait, onComplete: () => { d.classList.add("pre-done"); markSeen(); } })
      .to(pre, { clipPath: "inset(0 0 100% 0)", duration: 0.75, ease: "expo.inOut" })
      .add(() => intro.play(), 0.25);
  } else if (d.classList.contains("curtain-in")) {
    gsap.timeline({ onComplete: () => { d.classList.remove("curtain-in"); gsap.set(".curtain i", { clearProps: "transform" }); markSeen(); } })
      .fromTo(".curtain i", { yPercent: 0 }, { yPercent: -101, duration: 0.9, stagger: 0.09, ease: "expo.inOut" })
      .add(() => intro.play(), 0.25);
    d.classList.add("pre-done");
  } else {
    d.classList.add("pre-done");
    markSeen();
    intro.play();
  }

  // ---------- page transitions: a two-colour curtain between pages ----------
  document.addEventListener("click", (e) => {
    const a = e.target.closest("a[href]");
    if (!a || e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    if (a.target || a.hasAttribute("download")) return;
    const url = new URL(a.href, location.href);
    if (url.origin !== location.origin || !/\.html$|\/$/.test(url.pathname) || url.pathname.includes("/admin")) return;
    if (url.pathname === location.pathname) return; // same page: anchors are handled above
    if (phone) return; // phones navigate directly: the next page shows instantly
    e.preventDefault();
    if (d.classList.contains("menu-open") && window.toggleMenu) toggleMenu(false);
    try { sessionStorage.setItem("mz-curtain", "1"); } catch (err) {}
    gsap.fromTo(".curtain i", { yPercent: 101 }, { yPercent: 0, duration: 0.75, stagger: 0.08, ease: "expo.inOut", onComplete: () => { location.href = url.href; } });
  });
  // coming back with the browser's back button can restore a covered page
  addEventListener("pageshow", (e) => { if (e.persisted) { gsap.set(".curtain i", { yPercent: 101 }); d.classList.remove("curtain-in"); } });

  // ---------- scroll reveals ----------
  function reveal(root = document) {
    root.querySelectorAll("[data-split]").forEach((el) => {
      if (el.dataset.fxDone) return;
      el.dataset.fxDone = "1";
      const s = splitLines(el);
      gsap.from(s.lines, {
        yPercent: 115, duration: 1.4, stagger: 0.09,
        scrollTrigger: { trigger: el, start: "top 88%", toggleActions: "play none none none" },
        onComplete: () => settle(el),
      });
    });
    root.querySelectorAll("[data-reveal]").forEach((el) => {
      if (el.dataset.fxDone) return;
      el.dataset.fxDone = "1";
      gsap.fromTo(el, { opacity: 0, y: 40 }, {
        opacity: 1, y: 0, duration: 1.3,
        scrollTrigger: { trigger: el, start: "top 90%", toggleActions: "play none none none" },
        onComplete: () => gsap.set(el, { clearProps: "transform", opacity: 1 }),
      });
    });
    root.querySelectorAll("[data-wipe]").forEach((el) => {
      if (el.dataset.fxDone) return;
      el.dataset.fxDone = "1";
      const img = el.querySelector("img");
      const tl = gsap.timeline({ scrollTrigger: { trigger: el, start: "top 88%", toggleActions: "play none none none" } });
      tl.fromTo(el, { clipPath: "inset(100% 0 0 0)" }, { clipPath: "inset(0% 0 0 0)", duration: 1.5, ease: "expo.inOut" });
      if (img) tl.from(img, { scale: 1.3, duration: 2, ease: "expo.out" }, 0);
      tl.add(() => gsap.set(el, { clipPath: "none" })); // stay revealed (the CSS start state is hidden)
    });
    root.querySelectorAll("[data-parallax]").forEach((el) => {
      if (el.dataset.fxPara) return;
      el.dataset.fxPara = "1";
      const img = el.querySelector("img");
      if (!img) return;
      gsap.fromTo(img, { yPercent: -7 }, { yPercent: 7, ease: "none", scrollTrigger: { trigger: el, start: "top bottom", end: "bottom top", scrub: true } });
    });
    root.querySelectorAll(".piece-card").forEach((el, i) => {
      if (el.dataset.fxDone) return;
      el.dataset.fxDone = "1";
      gsap.from(el, { opacity: 0, y: 60, duration: 1.2, delay: (i % 4) * 0.08, scrollTrigger: { trigger: el, start: "top 94%", toggleActions: "play none none none" } });
    });
    if (finePointer) bindMagnetic(root);
  }
  reveal();

  // content added later (collections, products and photos from the admin) animates the same way
  new MutationObserver((records) => {
    let added = false;
    records.forEach((r) => r.addedNodes.forEach((n) => { if (n.nodeType === 1) added = true; }));
    if (!added) return;
    clearTimeout(reveal._t);
    reveal._t = setTimeout(() => { reveal(); ScrollTrigger.refresh(); }, 60);
  }).observe(document.getElementById("main"), { childList: true, subtree: true });

  // ---------- follower numbers count up ----------
  document.querySelectorAll(".figures strong").forEach((el) => {
    ScrollTrigger.create({
      trigger: el, start: "top 88%",
      onEnter: () => {
        if (el.dataset.fxCount) return;
        el.dataset.fxCount = "1";
        const m = el.textContent.trim().match(/^([\d.]+)(.*)$/);
        if (!m) return;
        const end = parseFloat(m[1]);
        const dec = (m[1].split(".")[1] || "").length;
        const o = { v: 0 };
        gsap.to(o, { v: end, duration: 2.2, ease: "expo.out", onUpdate: () => (el.textContent = o.v.toFixed(dec) + m[2]) });
      },
    });
  });

  // ---------- marquee: speed and direction follow the scroll ----------
  const track = document.querySelector(".marquee-track");
  if (track) {
    const loop = gsap.to(track, { xPercent: -50, duration: 42, ease: "none", repeat: -1 });
    const skew = gsap.quickTo(track, "skewX", { duration: 0.6, ease: "power3" });
    if (lenis) lenis.on("scroll", ({ velocity, direction }) => {
      gsap.to(loop, { timeScale: (direction || 1) * (1 + Math.min(Math.abs(velocity) * 0.12, 5)), duration: 0.4, overwrite: true });
      skew(gsap.utils.clamp(-8, 8, -velocity * 0.35));
    });
  }

  // ---------- custom orders: the four steps scroll sideways while pinned ----------
  const stepsPin = document.getElementById("steps-pin");
  if (stepsPin) {
    ScrollTrigger.matchMedia({
      "(min-width: 1025px)": () => {
        stepsPin.classList.add("is-horizontal");
        const list = stepsPin.querySelector(".steps-track");
        const distance = () => Math.max(0, list.scrollWidth - stepsPin.querySelector(".wrap").clientWidth);
        const tween = gsap.to(list, {
          x: () => -distance(), ease: "none",
          scrollTrigger: { trigger: stepsPin, start: "top top", end: () => "+=" + distance(), pin: true, scrub: 1, invalidateOnRefresh: true },
        });
        return () => { tween.scrollTrigger.kill(); tween.kill(); gsap.set(list, { clearProps: "transform" }); stepsPin.classList.remove("is-horizontal"); };
      },
    });
  }

  // ---------- hero: the photo moves on scroll ----------
  const heroMedia = document.querySelector(".hero-media");
  if (heroMedia) {
    gsap.to(heroMedia, { yPercent: 14, ease: "none", scrollTrigger: { trigger: ".hero", start: "top top", end: "bottom top", scrub: true } });
    gsap.to(".hero .hero-copy", { yPercent: -18, opacity: 0.2, ease: "none", scrollTrigger: { trigger: ".hero", start: "40% top", end: "bottom top", scrub: true } });
  }
  document.querySelectorAll(".page-head-media .frame").forEach((el) =>
    gsap.to(el, { yPercent: 18, ease: "none", scrollTrigger: { trigger: el.closest(".page-head"), start: "top top", end: "bottom top", scrub: true } }));

  // ---------- lookbook ring ----------
  initLookbook(gsap);

  // ---------- custom cursor (mouse and trackpad only) ----------
  if (finePointer) {
    const cursor = document.querySelector(".cursor");
    if (cursor) {
      d.classList.add("has-cursor");
      const dot = cursor.querySelector(".cursor-dot");
      const ring = cursor.querySelector(".cursor-ring");
      const label = ring.querySelector("span");
      const dx = gsap.quickTo(dot, "x", { duration: 0.12, ease: "power3" });
      const dy = gsap.quickTo(dot, "y", { duration: 0.12, ease: "power3" });
      const rx = gsap.quickTo(ring, "x", { duration: 0.5, ease: "power3" });
      const ry = gsap.quickTo(ring, "y", { duration: 0.5, ease: "power3" });
      gsap.set([dot, ring], { xPercent: -50, yPercent: -50 });
      addEventListener("pointermove", (e) => { dx(e.clientX); dy(e.clientY); rx(e.clientX); ry(e.clientY); cursor.style.opacity = 1; }, { passive: true });
      document.addEventListener("pointerleave", () => (cursor.style.opacity = 0));
      addEventListener("pointerdown", () => cursor.classList.add("is-down"));
      addEventListener("pointerup", () => cursor.classList.remove("is-down"));
      const VIEW = '[data-cursor="view"], .piece-photo, .zoomable, .lookbook-stage';
      document.addEventListener("pointerover", (e) => {
        const view = e.target.closest(VIEW);
        const link = !view && e.target.closest("a, button, .filter, label, select, input[type=checkbox]");
        cursor.classList.toggle("is-view", Boolean(view));
        cursor.classList.toggle("is-link", Boolean(link));
        if (view) label.textContent = d.lang === "am" ? "ይመልከቱ" : e.target.closest(".lookbook-stage") ? "Drag" : "View";
      });
    }
  }

  // ---------- magnetic buttons ----------
  function bindMagnetic(root) {
    root.querySelectorAll(".magnetic").forEach((el) => {
      if (el.dataset.fxMag) return;
      el.dataset.fxMag = "1";
      const x = gsap.quickTo(el, "x", { duration: 0.6, ease: "power3" });
      const y = gsap.quickTo(el, "y", { duration: 0.6, ease: "power3" });
      el.addEventListener("pointermove", (e) => {
        const r = el.getBoundingClientRect();
        x((e.clientX - r.left - r.width / 2) * 0.3);
        y((e.clientY - r.top - r.height / 2) * 0.4);
      });
      el.addEventListener("pointerleave", () => { gsap.to(el, { x: 0, y: 0, duration: 0.9, ease: "elastic.out(1, 0.4)" }); });
    });
  }
  // the header is re-drawn when the owner's settings arrive; keep its buttons magnetic
  if (finePointer) new MutationObserver(() => bindMagnetic(header)).observe(header, { childList: true });

  // ---------- keep measurements right ----------
  document.addEventListener("langchange", () => {
    splits.forEach((_, el) => settle(el)); // plain text again before the language swap is measured
    setTimeout(() => ScrollTrigger.refresh(), 80);
  });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => ScrollTrigger.refresh());
  // sections with content-visibility: auto get their real height when first rendered
  let cvTimer;
  document.addEventListener("contentvisibilityautostatechange", () => {
    clearTimeout(cvTimer);
    cvTimer = setTimeout(() => ScrollTrigger.refresh(), 120);
  }, true);
  addEventListener("load", () => ScrollTrigger.refresh());

  // ---------- hero 3D: "touched cloth" shader, only where it will run smoothly ----------
  const heroImg = document.querySelector(".hero-media img");
  const capable = finePointer && innerWidth > 860 && (navigator.hardwareConcurrency || 4) >= 4 && (!navigator.deviceMemory || navigator.deviceMemory >= 4) && !(navigator.connection && navigator.connection.saveData);
  if (heroImg && capable) {
    const start = () => import(new URL("hero-gl.js", scriptBase).href)
      .then((m) => m.initHeroGL(heroMedia, heroImg, { scrollProgress: () => Math.min(1, scrollY() / (opener ? opener.offsetHeight : innerHeight)) }))
      .catch(() => {}); // the photo simply stays if WebGL is unavailable
    const idle = window.requestIdleCallback || ((fn) => setTimeout(fn, 600));
    if (document.readyState === "complete") idle(start); else addEventListener("load", () => idle(start));
  }

  if (location.hash) {
    const target = document.querySelector(location.hash);
    if (target) setTimeout(() => (lenis ? lenis.scrollTo(target, { offset: -90, immediate: true }) : target.scrollIntoView()), 60);
  }

  window.MayzaFX = { lenis, refresh: (root) => { reveal(root || document); ScrollTrigger.refresh(); } };

  // =================================================================
  // Lookbook: a 3D ring of photos. Drag, arrow buttons and arrow keys turn it;
  // with motion on, scrolling past it turns it a little too.
  function initLookbook(g) {
    const stage = document.querySelector(".lookbook-stage");
    if (!stage) return;
    const ringEl = stage.querySelector(".ring");
    const panels = [...ringEl.children];
    const n = panels.length;
    const step = 360 / n;
    let angle = 0, velocity = 0, target = null, dragging = false, hovering = false, lastX = 0, radius = 0, scrollTurn = 0;

    const layout = () => {
      const w = panels[0].offsetWidth;
      radius = Math.round(w / 2 / Math.tan(Math.PI / n)) + 30;
      panels.forEach((p, i) => (p.style.transform = `rotateY(${i * step}deg) translateZ(${radius}px)`));
      paint();
    };
    const paint = () => {
      const a = angle + scrollTurn;
      ringEl.style.transform = `translateZ(${-radius}px) rotateY(${a}deg)`;
      panels.forEach((p, i) => {
        const rel = ((i * step + a) % 360 + 540) % 360 - 180;
        const facing = Math.cos((rel * Math.PI) / 180);
        p.style.opacity = facing < -0.15 ? 0 : 0.3 + 0.7 * Math.max(facing, 0);
        p.style.filter = `brightness(${0.45 + 0.55 * Math.max(facing, 0)})`;
      });
    };
    const frame = () => {
      if (target !== null) {
        const diff = target - angle;
        angle += diff * 0.09;
        if (Math.abs(diff) < 0.05) { angle = target; target = null; }
      } else if (!dragging) {
        angle += velocity;
        velocity *= 0.94;
        if (g && !hovering && Math.abs(velocity) < 0.02) angle -= 0.05; // slow idle drift
      }
      paint();
      requestAnimationFrame(frame);
    };
    stage.addEventListener("pointerdown", (e) => { dragging = true; target = null; lastX = e.clientX; stage.setPointerCapture(e.pointerId); stage.classList.add("dragging"); });
    stage.addEventListener("pointermove", (e) => { if (!dragging) return; velocity = (e.clientX - lastX) * 0.28; lastX = e.clientX; angle += velocity; });
    const release = () => { dragging = false; stage.classList.remove("dragging"); };
    stage.addEventListener("pointerup", release);
    stage.addEventListener("pointercancel", release);
    stage.addEventListener("pointerenter", () => (hovering = true));
    stage.addEventListener("pointerleave", () => (hovering = false));
    const turn = (dir) => { const base = target !== null ? target : Math.round(angle / step) * step; target = base + dir * step; velocity = 0; };
    document.getElementById("look-prev").addEventListener("click", () => turn(1));
    document.getElementById("look-next").addEventListener("click", () => turn(-1));
    stage.addEventListener("keydown", (e) => { if (e.key === "ArrowLeft") turn(1); if (e.key === "ArrowRight") turn(-1); });
    addEventListener("resize", layout);
    layout();
    requestAnimationFrame(frame);
    if (g) {
      window.ScrollTrigger.create({
        trigger: stage, start: "top bottom", end: "bottom top", scrub: true,
        onUpdate: (self) => { scrollTurn = -self.progress * 120; },
      });
    }
  }
})();
