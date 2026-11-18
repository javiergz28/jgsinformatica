/* DEV-003 | CORE-01 real Cycles asset sequence, transparent backgrounds and scroll choreography.
   Narrative camera views are real Blender renders. Browser cross-fades are not a continuous 3D scene.
   Contact links and fallback poster remain usable without scripts or motion support. */
(() => {
  const sequence = document.querySelector("[data-boot-sequence]");
  const art = document.querySelector("[data-core-art]");
  const label = document.querySelector("[data-boot-label]");
  const meter = document.querySelector("[data-boot-meter-label]");
  if (!sequence || !art || !label || !meter) return;

  const stages = Object.fromEntries(["charging", "powered", "button", "glass", "interior"].map(
    name => [name, art.querySelector('[data-boot-frame="' + name + '"]')]
  ));
  if (Object.values(stages).some(image => !image)) return;
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const saveData = navigator.connection?.saveData === true;
  const clamp01 = n => Math.max(0, Math.min(1, n));
  const smooth = (from, to, n) => {
    const t = clamp01((n - from) / (to - from));
    return t * t * (3 - 2 * t);
  };

  const hardware = document.getElementById("servicios");
  if (sequence.dataset.cameraPose === hardware?.dataset.cameraPose) {
    art.dataset.handoffPose = hardware.dataset.cameraPose;
    art.dataset.handoffPart = hardware.dataset.focusPart;
  }

  if (reducedMotion.matches || saveData || !window.requestAnimationFrame) {
    label.textContent = "STATIC / ACCESSIBLE";
    meter.textContent = "SIN ANIMACIÓN";
    sequence.dataset.bootPhase = "static";
    return;
  }

  const failedStages = new Set();
  Object.entries(stages).forEach(([name, image]) => image.addEventListener("error", () => {
    failedStages.add(name);
    previousProgress = -1;
    if (name === "charging" || name === "powered") {
      art.dataset.bootFallback = "static";
      label.textContent = "STATIC / READY";
    }
    requestRender();
  }));

  let pending = false;
  let previousProgress = -1;
  const setValue = (name, amount) =>
    sequence.style.setProperty(name, amount.toFixed(4));
  const render = () => {
    pending = false;
    const box = sequence.getBoundingClientRect();
    const distance = Math.max(1, box.height - window.innerHeight);
    const progress = clamp01(-box.top / distance);
    if (Math.abs(progress - previousProgress) < 0.0005) return;
    previousProgress = progress;

    const hasWide = !failedStages.has("powered");
    const charge = failedStages.has("charging") ? 0 :
      smooth(0.14, 0.47, progress) * (1 - smooth(0.51, 0.70, progress));
    const powered = hasWide ? smooth(0.51, 0.70, progress) : 0;
    const button = failedStages.has("button") ? 0 : smooth(0.72, 0.765, progress) *
      (1 - smooth(0.795, 0.835, progress));
    const glass = failedStages.has("glass") ? 0 : smooth(0.795, 0.835, progress) *
      (1 - (failedStages.has("interior") ? 0 : smooth(0.895, 0.94, progress)));
    const interior = failedStages.has("interior") ? 0 : smooth(0.895, 0.94, progress);

    setValue("--boot-wide-opacity", hasWide ? 1 - smooth(0.72, 0.765, progress) : 1);
    setValue("--boot-charging", charge);
    setValue("--boot-powered", powered);
    setValue("--boot-button", button);
    setValue("--boot-glass", glass);
    setValue("--boot-interior", interior);
    setValue("--boot-zoom", 1 + 0.07 * smooth(0.08, 0.48, progress) +
      0.13 * smooth(0.66, 0.83, progress) + 0.15 * smooth(0.83, 0.99, progress));
    setValue("--boot-shift-x", smooth(0.72, 0.97, progress));
    setValue("--boot-shift-y", smooth(0.72, 0.97, progress));
    setValue("--boot-copy-opacity", 1 - smooth(0.65, 0.76, progress));
    setValue("--boot-meta-opacity", 1 - smooth(0.70, 0.79, progress));
    const energy = smooth(0.13, 0.72, progress);
    setValue("--boot-charge", energy);

    let phase, caption;
    if (progress < 0.14) {
      phase = "standby";
      caption = "STANDBY / 00";
    } else if (progress < 0.70) {
      phase = "charging";
      caption = "BOOTING / 01";
    } else if (progress < 0.80) {
      phase = "power";
      caption = "POWER / 02";
    } else if (progress < 0.91) {
      phase = "glass";
      caption = "GLASS / 03";
    } else {
      phase = "interior";
      caption = "HARDWARE / 04";
    }
    sequence.dataset.bootPhase = phase;
    label.textContent = caption;
    meter.textContent = progress < 0.72
      ? "ENERGÍA / " + Math.round(energy * 100) + "%"
      : progress < 0.80 ? "ACERCANDO / BOTÓN"
      : progress < 0.91 ? "RUTA / VIDRIO"
      : "INTERIOR / PLACA";
    art.dataset.bootProgress = progress.toFixed(3);
  };
  function requestRender() {
    if (pending) return;
    pending = true;
    window.requestAnimationFrame(render);
  }
  render();
  window.addEventListener("scroll", requestRender, { passive: true });
  window.addEventListener("resize", requestRender, { passive: true });
})();
