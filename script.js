/* CORE-01 DEV: three REAL Blender Cycles frames from one master and camera.
   Visual sequence only: this is not yet interactive 3D or a camera through the glass.
   HTML picture and SVG fallback work without JS, on Save-Data and reduced motion. */
(() => {
  const sequence = document.querySelector("[data-boot-sequence]");
  const art = document.querySelector("[data-core-art]");
  const label = document.querySelector("[data-boot-label]");
  const charging = art?.querySelector('[data-boot-frame="charging"]');
  const powered = art?.querySelector('[data-boot-frame="powered"]');
  if (!sequence || !art || !label || !charging || !powered) return;

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const saveData = navigator.connection?.saveData === true;
  const clamp01 = (value) => Math.max(0, Math.min(1, value));
  const smooth = (from, to, value) => {
    const t = clamp01((value - from) / (to - from));
    return t * t * (3 - 2 * t);
  };

  const hardware = document.getElementById("servicios");
  const pose = sequence.dataset.cameraPose;
  if (pose && pose === hardware?.dataset.cameraPose) {
    art.dataset.handoffPose = pose;
    art.dataset.handoffPart = hardware.dataset.focusPart || "";
  }

  if (reducedMotion.matches || saveData || !window.requestAnimationFrame) {
    label.textContent = "STATIC / ACCESSIBLE";
    return;
  }
  let failed = false;
  const staticFallback = () => {
    failed = true;
    art.dataset.bootFallback = "static";
    art.style.setProperty("--boot-charging", "0");
    art.style.setProperty("--boot-powered", "0");
    label.textContent = "STATIC / READY";
  };
  charging.addEventListener("error", staticFallback);
  powered.addEventListener("error", staticFallback);

  let frameRequested = false;
  let lastProgress = -1;
  const render = () => {
    frameRequested = false;
    if (failed) return;
    const bounds = sequence.getBoundingClientRect();
    const pinned = window.matchMedia("(min-width: 1001px)").matches;
    const travel = pinned
      ? Math.max(1, bounds.height - window.innerHeight)
      : Math.max(1, bounds.height - window.innerHeight * 0.52);
    const progress = clamp01(-bounds.top / travel);
    if (Math.abs(progress - lastProgress) < 0.001) return;
    lastProgress = progress;
    const chargingAmount = smooth(0.12, 0.52, progress) * (1 - smooth(0.52, 0.86, progress));
    const poweredAmount = smooth(0.52, 0.9, progress);
    art.style.setProperty("--boot-charging", chargingAmount.toFixed(4));
    art.style.setProperty("--boot-powered", poweredAmount.toFixed(4));
    art.dataset.bootProgress = progress.toFixed(3);
    label.textContent = progress < 0.15 ? "STANDBY / 00"
      : progress < 0.85 ? "BOOTING / 01" : "READY / 02";
  };
  const requestRender = () => {
    if (frameRequested) return;
    frameRequested = true;
    requestAnimationFrame(render);
  };
  render();
  window.addEventListener("scroll", requestRender, { passive: true });
  window.addEventListener("resize", requestRender, { passive: true });
})();
