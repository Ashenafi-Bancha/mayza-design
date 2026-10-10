// Motion layer: scroll reveals, pointer tilt, number count-up and the 3D lookbook.
// Everything here is decoration; the pages read fine without it.
(() => {
  const calm = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const finePointer = matchMedia("(hover: hover) and (pointer: fine)").matches;

  // header gains a shadow once the page is scrolled
  const header = document.getElementById("site-header");
  const onScroll = () => header.classList.toggle("scrolled", scrollY > 8);
  addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  // ---------- scroll reveals ----------
  if (!calm && "IntersectionObserver" in window) {
    const targets = document.querySelectorAll(
      ".section-head, .tile, .split > *, .steps li, .figures div, .gallery .shot, .contact-list li, .tiles > .stack, .cta .wrap > *, form.sheet, .preview, .lookbook-stage"
    );
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (!e.isIntersecting) return;
          e.target.classList.add("in");
          io.unobserve(e.target);
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -6% 0px" }
    );
    targets.forEach((el) => {
      const i = [...el.parentElement.children].indexOf(el);
      el.style.setProperty("--d", `${Math.min(i, 5) * 90}ms`);
      el.classList.add("reveal");
      io.observe(el);
    });
  }

  // ---------- count-up for the follower figures ----------
  const figures = document.querySelectorAll(".figures strong");
  if (!calm && figures.length && "IntersectionObserver" in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        io.unobserve(e.target);
        const m = e.target.textContent.match(/^([\d.]+)(.*)$/);
        if (!m) return;
        const end = parseFloat(m[1]);
        const dec = (m[1].split(".")[1] || "").length;
        const t0 = performance.now();
        const tick = (t) => {
          const p = Math.min((t - t0) / 1400, 1);
          const eased = 1 - Math.pow(1 - p, 3);
          e.target.textContent = (end * eased).toFixed(dec) + m[2];
          if (p < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      });
    }, { threshold: 0.6 });
    figures.forEach((f) => io.observe(f));
  }

  // ---------- pointer tilt on photos ----------
  if (!calm && finePointer) {
    document.querySelectorAll(".hero .shot, .tile .shot, .shots .shot").forEach((el) => {
      el.classList.add("tilt");
      el.addEventListener("pointermove", (ev) => {
        const r = el.getBoundingClientRect();
        const x = (ev.clientX - r.left) / r.width - 0.5;
        const y = (ev.clientY - r.top) / r.height - 0.5;
        el.style.setProperty("--ry", `${x * 12}deg`);
        el.style.setProperty("--rx", `${-y * 10}deg`);
        el.style.setProperty("--px", `${-x * 14}px`);
        el.style.setProperty("--py", `${-y * 14}px`);
        el.style.setProperty("--gx", `${(x + 0.5) * 100}%`);
        el.style.setProperty("--gy", `${(y + 0.5) * 100}%`);
      });
      el.addEventListener("pointerleave", () => {
        ["--rx", "--ry", "--px", "--py"].forEach((p) => el.style.removeProperty(p));
      });
    });
  }

  // ---------- 3D lookbook ring ----------
  const stage = document.querySelector(".lookbook-stage");
  if (stage) {
    const ring = stage.querySelector(".ring");
    const panels = [...ring.children];
    const n = panels.length;
    const step = 360 / n;
    let angle = 0;
    let velocity = 0;
    let target = null; // set when a button asks for a specific panel
    let dragging = false;
    let hovering = false;
    let lastX = 0;
    let radius = 0;

    const layout = () => {
      const w = panels[0].offsetWidth;
      radius = Math.round(w / 2 / Math.tan(Math.PI / n)) + 28;
      panels.forEach((p, i) => {
        p.style.transform = `rotateY(${i * step}deg) translateZ(${radius}px)`;
      });
      paint();
    };

    const paint = () => {
      ring.style.transform = `translateZ(${-radius}px) rotateY(${angle}deg)`;
      // panels dim as they turn away from the viewer
      panels.forEach((p, i) => {
        let a = ((i * step + angle) % 360 + 540) % 360 - 180;
        const facing = Math.cos((a * Math.PI) / 180);
        p.style.opacity = facing < -0.15 ? 0 : 0.35 + 0.65 * Math.max(facing, 0);
        p.style.filter = `brightness(${0.55 + 0.45 * Math.max(facing, 0)})`;
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
        if (!calm && !hovering && Math.abs(velocity) < 0.02) angle -= 0.07; // idle drift
      }
      paint();
      requestAnimationFrame(frame);
    };

    stage.addEventListener("pointerdown", (ev) => {
      if (ev.target.closest("button")) return;
      dragging = true;
      target = null;
      lastX = ev.clientX;
      stage.setPointerCapture(ev.pointerId);
      stage.classList.add("dragging");
    });
    stage.addEventListener("pointermove", (ev) => {
      if (!dragging) return;
      const dx = ev.clientX - lastX;
      lastX = ev.clientX;
      velocity = dx * 0.28;
      angle += velocity;
    });
    const release = () => { dragging = false; stage.classList.remove("dragging"); };
    stage.addEventListener("pointerup", release);
    stage.addEventListener("pointercancel", release);
    stage.addEventListener("pointerenter", () => (hovering = true));
    stage.addEventListener("pointerleave", () => (hovering = false));

    const turn = (dir) => {
      const base = target !== null ? target : Math.round(angle / step) * step;
      target = base + dir * step;
      velocity = 0;
    };
    document.getElementById("look-prev").addEventListener("click", () => turn(1));
    document.getElementById("look-next").addEventListener("click", () => turn(-1));
    stage.addEventListener("keydown", (ev) => {
      if (ev.key === "ArrowLeft") turn(1);
      if (ev.key === "ArrowRight") turn(-1);
    });

    addEventListener("resize", layout);
    layout();
    requestAnimationFrame(frame);
  }
})();
