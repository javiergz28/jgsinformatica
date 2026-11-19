/* CORE-01 DEV-004 | Continuously moving Blender camera, 56 real Cycles frames.
 * Scroll position selects real camera geometry, rather than dissolving unrelated shots.
 * Frames load progressively; the first static WebP is usable without JavaScript.
 * No continuous browser 3D/WebGL is claimed. */
(() => {
  const sequence = document.querySelector("[data-boot-sequence]");
  const art = document.querySelector("[data-core-art]");
  const label = document.querySelector("[data-boot-label]");
  const meter = document.querySelector("[data-boot-meter-label]");
  const canvas = art?.querySelector("[data-cinematic-canvas]");
  const charging = art?.querySelector('[data-boot-frame="charging"]');
  const powered = art?.querySelector('[data-boot-frame="powered"]');
  if (!sequence || !art || !label || !meter || !canvas || !charging || !powered) return;

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const saveData = navigator.connection?.saveData === true;
  const slowConnection = /(^|-)2g$/.test(navigator.connection?.effectiveType ?? "");
  const clamp01 = n => Math.max(0, Math.min(1, n));
  const smooth = (from, to, n) => {
    const t = clamp01((n - from) / (to - from));
    return t * t * (3 - 2 * t);
  };
  const set = (key, value) => sequence.style.setProperty(key, value.toFixed(4));

  const hardware = document.getElementById("servicios");
  if (sequence.dataset.cameraPose === hardware?.dataset.cameraPose) {
    art.dataset.handoffPose = hardware.dataset.cameraPose;
    art.dataset.handoffPart = hardware.dataset.focusPart || "motherboard";
  }

  if (reducedMotion.matches || saveData || slowConnection || !window.requestAnimationFrame) {
    sequence.dataset.bootPhase = "static";
    label.textContent = "STATIC / ACCESSIBLE";
    meter.textContent = "SIN ANIMACIÓN";
    return;
  }

  const ctx = canvas.getContext("2d", { alpha: true, desynchronized: true });
  if (!ctx) {
    sequence.dataset.bootPhase = "static";
    label.textContent = "STATIC / CANVAS FALLBACK";
    return;
  }

  const TOTAL = Number(canvas.dataset.frameCount);
  if (TOTAL !== 56) {
    sequence.dataset.bootPhase = "static";
    label.textContent = "STATIC / FRAME CONFIG";
    return;
  }
  document.body.classList.add("has-motion-sequence");
  const PATH = "./assets/boot/sequence/core01-";
  const cached = new Map();
  const failed = new Set();
  const queued = new Set();
  const queue = [];
  const MAX_PARALLEL = 5;
  const MAX_DECODED = 36;
  let inFlight = 0;
  let desired = 0;
  let lastDrawn = -1;
  let warmed = false;
  let waitingFrame = false;
  let framePending = false;
  let poweredFailed = false;
  let chargingFailed = false;

  const frameURL = i => PATH + String(i).padStart(3, "0") + ".webp";

  function enqueue(index, urgent = false) {
    if (index < 0 || index >= TOTAL ||
      cached.has(index) || queued.has(index) || failed.has(index)) return;
    queued.add(index);
    if (urgent) queue.unshift(index);
    else queue.push(index);
    pump();
  }

  function trimCache() {
    if (cached.size <= MAX_DECODED) return;
    const distant = [...cached.keys()]
      .sort((a, b) => Math.abs(b - desired) - Math.abs(a - desired));
    for (const index of distant.slice(0, cached.size - MAX_DECODED)) cached.delete(index);
  }

  function pump() {
    while (inFlight < MAX_PARALLEL && queue.length) {
      const index = queue.shift();
      inFlight += 1;
      const img = new Image();
      img.decoding = "async";
      img.onload = () => {
        inFlight -= 1;
        queued.delete(index);
        cached.set(index, img);
        trimCache();
        waitingFrame = false;
        requestRender();
        pump();
      };
      img.onerror = () => {
        inFlight -= 1;
        queued.delete(index);
        failed.add(index);
        waitingFrame = false;
        requestRender();
        pump();
      };
      img.src = frameURL(index);
    }
  }

  function preload() {
    if (warmed) return;
    warmed = true;
    // Warm only the opening camera frames; don't fetch the entire film at 30% scroll.
    for (let i = 0; i < 8; i += 1) enqueue(i);
  }

  function draw() {
    let chosen = cached.get(desired) ? desired : -1;
    if (chosen < 0) {
      for (let distance = 1; distance <= 3 && chosen < 0; distance++) {
        if (cached.has(desired - distance)) chosen = desired - distance;
        else if (cached.has(desired + distance)) chosen = desired + distance;
      }
    }
    if (chosen < 0) return false;
    if (chosen !== lastDrawn) {
      const img = cached.get(chosen);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      lastDrawn = chosen;
      canvas.dataset.currentFrame = String(chosen);
    }
    return true;
  }

  charging.addEventListener("error", () => {
    chargingFailed = true;
    requestRender();
  });
  powered.addEventListener("error", () => {
    poweredFailed = true;
    requestRender();
  });

  function render() {
    framePending = false;
    const box = sequence.getBoundingClientRect();
    const scrollTravel = Math.max(1, box.height - window.innerHeight);
    const progress = clamp01(-box.top / scrollTravel);
    const cameraT = clamp01((progress - 0.50) / 0.50);

    if (progress >= 0.30) preload();
    desired = Math.round(cameraT * (TOTAL - 1));
    if (warmed) {
      // Queue in reverse priority: the requested frame is loaded first, then
      // upcoming frames and a short backwards buffer for reverse scroll.
      for (const offset of [-3, -2, -1, 8, 7, 6, 5, 4, 3, 2, 1, 0]) {
        enqueue(desired + offset, true);
      }
    }
    const drawn = progress >= 0.48 && draw();
    const fade = drawn && !poweredFailed ? smooth(0.49, 0.53, progress) : 0;

    const charge = chargingFailed ? 0 :
      smooth(0.10, 0.36, progress) * (1 - smooth(0.37, 0.49, progress));
    const power = poweredFailed ? 0 : smooth(0.37, 0.49, progress);
    set("--boot-wide-opacity", 1 - fade);
    set("--boot-charging", charge);
    set("--boot-powered", power);
    set("--boot-seq-opacity", fade);
    // The final interior image is fully opaque. Blend edge feathering in gradually
    // instead of abruptly cropping the exterior as the camera crosses the glass.
    const edgeBlend = smooth(0.54, 0.90, cameraT);
    for (const [key, start, end] of [
      ["--boot-mask-x", 70, 65], ["--boot-mask-y", 77, 65],
      ["--boot-mask-core", 68, 55], ["--boot-mask-edge", 100, 75]
    ]) {
      sequence.style.setProperty(key, (start + (end - start) * edgeBlend).toFixed(2) + "%");
    }
    set("--boot-copy-opacity", 1 - smooth(0.58, 0.77, progress));
    set("--boot-meta-opacity", 1 - smooth(0.64, 0.86, progress));
    set("--boot-shift-x", smooth(0.62, 0.85, progress));
    set("--boot-shift-y", smooth(0.70, 0.94, progress));
    const energy = smooth(0.10, 0.49, progress);
    set("--boot-charge", energy);

    let phase = "standby", caption = "STANDBY / 00";
    if (progress >= 0.10 && progress < 0.49) {
      phase = "charging";
      caption = "BOOTING / 01";
    } else if (progress >= 0.49 && progress < 0.57) {
      phase = "powered";
      caption = "READY / 02";
    } else if (progress >= 0.57 && cameraT < 0.57) {
      phase = "power";
      caption = "POWER BUTTON / 03";
    } else if (progress >= 0.57 && cameraT < 0.86) {
      phase = "glass";
      caption = "GLASS / 04";
    } else if (progress >= 0.57) {
      phase = "interior";
      caption = "HARDWARE / 05";
    }
    sequence.dataset.bootPhase = phase;
    art.dataset.bootProgress = progress.toFixed(3);
    art.dataset.cameraProgress = cameraT.toFixed(3);
    label.textContent = caption;
    meter.textContent = progress < 0.49
      ? "ENERGÍA / " + Math.round(energy * 100) + "%"
      : progress < 0.57 ? "CORE / READY"
      : cameraT < 0.57 ? "CÁMARA / BOTÓN"
      : cameraT < 0.86 ? "CÁMARA / VIDRIO"
      : "CÁMARA / PLACA";
  }

  function requestRender() {
    if (framePending) return;
    framePending = true;
    window.requestAnimationFrame(render);
  }

  render();
  window.addEventListener("scroll", requestRender, { passive: true });
  window.addEventListener("resize", requestRender, { passive: true });
})();
