// Hero 3D: "touched cloth".
// The hero photo is drawn by WebGL as a piece of fabric: slow folds drift across
// it, a ripple follows the cursor like a hand brushing the cloth, and light
// catches the folds with a faint champagne sheen taken from the woven band.
// Loaded on demand by experience.js, only on capable desktops. If anything
// fails, the regular <img> stays visible underneath.
import * as THREE from "./vendor/three.module.min.js";

const vertex = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

const fragment = /* glsl */ `
  precision highp float;
  uniform sampler2D uTex;
  uniform vec2 uRes;       // canvas size in pixels
  uniform vec2 uImg;       // photo size in pixels
  uniform vec2 uMouse;     // cursor in uv space
  uniform float uTouch;    // how strongly the cursor is moving (0..1)
  uniform float uTime;
  uniform float uScroll;   // 0 at the top of the page, 1 once the hero has scrolled away
  varying vec2 vUv;

  // cover-fit the photo inside the canvas, framed slightly above centre like the CSS (center 14%)
  vec2 coverUv(vec2 uv) {
    float rc = uRes.x / uRes.y, ri = uImg.x / uImg.y;
    vec2 scale = rc > ri ? vec2(1.0, ri / rc) : vec2(rc / ri, 1.0);
    vec2 offset = vec2((1.0 - scale.x) * 0.5, (1.0 - scale.y) * 0.86);
    return uv * scale + offset;
  }

  // height of the cloth at a point: slow folds plus the ripple under the cursor
  float cloth(vec2 p) {
    float t = uTime * 0.35;
    float h = sin(p.x * 5.0 + t * 1.3 + sin(p.y * 3.0 + t) * 0.8) * 0.5;
    h += sin(p.y * 7.0 - t * 0.9 + p.x * 2.0) * 0.28;
    h += sin((p.x + p.y) * 11.0 + t * 1.7) * 0.08;
    h *= 0.35 + uScroll * 0.9;
    vec2 m = vec2((p.x - uMouse.x) * (uRes.x / uRes.y), p.y - uMouse.y);
    float d = length(m);
    h += sin(d * 34.0 - uTime * 5.0) * exp(-d * 6.5) * (0.35 + uTouch * 1.6);
    return h;
  }

  void main() {
    vec2 uv = vUv;
    float e = 0.0025;
    float h = cloth(uv);
    vec2 grad = vec2(cloth(uv + vec2(e, 0.0)) - h, cloth(uv + vec2(0.0, e)) - h) / e;
    vec3 n = normalize(vec3(-grad * 0.012, 1.0));

    // folds bend the photo slightly, like fabric pulling the print
    vec2 duv = uv + n.xy * 0.018;
    duv = (duv - 0.5) * (1.0 - uScroll * 0.06) + 0.5;
    vec3 color = texture2D(uTex, coverUv(clamp(duv, 0.0, 1.0))).rgb;

    // studio light from the upper left: shadows in the folds, a champagne sheen on the ridges
    vec3 light = normalize(vec3(-0.45, 0.6, 0.9));
    float diffuse = dot(n, light);
    float sheen = pow(max(dot(reflect(-light, n), vec3(0.0, 0.0, 1.0)), 0.0), 18.0);
    color *= 0.86 + diffuse * 0.2;
    color += vec3(0.79, 0.66, 0.42) * sheen * 0.22;

    // gentle vignette so the edges fall into the black page
    float v = smoothstep(1.15, 0.35, length((uv - vec2(0.55, 0.5)) * vec2(1.1, 0.9)));
    color *= mix(0.55, 1.0, v);
    gl_FragColor = vec4(color, 1.0);
  }
`;

export function initHeroGL(container, img, { scrollProgress = () => 0 } = {}) {
  const renderer = new THREE.WebGLRenderer({ antialias: false, alpha: false, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.6));
  renderer.setClearColor(0x0e0b0a, 1);
  const canvas = renderer.domElement;
  canvas.setAttribute("aria-hidden", "true");
  container.appendChild(canvas);

  const scene = new THREE.Scene();
  const camera = new THREE.Camera();
  const uniforms = {
    uTex: { value: null },
    uRes: { value: new THREE.Vector2(1, 1) },
    uImg: { value: new THREE.Vector2(img.naturalWidth || 1536, img.naturalHeight || 2048) },
    uMouse: { value: new THREE.Vector2(0.6, 0.45) },
    uTouch: { value: 0 },
    uTime: { value: 0 },
    uScroll: { value: 0 },
  };
  const material = new THREE.ShaderMaterial({ vertexShader: vertex, fragmentShader: fragment, uniforms });
  scene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material));

  // load whichever photo the browser picked (AVIF/WebP/JPG), or the one set in Admin > Website
  const loadTexture = () => {
    const src = img.currentSrc || img.src;
    new THREE.TextureLoader().load(src, (tex) => {
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.minFilter = THREE.LinearFilter;
      tex.generateMipmaps = false;
      if (uniforms.uTex.value) uniforms.uTex.value.dispose();
      uniforms.uTex.value = tex;
      uniforms.uImg.value.set(tex.image.width, tex.image.height);
      container.classList.add("gl-ready");
    });
  };
  if (img.complete && img.naturalWidth) loadTexture(); else img.addEventListener("load", loadTexture, { once: true });
  new MutationObserver(loadTexture).observe(img, { attributes: true, attributeFilter: ["src"] });

  const resize = () => {
    const r = container.getBoundingClientRect();
    renderer.setSize(r.width, r.height, false);
    canvas.style.width = "100%";
    canvas.style.height = "100%";
    uniforms.uRes.value.set(r.width, r.height);
  };
  new ResizeObserver(resize).observe(container);
  resize();

  // cursor: eased position, and a "touch" amount that rises with movement and settles back
  const mouse = { x: 0.6, y: 0.45, tx: 0.6, ty: 0.45, touch: 0 };
  window.addEventListener("pointermove", (e) => {
    const r = container.getBoundingClientRect();
    const nx = (e.clientX - r.left) / r.width;
    const ny = 1 - (e.clientY - r.top) / r.height;
    const moved = Math.hypot(nx - mouse.tx, ny - mouse.ty);
    mouse.tx = nx; mouse.ty = ny;
    mouse.touch = Math.min(1, mouse.touch + moved * 6);
  }, { passive: true });

  // draw only while the hero is on screen and the tab is visible
  let visible = true, running = false, last = performance.now();
  new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; if (visible) loop(); }, { threshold: 0 }).observe(container);
  document.addEventListener("visibilitychange", () => { if (!document.hidden) loop(); });

  function tick(now) {
    running = false;
    if (!visible || document.hidden) return;
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    mouse.x += (mouse.tx - mouse.x) * 0.08;
    mouse.y += (mouse.ty - mouse.y) * 0.08;
    mouse.touch *= 0.95;
    uniforms.uMouse.value.set(mouse.x, mouse.y);
    uniforms.uTouch.value = mouse.touch;
    uniforms.uTime.value += dt;
    uniforms.uScroll.value = scrollProgress();
    if (uniforms.uTex.value) renderer.render(scene, camera);
    loop();
  }
  function loop() {
    if (running) return;
    running = true;
    last = performance.now();
    requestAnimationFrame(tick);
  }
  loop();
}
