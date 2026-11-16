/* BOOT prototype: a single SVG source, progressively enhanced without scroll hijacking.
   Links and the static poster remain usable when JS, SVG fetch or animation fails. */
(() => {
  const sequence = document.querySelector("[data-boot-sequence]");
  const art = document.querySelector("[data-core-art]");
  const label = document.querySelector("[data-boot-label]");
  if (!sequence || !art || !label) return;

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const saveData = navigator.connection?.saveData === true;
  if (reducedMotion.matches || saveData || !window.fetch || !window.requestAnimationFrame) {
    label.textContent = "STATIC / ACCESSIBLE";
    return;
  }

  const clamp01 = (value) => Math.max(0, Math.min(1, value));
  const smooth = (from, to, value) => {
    const t = clamp01((value - from) / (to - from));
    return t * t * (3 - 2 * t);
  };

  let vector;
  let light;
  let gpu;
  let cooling;
  let fan;
  let frameRequested = false;
  let lastProgress = -1;

  const render = () => {
    frameRequested = false;
    if (!vector) return;

    const bounds = sequence.getBoundingClientRect();
    const pinned = window.matchMedia("(min-width: 1001px)").matches;
    const travel = pinned
      ? Math.max(1, bounds.height - window.innerHeight)
      : Math.max(1, bounds.height - window.innerHeight * 0.52);
    const progress = clamp01(-bounds.top / travel);
    if (Math.abs(progress - lastProgress) < 0.001) return;
    lastProgress = progress;

    const led = smooth(0.08, 0.42, progress);
    const fanPower = smooth(0.24, 0.71, progress);
    const gpuPower = smooth(0.43, 0.83, progress);
    light.style.opacity = String(0.08 + led * 0.92);
    cooling.style.opacity = String(fanPower * 0.65);
    gpu.style.opacity = String(0.04 + gpuPower * 0.96);
    fan.style.opacity = String(0.4 + fanPower * 0.6);
    fan.setAttribute("transform", `rotate(${(progress * 370).toFixed(2)} 562 289)`);

    // Optical framing only. This is not yet a physically modelled 3D camera.
    const framing = smooth(0.55, 1, progress);
    art.style.transform = `translate3d(${(-10 * framing).toFixed(2)}px, 0, 0) scale(${(1 + 0.035 * framing).toFixed(4)})`;
    art.dataset.bootProgress = progress.toFixed(3);
    label.textContent = progress < 0.12 ? "STANDBY / 00" : progress < 0.82 ? "BOOTING / 01" : "READY / 02";
  };

  const requestRender = () => {
    if (frameRequested) return;
    frameRequested = true;
    requestAnimationFrame(render);
  };

  // The original <img> is the LCP poster and a permanent static fallback.
  // Enhance it with the *same* source, never with generated inconsistent frames.
  fetch("./assets/core-01.svg", { cache: "force-cache" })
    .then((response) => {
      if (!response.ok) throw new Error("CORE-01 could not load");
      return response.text();
    })
    .then((source) => {
      const documentSvg = new DOMParser().parseFromString(source, "image/svg+xml");
      if (documentSvg.querySelector("parsererror")) throw new Error("CORE-01 SVG invalid");
      const next = document.importNode(documentSvg.documentElement, true);
      light = next.querySelector('[data-boot="power-light"]');
      gpu = next.querySelector('[data-boot="gpu-light"]');
      cooling = next.querySelector('[data-boot="cooler-light"]');
      fan = next.querySelector('[data-boot="fan"]');
      if (![light, gpu, cooling, fan].every(Boolean)) throw new Error("CORE-01 parts missing");

      // The same physical geometry and camera pose will feed HARDWARE.
      // This is a verifiable handoff contract, not a completed 3D camera transition.
      const hardware = document.getElementById("servicios");
      const pose = next.getAttribute("data-camera-pose");
      const focusPart = hardware?.dataset.focusPart;
      const focus = Array.from(next.querySelectorAll("[data-part]"))
        .find((part) => part.getAttribute("data-part") === focusPart);
      const focusX = Number(focus?.getAttribute("data-focus-x"));
      const focusY = Number(focus?.getAttribute("data-focus-y"));
      if (pose !== sequence.dataset.cameraPose || pose !== hardware?.dataset.cameraPose ||
          !focus || !Number.isFinite(focusX) || !Number.isFinite(focusY)) {
        throw new Error("CORE-01 camera or geometry handoff contract mismatch");
      }
      art.dataset.handoffPose = pose;
      art.dataset.handoffPart = focusPart;
      art.dataset.handoffX = String(focusX);
      art.dataset.handoffY = String(focusY);
      next.classList.add("core-vector");
      next.setAttribute("aria-hidden", "true");
      next.setAttribute("focusable", "false");
      vector = next;
      art.append(next);
      render();
      art.classList.add("is-enhanced");
      window.addEventListener("scroll", requestRender, { passive: true });
      window.addEventListener("resize", requestRender, { passive: true });
    })
    .catch(() => {
      // Preserve visible poster and real HTML navigation on any enhancement failure.
      art.dataset.bootFallback = "static";
      label.textContent = "STATIC / READY";
    });
})();
